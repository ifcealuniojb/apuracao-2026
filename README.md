# Eleições 2026 · Apuração e Mapa de Votos

Duas ferramentas para consultar os resultados das **Eleições Gerais 2026** com **dados oficiais do TSE**.

Endereço: <https://ifcealuniojb.github.io/apuracao-2026/> (página inicial para escolher a ferramenta).

## Estrutura

| Pasta / arquivo | O que é | Onde roda |
|---|---|---|
| `index.html` | Página inicial: escolha entre Apuração e Mapa de Votos | GitHub Pages |
| `apuracao/` | **Apuração 2026**: busca de candidatos, votos, situação, ranking por município e cadeiras | GitHub Pages (`/apuracao/`) |
| `desempenho/` | **Mapa de Votos 2026**: desempenho por região, município, bairro, local e seção (Ceará) | GitHub Pages (`/desempenho/`), lendo a API no Cloudflare |
| `analise/` | Dados e API do Mapa de Votos | Cloudflare (Worker + banco D1) |
| `analise/carga/` | Script que lê os arquivos oficiais do TSE e prepara o banco | GitHub Actions |
| `analise/worker/` | API só de leitura do Mapa de Votos (aceita chamadas só do site do projeto); o endereço antigo da página redireciona para `/desempenho/` | Cloudflare Workers |
| `analise/regioes/` | Municípios por Região de Planejamento do Ceará (IPECE) | embutido no Worker |
| `.github/workflows/analise-carga.yml` | Publica o Mapa de Votos; recarrega os dados só quando pedido | GitHub Actions |
| `_config.yml` | Tira a pasta `analise/` do GitHub Pages | GitHub Pages |

Links antigos da apuração com parâmetros (`?uf=…`) são levados automaticamente para `/apuracao/`.

## Fontes e privacidade
- **Apuração:** os dados vêm do navegador de quem acessa, direto do TSE (`resultados.tse.jus.br`). A página bloqueia (Content-Security-Policy) conexões a outros endereços.
- **Mapa de Votos:** votação por seção e eleitorado por local de votação do Portal de Dados Abertos do TSE (`dadosabertos.tse.jus.br`), guardados num banco próprio no Cloudflare. Nomes, partidos, situação e fotos vêm de `resultados.tse.jus.br`. Regiões: IPECE. Mapa: OpenStreetMap.
- Contador de acessos silencioso (GoatCounter), sem cookies e sem dados pessoais.

## Mapa de Votos: publicação e carga
- A página do Mapa de Votos (`desempenho/`) é publicada pelo GitHub Pages como o resto do site.
- Um push no `main` que mexa em `analise/**` republica a API no Cloudflare. **Os dados não são regravados.**
- Para recarregar os dados (ex.: 2º turno), rode o workflow manualmente em Actions → "Run workflow", com `carga=sim` e escolhendo UF, ano e turno. Um push nunca regrava os dados.
- O plano grátis do banco permite 100 mil linhas gravadas por dia; uma carga do Ceará usa cerca de 10%.
- Segredo do repositório: `CLOUDFLARE_API_TOKEN`.

> Projeto independente, sem vínculo com a Justiça Eleitoral. Resultados e projeções podem mudar até o fim da totalização; a situação oficial é a divulgada pelo TSE.
