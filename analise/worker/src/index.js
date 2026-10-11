// API só de leitura da análise eleitoral (dados oficiais do TSE, carregados no D1).
// Não existe nenhuma rota de escrita: a carga é feita só pelo GitHub Actions, com token secreto.

const CABEC = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, max-age=300",
  "x-content-type-options": "nosniff",
};

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CABEC });
const erro = (msg, status = 400) => json({ erro: msg }, status);

const int = (v) => (/^\d{1,6}$/.test(v || "") ? Number(v) : null);
const uf = (v) => (/^[A-Z]{2}$/.test(v || "") ? v : null);
// chaves aceitas: ANO/TURNO/UF/(c/CARGO/NR | z/MUN/ZONA/CARGO | l/MUN/ZONA)
const CHAVE = /^\d{4}\/[12]\/[A-Z]{2}\/(c\/\d{1,4}\/\d{1,6}|z\/\d{1,6}\/\d{1,4}\/\d{1,4}|l\/\d{1,6}\/\d{1,4})$/;

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CABEC });
    if (req.method !== "GET") return erro("Somente leitura.", 405);
    const url = new URL(req.url);
    const p = url.searchParams;
    const db = env.DB;
    try {
      switch (url.pathname) {
        case "/api/status": {
          const { results } = await db.prepare("SELECT chave, valor FROM meta ORDER BY chave").all();
          return json(results.map((r) => ({ chave: r.chave, ...JSON.parse(r.valor) })));
        }
        case "/api/municipios": {
          const ano = int(p.get("ano")), turno = int(p.get("turno")), u = uf(p.get("uf"));
          if (!ano || !turno || !u) return erro("Informe ano, turno e uf.");
          const { results } = await db
            .prepare("SELECT cd_mun, nome, zonas FROM municipio WHERE ano=? AND turno=? AND uf=? ORDER BY nome")
            .bind(ano, turno, u).all();
          return json(results);
        }
        case "/api/candidatos": {
          const ano = int(p.get("ano")), turno = int(p.get("turno")), u = uf(p.get("uf")), cargo = int(p.get("cargo"));
          if (!ano || !turno || !u) return erro("Informe ano, turno e uf.");
          let sql = "SELECT cargo, ds_cargo, nr, sq, nome, total FROM candidato WHERE ano=? AND turno=? AND uf=?";
          const args = [ano, turno, u];
          if (cargo) { sql += " AND cargo=?"; args.push(cargo); }
          sql += " ORDER BY cargo, total DESC";
          const { results } = await db.prepare(sql).bind(...args).all();
          return json(results);
        }
        case "/api/bloco": {
          const k = p.get("k") || "";
          if (!CHAVE.test(k)) return erro("Chave inválida.");
          const { results } = await db.prepare("SELECT dados FROM blob WHERE chave=? ORDER BY parte").bind(k).all();
          if (!results.length) return erro("Não encontrado.", 404);
          return new Response(results.map((r) => r.dados).join(""), { headers: CABEC });
        }
        default:
          return erro("Rota desconhecida.", 404);
      }
    } catch (e) {
      return erro("Falha ao consultar o banco.", 500);
    }
  },
};
