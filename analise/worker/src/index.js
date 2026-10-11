// Análise eleitoral: página + API só de leitura (dados oficiais do TSE carregados no D1).
// Não existe nenhuma rota de escrita: a carga é feita só pelo GitHub Actions, com token secreto.
// Se o segredo CHAVE estiver definido no Worker, página e API só abrem com o link secreto (?k=...).
import PAGINA from "./pagina.html";
import REGIOES_CE from "../../regioes/ce-ipece.json";

const BASE = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};
const API = { ...BASE, "x-robots-tag": "noindex", "content-type": "application/json; charset=utf-8", "cache-control": "private, max-age=300" };
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "img-src 'self' data: https://tile.openstreetmap.org https://cdnjs.cloudflare.com https://resultados.tse.jus.br https://apuracao2026.goatcounter.com",
  "connect-src 'self' https://resultados.tse.jus.br",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: API });
const erro = (msg, status = 400) => json({ erro: msg }, status);

const int = (v) => (/^\d{1,6}$/.test(v || "") ? Number(v) : null);
const uf = (v) => (/^[A-Z]{2}$/.test(v || "") ? v : null);
// chaves aceitas: ANO/TURNO/UF/(c/CARGO/NR | z/MUN/ZONA/CARGO | l/MUN/ZONA | t/CARGO | g)
const CHAVE = /^\d{4}\/[12]\/[A-Z]{2}\/(c\/\d{1,4}\/\d{1,6}|z\/\d{1,6}\/\d{1,4}\/\d{1,4}|l\/\d{1,6}\/\d{1,4}|t\/\d{1,4}|g)$/;

function liberado(req, env, url) {
  if (!env.CHAVE) return true;
  const ck = (req.headers.get("cookie") || "").match(/(?:^|;\s*)ak=([^;]+)/);
  return (ck && ck[1] === env.CHAVE) || url.searchParams.get("k") === env.CHAVE;
}

export default {
  async fetch(req, env) {
    if (req.method !== "GET" && req.method !== "HEAD") return erro("Somente leitura.", 405);
    const url = new URL(req.url);
    if (!liberado(req, env, url)) {
      return new Response("Acesso restrito. Use o link enviado.", { status: 403, headers: { ...BASE, "content-type": "text/plain; charset=utf-8" } });
    }
    // link secreto vira cookie e some da barra de endereço
    if (env.CHAVE && url.searchParams.get("k") === env.CHAVE) {
      url.searchParams.delete("k");
      return new Response(null, {
        status: 302,
        headers: { ...BASE, location: url.pathname + url.search, "set-cookie": `ak=${env.CHAVE}; Path=/; Max-Age=7776000; Secure; HttpOnly; SameSite=Lax` },
      });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(PAGINA, { headers: { ...BASE, "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "cache-control": "no-cache" } });
    }
    const p = url.searchParams;
    const db = env.DB;
    try {
      switch (url.pathname) {
        case "/api/status": {
          const { results } = await db.prepare("SELECT chave, valor FROM meta ORDER BY chave").all();
          return json(results.map((r) => ({ chave: r.chave, ...JSON.parse(r.valor) })));
        }
        case "/api/regioes": {
          if (p.get("uf") !== "CE") return json({ regioes: [], municipio_regiao: {} });
          return json(REGIOES_CE);
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
          const k = p.get("k2") || "";
          if (!CHAVE.test(k)) return erro("Chave inválida.");
          const { results } = await db.prepare("SELECT dados FROM blob WHERE chave=? ORDER BY parte").bind(k).all();
          if (!results.length) return erro("Não encontrado.", 404);
          return new Response(results.map((r) => r.dados).join(""), { headers: API });
        }
        default:
          return erro("Rota desconhecida.", 404);
      }
    } catch (e) {
      return erro("Falha ao consultar o banco.", 500);
    }
  },
};
