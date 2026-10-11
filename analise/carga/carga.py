#!/usr/bin/env python3
"""Carga dos dados oficiais do TSE para o banco D1 da análise eleitoral.

Fonte única: Portal de Dados Abertos do TSE (cdn.tse.jus.br).
  - votacao_secao_<ANO>_<UF>.zip  (votos por seção, todos os cargos da UF)
  - votacao_secao_<ANO>_BR.zip    (Presidente, todas as UFs; filtramos a UF)
  - eleitorado_local_votacao_<ANO>.zip (seção -> local -> bairro, aptos, lat/lon)

Gera um arquivo SQL para `wrangler d1 execute --remote --file`.
Os votos ficam em blocos JSON (tabela `blob`) para caber no plano gratuito
(poucas linhas escritas): um bloco por candidato e um por zona/cargo.

Uso: carga.py --ano 2026 --turno 1 --uf CE --dir downloads --saida carga.sql
"""
import argparse, csv, io, json, os, sys, zipfile, datetime
from collections import defaultdict

CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"
PARTE = 40000  # caracteres por parte (fica bem abaixo do limite de 100 KB por comando no D1)

csv.field_size_limit(10**9)


def urls(ano, uf):
    return {
        "votos_uf": f"{CDN}/votacao_secao/votacao_secao_{ano}_{uf}.zip",
        "votos_br": f"{CDN}/votacao_secao/votacao_secao_{ano}_BR.zip",
        "locais": f"{CDN}/eleitorado_locais_votacao/eleitorado_local_votacao_{ano}.zip",
    }


def ler_csv(caminho_zip, nome_csv=None):
    """Lê o CSV de dentro do zip (Windows-1252, separado por ';')."""
    z = zipfile.ZipFile(caminho_zip)
    nomes = [n for n in z.namelist() if n.lower().endswith(".csv")]
    if nome_csv:
        nomes = [n for n in nomes if n.lower() == nome_csv.lower()]
    if not nomes:
        raise SystemExit(f"CSV não encontrado em {caminho_zip}: {nome_csv}")
    for nome in nomes:
        with z.open(nome) as f:
            texto = io.TextIOWrapper(f, encoding="cp1252", newline="")
            for linha in csv.DictReader(texto, delimiter=";"):
                yield linha


def num(s):
    try:
        return int(s)
    except (TypeError, ValueError):
        return None


def coord(s):
    try:
        v = float(str(s).replace(",", "."))
        return None if v in (0.0, -1.0) else round(v, 6)
    except (TypeError, ValueError):
        return None


def sql_txt(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ano", required=True)
    ap.add_argument("--turno", required=True)
    ap.add_argument("--uf", required=True)
    ap.add_argument("--dir", required=True, help="pasta com os zips baixados")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--sem-presidente", action="store_true")
    a = ap.parse_args()
    ano, turno, uf = a.ano, a.turno, a.uf.upper()
    u = urls(ano, uf)
    arq = {k: os.path.join(a.dir, os.path.basename(v)) for k, v in u.items()}

    # ---------- locais de votação ----------
    secoes = defaultdict(dict)   # (mun, zona) -> secao -> [nr_local, aptos, tipo, principal]
    locais = defaultdict(dict)   # (mun, zona) -> nr_local -> [nome, bairro, endereco, lat, lon]
    nomes_mun = {}
    for r in ler_csv(arq["locais"], f"eleitorado_local_votacao_{ano}_{uf}.csv"):
        if r.get("NR_TURNO") and r["NR_TURNO"] != turno:
            continue
        mun, zona, sec = r["CD_MUNICIPIO"], r["NR_ZONA"], r["NR_SECAO"]
        nomes_mun[mun] = r["NM_MUNICIPIO"]
        tipo = "A" if (r.get("DS_TIPO_SECAO_AGREGADA") or "").startswith("Agreg") else "P"
        principal = num(r.get("NR_SECAO_PRINCIPAL"))
        secoes[(mun, zona)][sec] = [num(r["NR_LOCAL_VOTACAO"]), num(r.get("QT_ELEITOR_SECAO")) or 0,
                                    tipo, principal if principal and principal > 0 else None]
        locais[(mun, zona)][r["NR_LOCAL_VOTACAO"]] = [
            r["NM_LOCAL_VOTACAO"], (r.get("NM_BAIRRO") or "").strip(), r.get("DS_ENDERECO"),
            coord(r.get("NR_LATITUDE")), coord(r.get("NR_LONGITUDE"))]

    # ---------- votos ----------
    por_zona = defaultdict(lambda: defaultdict(dict))        # (mun,zona,cargo) -> secao -> nr -> votos
    por_cand = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))  # (cargo,nr) -> mun -> zona -> secao -> votos
    cands = {}  # (cargo, nr) -> dict
    cargos = {}
    geracao = None
    fontes = [("votos_uf", f"votacao_secao_{ano}_{uf}.csv", None)]
    if not a.sem_presidente and os.path.exists(arq["votos_br"]):
        fontes.append(("votos_br", None, uf))
    linhas = 0
    for chave, nome_csv, filtro_uf in fontes:
        for r in ler_csv(arq[chave], nome_csv):
            if r["NR_TURNO"] != turno:
                continue
            if filtro_uf and r["SG_UF"] != filtro_uf:
                continue
            if r["SG_UF"] != uf:
                continue
            linhas += 1
            geracao = geracao or f'{r["DT_GERACAO"]} {r["HH_GERACAO"]}'
            mun, zona, sec = r["CD_MUNICIPIO"], r["NR_ZONA"], r["NR_SECAO"]
            nomes_mun.setdefault(mun, r["NM_MUNICIPIO"])
            cargo, nr, v = r["CD_CARGO"], r["NR_VOTAVEL"], int(r["QT_VOTOS"])
            cargos[cargo] = r["DS_CARGO"]
            por_zona[(mun, zona, cargo)][sec][nr] = por_zona[(mun, zona, cargo)][sec].get(nr, 0) + v
            pc = por_cand[(cargo, nr)][mun][zona]
            pc[sec] = pc.get(sec, 0) + v
            c = cands.setdefault((cargo, nr), {"nome": r["NM_VOTAVEL"], "sq": r.get("SQ_CANDIDATO"), "total": 0})
            c["total"] += v

    if not linhas:
        raise SystemExit("Nenhuma linha de voto encontrada para os filtros informados.")

    # ---------- SQL ----------
    pref_t = f"{ano}/{turno}/{uf}"
    pref_l = f"{ano}/{turno}/{uf}/l"
    out = open(a.saida, "w", encoding="utf-8")
    w = out.write
    w(open(os.path.join(os.path.dirname(__file__), "schema.sql"), encoding="utf-8").read() + "\n")
    w(f"DELETE FROM blob WHERE chave LIKE {sql_txt(pref_t + '/%')};\n")
    w(f"DELETE FROM candidato WHERE ano={ano} AND turno={turno} AND uf={sql_txt(uf)};\n")
    w(f"DELETE FROM municipio WHERE ano={ano} AND turno={turno} AND uf={sql_txt(uf)};\n")

    n_blobs = 0

    def blob(chave, obj):
        nonlocal n_blobs
        s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        for i in range(0, len(s), PARTE):
            w(f"INSERT INTO blob(chave,parte,dados) VALUES({sql_txt(chave)},{i // PARTE},{sql_txt(s[i:i + PARTE])});\n")
            n_blobs += 1

    zonas_mun = defaultdict(set)
    for (mun, zona) in secoes:
        zonas_mun[mun].add(zona)
    for (mun, zona, _c) in por_zona:
        zonas_mun[mun].add(zona)

    for mun, zonas in sorted(zonas_mun.items()):
        w(f"INSERT INTO municipio(ano,turno,uf,cd_mun,nome,zonas) VALUES({ano},{turno},{sql_txt(uf)},{int(mun)},"
          f"{sql_txt(nomes_mun.get(mun))},{sql_txt(','.join(sorted(zonas, key=int)))});\n")

    for (mun, zona), secs in secoes.items():
        blob(f"{pref_l}/{mun}/{zona}", {"secoes": secs, "locais": locais[(mun, zona)]})

    for (mun, zona, cargo), d in por_zona.items():
        blob(f"{pref_t}/z/{mun}/{zona}/{cargo}", d)

    for (cargo, nr), d in por_cand.items():
        c = cands[(cargo, nr)]
        w(f"INSERT INTO candidato(ano,turno,uf,cargo,ds_cargo,nr,sq,nome,total) VALUES({ano},{turno},{sql_txt(uf)},"
          f"{int(cargo)},{sql_txt(cargos[cargo])},{int(nr)},{sql_txt(c['sq'])},{sql_txt(c['nome'])},{c['total']});\n")
        blob(f"{pref_t}/c/{cargo}/{nr}", d)

    agora = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    info = {"ano": ano, "turno": turno, "uf": uf, "linhas_voto": linhas, "geracao_tse": geracao,
            "carregado_em": agora, "municipios": len(zonas_mun), "secoes_mapeadas": sum(len(s) for s in secoes.values()),
            "candidatos": len(cands), "partes": n_blobs, "fontes": [u["votos_uf"], u["locais"]] +
            ([u["votos_br"]] if len(fontes) > 1 else [])}
    w(f"INSERT OR REPLACE INTO meta(chave,valor) VALUES({sql_txt('carga/' + pref_t)},{sql_txt(json.dumps(info, ensure_ascii=False))});\n")
    out.close()
    print(json.dumps(info, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
