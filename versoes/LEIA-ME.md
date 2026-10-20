# Versões congeladas do site

Padrão de publicação do projeto (documento `claude/padrao-publicacao.md` no projeto do Claude).

Cada arquivo aqui é uma versão pronta para ir ao ar, exatamente como foi testada. **Nunca editar um arquivo desta pasta.** Mudou algo? Crie uma versão nova (v3, v4…) e acrescente a linha dela no botão (`.github/workflows/site-trocar-versao.yml`, lista `options`, agrupada por página, a mais nova primeiro).

## Publicar ou voltar (sem programar)
GitHub → **Actions** → **Site - trocar versão** → **Run workflow** → escolha a versão e o destino → **Run workflow**.

- Destino **teste**: endereço `/teste-…/` da página (não divulgado).
- Destino **site**: endereço oficial da página.
- Destino **apagar o endereço de teste da página**: depois de publicar (escolha qualquer versão daquela página).
- Em 1 a 3 minutos a página muda. **Verde com "No ar"** = confirmado. **Vermelho** = não confirmado: o que estava antes continua no ar; rodar de novo só confere.
- Deu problema no ar? **Volte primeiro** (versão anterior + site) e investigue depois, no teste.
- Alguns visitantes podem ver a versão anterior por até ~10 minutos (cache). Confira o rodapé numa aba anônima.
- Se o rodapé já voltou e o erro continua, o problema não é a página (API, dados ou fonte externa).
- **Pausa do 2º turno** (decisão do João, 20/10): de sábado 24/10, 18h, até a totalização do 2º turno, só o botão de voltar roda.

## Versões

| Página | Versão | Base | No ar | O que é | SHA-256 (início) |
|---|---|---|---|---|---|
| Mapa de Votos (`desempenho/`) | `mapa-votos/v1-2026-10-14` | — | 14/10 a 20/10 | Indicador de 14/10 (Forte / Intermediário / Fraco / "muitos votos em jogo"). Cópia idêntica da página no ar em 20/10/2026 (commit `63efb61`). | `3bdafbf1` |
| Mapa de Votos (`desempenho/`) | `mapa-votos/v2-bb-mle-1` | v1 | **desde 20/10 (atual)** | Manual de diagnóstico (modelo `bb-mle-1`). Versão de teste de 14/10 sem a faixa "VERSÃO DE TESTE" e sem o `noindex`. 15/15 testes (`node testes/modelo.test.mjs versoes/mapa-votos/v2-bb-mle-1.html`). Rodapé: "Indicador: modelo bb-mle-1". | `4a430484` |
| Apuração (`apuracao/`) | `apuracao/v1-2026-10-14-1430` | — | **desde 14/10 (atual)** | Rodapé "Versão 2026-10-14 · 14h30" (correção do Presidente em estados). Cópia idêntica da página no ar em 20/10/2026. | `9a0cfc19` |

As versões do Mapa de Votos usam a mesma API e os mesmos dados (1º turno, CE). Se um dia a API mudar, ela tem que continuar servindo as versões antigas (conferir antes).

Esta pasta fica fora do site (`_config.yml`).
