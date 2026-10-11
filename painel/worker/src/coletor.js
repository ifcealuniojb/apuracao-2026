// Coletor único dos arquivos do TSE (Durable Object: existe uma só instância no mundo).
// Todos os navegadores leem daqui; o TSE é consultado no máximo uma vez a cada intervalo,
// não importa quantas pessoas estejam com o painel aberto.
const B = "https://resultados.tse.jus.br/oficial/ele2026/";
const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
// estados com 2º turno para governador (resultado oficial do 1º turno, conferido em 11/10/2026)
const GOV = ["AC", "AM", "DF", "ES", "RN", "TO"];
const ELE = { pres1: "6257", pres2: "6258", gov1: "6259", gov2: "6260" };

// intervalo mínimo entre duas consultas ao TSE
const INTERVALO = { antes: 60_000, apurando: 10_000, fim: 300_000 };

const arq = (ele, uf, cargo) => {
  const u = uf.toLowerCase();
  return `${B}${ele}/dados/${u}/${u}-c${String(cargo).padStart(4, "0")}-e${ele.padStart(6, "0")}-u.json`;
};

// devolve o texto do arquivo (JSON válido), "null" se o TSE ainda não publicou, ou undefined se falhou
async function baixa(url) {
  try {
    const r = await fetch(url, { cache: "no-store", headers: { "user-agent": "painel-2turno (uso pessoal)" } });
    if (r.status === 404 || r.status === 403) return "null";
    if (!r.ok) return undefined;
    const t = await r.text();
    JSON.parse(t); // só repassa JSON válido
    return t;
  } catch {
    return undefined;
  }
}

// junta vários arquivos num objeto JSON sem precisar remontar cada um
const junta = (obj) => "{" + Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => JSON.stringify(k) + ":" + v).join(",") + "}";

export class Coletor {
  constructor(state, env) {
    this.vivo = null;   // última coleta pronta (texto JSON)
    this.arqs = {};     // último texto de cada arquivo (para manter o anterior se um falhar)
    this.t = 0;         // hora da última coleta
    this.fase = "antes";
    this.emCurso = null;
    this.gov1 = null;   // 1º turno dos governadores (não muda)
    this.sim = null;    // pacote da simulação (não muda)
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.searchParams.has("sim")) {
      this.sim ||= await this.pacoteSim();
      return this.resposta(this.sim);
    }
    if (!this.vivo || Date.now() - this.t >= INTERVALO[this.fase]) {
      // uma coleta por vez: quem chega enquanto ela roda espera a mesma
      this.emCurso ||= this.coleta().finally(() => { this.emCurso = null; });
      await this.emCurso;
    }
    return this.resposta(this.vivo);
  }

  resposta(corpo) {
    return new Response(corpo, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }

  async primeiroTurnoGov() {
    if (this.gov1) return this.gov1;
    const g = await Promise.all(GOV.map((uf) => baixa(arq(ELE.gov1, uf, 3))));
    if (g.some((x) => x === undefined)) return undefined; // tenta de novo na próxima
    this.gov1 = junta(Object.fromEntries(GOV.map((uf, i) => [uf, g[i]])));
    return this.gov1;
  }

  async coleta() {
    const alvos = [
      ["p/BR", arq(ELE.pres2, "BR", 1)],
      ...[...UFS, "ZZ"].map((uf) => ["p/" + uf, arq(ELE.pres2, uf, 1)]),
      ...GOV.map((uf) => ["g/" + uf, arq(ELE.gov2, uf, 3)]),
    ];
    const [txt, g1] = await Promise.all([Promise.all(alvos.map(([, u]) => baixa(u))), this.primeiroTurnoGov()]);
    let falhas = 0;
    alvos.forEach(([k], i) => {
      if (txt[i] === undefined) falhas++;
      else this.arqs[k] = txt[i];
    });
    const sec = (pre) => junta(Object.fromEntries(Object.entries(this.arqs).filter(([k]) => k.startsWith(pre)).map(([k, v]) => [k.slice(2), v])));

    // fase da apuração, pelo arquivo nacional do Presidente
    try {
      const br = JSON.parse(this.arqs["p/BR"] || "null");
      const tf = (k) => { try { return JSON.parse(this.arqs[k] || "null")?.tf === "s"; } catch { return false; } };
      if (br && br.tf === "s" && GOV.every((uf) => tf("g/" + uf) || this.arqs["g/" + uf] === "null")) this.fase = "fim";
      else if (br && +br.e?.est > 0) this.fase = "apurando";
      else this.fase = "antes";
    } catch {}

    this.t = Date.now();
    this.vivo = `{"t":${this.t},"fase":"${this.fase}","intervalo":${INTERVALO[this.fase]},"falhas":${falhas},"p":${sec("p/")},"g":${sec("g/")},"g1":${g1 || this.gov1 || "{}"}}`;
  }

  async pacoteSim() {
    const ufs = ["BR", ...UFS, "ZZ"];
    const [p, g1] = await Promise.all([Promise.all(ufs.map((uf) => baixa(arq(ELE.pres1, uf, 1)))), this.primeiroTurnoGov()]);
    if (p.some((x) => x === undefined) || !g1) throw new Error("falha ao montar a simulação");
    return `{"p1":${junta(Object.fromEntries(ufs.map((uf, i) => [uf, p[i]])))},"g1":${g1}}`;
  }
}
