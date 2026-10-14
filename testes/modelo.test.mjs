// Testes obrigatórios T01–T10 do manual "Diagnóstico Eleitoral 2026" (seção 11).
// Rodam sobre o bloco do modelo copiado da própria página (entre MODELO-INICIO e MODELO-FIM),
// então testam exatamente o código publicado.
// Uso: node testes/modelo.test.mjs [caminho/da/pagina.html]   (padrão: desempenho/index.html)
import fs from "node:fs";
import assert from "node:assert/strict";

const pagina = process.argv[2] || new URL("../desempenho/index.html", import.meta.url).pathname;
const html = fs.readFileSync(pagina, "utf8");
const bloco = html.match(/\/\* MODELO-INICIO[\s\S]*?\/\* MODELO-FIM \*\//);
if (!bloco) throw new Error(`Bloco do modelo não encontrado em ${pagina}`);
const M = new Function(bloco[0] + `;return{MODELO,lgama,unidadeValida,validaUnidades,parametrosValidos,fatiaObs,fatiaAjustada,ajustaBB,classifica,heterogeneidade,quantil,concilia,agrupaPorBairro,chaveModelo,betai,probAcima,intervalo};`)();

const fitFixo = (alpha, beta) => ({ status: "ok", alpha, beta });
const perto = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol;
let ok = 0, falhas = 0;
function t(id, desc, fn) {
  try { fn(); ok++; console.log(`✔ ${id} ${desc}`); }
  catch (e) { falhas++; console.log(`✘ ${id} ${desc}\n    ${e.message}`); }
}

// gerador determinístico para os testes de reprodutibilidade
function gerador(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function amostra(N, m, k, seed) {
  const r = gerador(seed);
  const gam = (a) => { if (a < 1) return gam(a + 1) * Math.pow(r() || 1e-12, 1 / a); const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r()); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } };
  return Array.from({ length: N }, () => { const n = 150 + Math.floor(r() * 200), a = gam(m * k), b = gam((1 - m) * k), th = a / (a + b); let y = 0; for (let i = 0; i < n; i++) if (r() < th) y++; return { y, n }; });
}

t("T01", "y=8, n=10, α=6, β=4 → observada 0,8; ajustada 0,7", () => {
  assert.equal(M.fatiaObs(8, 10), 0.8);
  assert.ok(perto(M.fatiaAjustada(8, 10, fitFixo(6, 4)), 0.7));
});
t("T02", "y=800, n=1000, α=6, β=4 → ajustada 806/1010", () => {
  assert.ok(perto(M.fatiaAjustada(800, 1000, fitFixo(6, 4)), 806 / 1010));
});
t("T03", "y=0, n=0 → observada nula; ajuste indisponível; indicador 'sem'", () => {
  assert.equal(M.fatiaObs(0, 0), null);
  assert.equal(M.fatiaAjustada(0, 0, fitFixo(6, 4)), null);
  assert.equal(M.classifica(null, 0.5), "sem");
});
t("T04", "y=11, n=10 → dado rejeitado", () => {
  assert.equal(M.unidadeValida(11, 10), false);
  assert.throws(() => M.ajustaBB([{ y: 11, n: 10 }, ...amostra(10, 0.4, 50, 1)]), /inválido/);
  assert.equal(M.unidadeValida(-1, 10), false);
  assert.equal(M.unidadeValida(2.5, 10), false);
});
t("T05", "α ≤ 0 ou β ≤ 0 → parâmetros rejeitados", () => {
  assert.equal(M.parametrosValidos(0, 4), false);
  assert.equal(M.parametrosValidos(6, -1), false);
  assert.throws(() => M.fatiaAjustada(8, 10, fitFixo(0, 4)), /inválidos/);
  assert.throws(() => M.fatiaAjustada(8, 10, fitFixo(6, -2)), /inválidos/);
});
t("T06", "mesma base, mesmo algoritmo, mesma versão → mesmos α, β e indicadores", () => {
  const us = amostra(300, 0.45, 60, 7);
  const a = M.ajustaBB(us), b = M.ajustaBB(us.map((u) => ({ ...u })));
  assert.equal(a.status, "ok");
  assert.equal(a.alpha, b.alpha); assert.equal(a.beta, b.beta);
  // e o resultado recupera os parâmetros da simulação dentro de uma tolerância razoável
  assert.ok(Math.abs(a.m - 0.45) < 0.02, `m=${a.m}`);
  assert.ok(a.k > 35 && a.k < 100, `k=${a.k}`);
  // ordem das unidades não muda o ajuste (além do arredondamento de ponto flutuante)
  const c = M.ajustaBB([...us].reverse());
  assert.ok(Math.abs(c.alpha - a.alpha) / a.alpha < 1e-5 && Math.abs(c.beta - a.beta) / a.beta < 1e-5);
});
t("T07", "soma das seções ≠ total oficial → não marca 'conciliado' e mostra a diferença", () => {
  assert.deepEqual(M.concilia(1000, 1000), { status: "conciliado", dif: 0 });
  assert.deepEqual(M.concilia(998, 1000), { status: "divergente", dif: -2 });
  assert.equal(M.concilia(1000, null).status, "pendente");
});
t("T08", "bairro não mapeado → votos continuam no total; cobertura incompleta", () => {
  const secs = [{ bairro: "Centro", y: 10, n: 100 }, { bairro: null, y: 5, n: 50 }, { bairro: "Centro", y: 3, n: 30 }];
  const r = M.agrupaPorBairro(secs);
  assert.equal(r.grupos.reduce((t, g) => t + g.y, 0), 18);
  assert.equal(r.grupos.reduce((t, g) => t + g.n, 0), 180);
  assert.equal(r.cobertura.completa, false);
  assert.equal(r.cobertura.secoesSemBairro, 1);
});
t("T09", "modelo não converge / não estimável → não classifica com valor ajustado", () => {
  // poucas unidades
  const f1 = M.ajustaBB(amostra(3, 0.4, 50, 3));
  assert.equal(f1.status, "indisponivel"); assert.match(f1.motivo, /mínimo/);
  assert.equal(M.fatiaAjustada(10, 100, f1), null);
  // sem votos do candidato
  assert.equal(M.ajustaBB(Array.from({ length: 10 }, () => ({ y: 0, n: 200 }))).status, "indisponivel");
  // sem variação além do acaso: todas as áreas com a mesma fatia
  const f3 = M.ajustaBB(Array.from({ length: 30 }, () => ({ y: 100, n: 250 })));
  assert.equal(f3.status, "indisponivel"); assert.match(f3.motivo, /acaso/);
  // limite de iterações estourado → indisponível, nunca parâmetro inventado
  const f4 = M.ajustaBB(amostra(50, 0.45, 60, 9), { ...M.MODELO, maxIter: 3 });
  assert.equal(f4.status, "indisponivel"); assert.equal(f4.alpha, null);
});
t("T10", "troca de cargo ou turno → outra chave de modelo (recalcula)", () => {
  const base = { ano: 2026, turno: 1, cargo: 1, nr: 13, area: "Cariri", nivel: "municipio" };
  const k = M.chaveModelo(base);
  assert.notEqual(k, M.chaveModelo({ ...base, cargo: 3 }));
  assert.notEqual(k, M.chaveModelo({ ...base, turno: 2 }));
  assert.notEqual(k, M.chaveModelo({ ...base, nr: 22 }));
  assert.notEqual(k, M.chaveModelo({ ...base, nivel: "bairro" }));
});

// extras: aritmética de apoio
t("X01", "log-gama confere com valores conhecidos", () => {
  assert.ok(perto(M.lgama(1), 0, 1e-13)); assert.ok(perto(M.lgama(10), Math.log(362880), 1e-11));
  assert.ok(perto(M.lgama(0.5), Math.log(Math.sqrt(Math.PI)), 1e-13));
});
t("X02", "classificação: limites de 10% exatos", () => {
  assert.equal(M.classifica(0.44, 0.40), "forte"); assert.equal(M.classifica(0.4399, 0.40), "inter");
  assert.equal(M.classifica(0.36, 0.40), "fraco"); assert.equal(M.classifica(0.3601, 0.40), "inter");
});
t("X03", "heterogeneidade = desvio ponderado (p.p.)", () => {
  const h = M.heterogeneidade([{ y: 50, n: 100 }, { y: 30, n: 100 }]);
  assert.ok(perto(h, 0.1, 1e-12));
});

t("X04", "beta incompleta e intervalo do modelo", () => {
  assert.ok(perto(M.betai(2, 3, 0.5), 11 / 16, 1e-10));
  assert.ok(perto(M.betai(0.5, 0.5, 0.5), 0.5, 1e-10));
  // a aproximação normal (a, b enormes) emenda com as frações contínuas
  assert.ok(Math.abs(M.betai(19999, 20001, 0.501) - M.betai(20001, 20001, 0.501)) < 0.02);
  const iv = M.intervalo(0, 0, { status: "ok", alpha: 1, beta: 1 });
  assert.equal(iv, null);
  const iv2 = M.intervalo(0, 1, { status: "ok", alpha: 0.5, beta: 0.5 }); // Beta(0.5, 1.5)
  assert.ok(iv2[0] < iv2[1] && iv2[0] >= 0 && iv2[1] <= 1);
  const u = M.intervalo(0, 1, { status: "ok", alpha: 1, beta: 0 + 1e-300 }); // não trava
  assert.ok(Array.isArray(u));
});
t("X05", "poucos votos não viram Forte/Fraco só pelo limite de 10%", () => {
  const fit = { status: "ok", alpha: 0.6721, beta: 586.4 }, ref = 0.0011; // deputado com 0,11% no município
  // 1 voto numa seção de 160 (esperado ≈ 0,18): passa dos 10%, mas a probabilidade (≈ 71%) não chega a 90%
  const pa1 = M.probAcima(1, 160, fit, ref), adj1 = M.fatiaAjustada(1, 160, fit);
  assert.ok(pa1 > 0.6 && pa1 < 0.8, `pa1=${pa1}`);
  assert.equal(M.classifica(adj1, ref, M.MODELO, pa1), "inter");
  // 2 votos em 189 (esperado ≈ 0,2): o modelo dá ≈ 91% → Forte é sustentado pelos dados
  assert.equal(M.classifica(M.fatiaAjustada(2, 189, fit), ref, M.MODELO, M.probAcima(2, 189, fit, ref)), "forte");
  const pa0 = M.probAcima(0, 160, fit, ref), adj0 = M.fatiaAjustada(0, 160, fit);
  assert.equal(M.classifica(adj0, ref, M.MODELO, pa0), "inter");
  // área grande e claramente acima continua Forte
  const f2 = { status: "ok", alpha: 70.55, beta: 60.83 };
  assert.equal(M.classifica(M.fatiaAjustada(7376, 11802, f2), 0.535, M.MODELO, M.probAcima(7376, 11802, f2, 0.535)), "forte");
});
console.log(`\n${ok} ok, ${falhas} falha(s) · ${pagina.split("/").slice(-2).join("/")}`);
process.exit(falhas ? 1 : 0);
