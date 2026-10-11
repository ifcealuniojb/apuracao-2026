// Painel pessoal do 2º turno. Só abre com o link secreto (?k=...), que vira um cookie.
// Os dados são lidos pelo navegador direto do TSE (resultados.tse.jus.br); este Worker só entrega a página.
// Aqui fica apenas o SHA-256 da chave: a chave em si não está no código.
import PAGINA from "./pagina.html";
import MAPA from "./mapa.json";

const HASH = "6759745aa38067f8de78fe83e1a89a39335050957617aae481c56c6e090b09e3";
const COOKIE = "p2t";
const HTML = PAGINA.replace("__MAPA__", JSON.stringify(MAPA));

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "connect-src https://resultados.tse.jus.br",
  "img-src https://resultados.tse.jus.br data:",
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
  async fetch(req) {
    if (req.method !== "GET" && req.method !== "HEAD") return nada();
    const url = new URL(req.url);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n", { headers: { ...BASE, "content-type": "text/plain" } });
    if (url.pathname !== "/") return nada();

    const k = url.searchParams.get("k");
    if (k) {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(k) || (await sha256(k)) !== HASH) return nada();
      // guarda a chave num cookie e tira ela do endereço
      url.searchParams.delete("k");
      return new Response(null, {
        status: 302,
        headers: { ...BASE, location: url.pathname + url.search, "set-cookie": `${COOKIE}=${k}; Path=/; Max-Age=7776000; HttpOnly; Secure; SameSite=Strict` },
      });
    }
    const c = cookie(req);
    if (!c || (await sha256(c)) !== HASH) return nada();

    return new Response(HTML, {
      headers: { ...BASE, "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "x-frame-options": "DENY" },
    });
  },
};
