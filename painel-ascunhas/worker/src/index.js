// Painel do 2º turno com a identidade do As Cunhãs. Só abre com o link secreto (?k=...), que vira um cookie.
// Não consulta o TSE por conta própria: lê o MESMO coletor do painel pessoal (Durable Object "Coletor" do
// Worker painel-2turno, uma só instância). Abrir os dois painéis não aumenta as consultas ao TSE.
// Aqui fica apenas o SHA-256 da chave: a chave em si não está no código.
import PAGINA from "./pagina.html";
import URNA from "./urna.mp3"; // som do alerta (urna eletrônica)
import MAPA from "../../../painel/worker/src/mapa.json";

const HASH = "3be8eabd40b4b1f55890620b696cadfc384c219487df39564c280bbab1fa14e5";
const COOKIE = "acu";
const HTML = PAGINA.replace("__MAPA__", JSON.stringify(MAPA));

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "connect-src 'self'",
  "img-src https://resultados.tse.jus.br data:",
  "media-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const BASE = {
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

async function sha256(txt) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function cookie(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([A-Za-z0-9_-]{16,64})"));
  return m ? m[1] : "";
}

const nada = () => new Response("Não encontrado.", { status: 404, headers: { ...BASE, "content-type": "text/plain; charset=utf-8" } });

export default {
  async fetch(req, env) {
    if (req.method !== "GET" && req.method !== "HEAD") return nada();
    const url = new URL(req.url);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { ...BASE, "content-type": "text/plain" } });
    if (url.pathname !== "/" && url.pathname !== "/dados" && url.pathname !== "/urna.mp3") return nada();

    const k = url.searchParams.get("k");
    if (k && url.pathname === "/") {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(k) || (await sha256(k)) !== HASH) return nada();
      // guarda a chave num cookie e tira ela do endereço (Lax: com Strict, quem abre pelo link vindo de outro site
      // perde o cookie no redirecionamento e cai no 404)
      url.searchParams.delete("k");
      return new Response(null, {
        status: 302,
        headers: { ...BASE, location: url.pathname + url.search, "set-cookie": `${COOKIE}=${k}; Path=/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax` },
      });
    }
    const c = cookie(req);
    if (!c || (await sha256(c)) !== HASH) return nada();

    if (url.pathname === "/urna.mp3") {
      return new Response(URNA, { headers: { ...BASE, "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" } });
    }

    if (url.pathname === "/dados") {
      try {
        const obj = env.COLETOR.get(env.COLETOR.idFromName("unico"));
        const r = await obj.fetch("https://coletor/dados" + (url.searchParams.has("sim") ? "?sim=1" : ""));
        return new Response(r.body, { status: r.status, headers: { ...BASE, "content-type": "application/json; charset=utf-8" } });
      } catch (e) {
        return new Response('{"erro":"coletor indisponível"}', { status: 502, headers: { ...BASE, "content-type": "application/json; charset=utf-8" } });
      }
    }

    return new Response(HTML, {
      headers: { ...BASE, "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "x-frame-options": "DENY" },
    });
  },
};
