// Validação estatística do modelo antes da produção (manual, seção 12):
// simula grupos com parâmetros conhecidos e compara o erro da fatia ajustada com o da observada,
// por tamanho do grupo. Foi o que definiu MODELO.minUnidades = 5.
// Uso: node testes/simulacao.mjs [caminho/da/pagina.html]
import fs from "node:fs";
const pagina = process.argv[2] || new URL("../desempenho/index.html", import.meta.url).pathname;
const bloco = fs.readFileSync(pagina, "utf8").match(/\/\* MODELO-INICIO[\s\S]*?\/\* MODELO-FIM \*\//)[0];
const M = new Function(bloco + ";return{MODELO,ajustaBB};")();
const cfg = { ...M.MODELO, minUnidades: 3 }; // libera grupos pequenos só para medir
let st = 0x9e3779b9;
const rnd = () => { st |= 0; st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 + 1e-12; };
function gamma(a) { if (a < 1) return gamma(a + 1) * Math.pow(rnd(), 1 / a); const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = rnd(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }
const beta = (a, b) => { const x = gamma(a), y = gamma(b); return x / (x + y); };
function binom(n, p) { if (n < 1000) { let s = 0; for (let i = 0; i < n; i++) if (rnd() < p) s++; return s; } const sd = Math.sqrt(n * p * (1 - p)); return Math.max(0, Math.min(n, Math.round(n * p + sd * Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd())))); }
const cenarios = [
  ["Seções (n≈250), fatia 45%", 0.45, 60, () => 150 + Math.floor(rnd() * 200)],
  ["Seções, deputado com 1,2%", 0.012, 400, () => 150 + Math.floor(rnd() * 200)],
  ["Municípios (n≈20 mil), fatia 50%", 0.5, 30, () => 2000 + Math.floor(rnd() * 40000)],
];
for (const [nome, m, k, nf] of cenarios) {
  console.log(`\n${nome} (verdadeiro: m=${m}, k=${k})`);
  for (const N of [3, 4, 5, 6, 8, 12, 20, 50]) {
    let eA = 0, eO = 0, c = 0, ok = 0;
    for (let r = 0; r < 300; r++) {
      const th = [], us = [];
      for (let i = 0; i < N; i++) { const t = beta(m * k, (1 - m) * k), n = nf(); th.push(t); us.push({ y: binom(n, t), n }); }
      const f = M.ajustaBB(us, cfg); if (f.status !== "ok") continue; ok++;
      us.forEach((u, i) => { eA += ((u.y + f.alpha) / (u.n + f.alpha + f.beta) - th[i]) ** 2; eO += (u.y / u.n - th[i]) ** 2; c++; });
    }
    console.log(`  N=${String(N).padStart(2)}  estimável em ${String(ok).padStart(3)}/300  erro médio (RMSE): ajustada ${(Math.sqrt(eA / c) * 100).toFixed(3)} p.p. · observada ${(Math.sqrt(eO / c) * 100).toFixed(3)} p.p.`);
  }
}
