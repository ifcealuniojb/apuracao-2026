# Eleições 2026 · Apuração e Mapa de Votos

Duas ferramentas para consultar os resultados das **Eleições Gerais 2026** com **dados oficiais do TSE**.

Endereço: <https://ifcealuniojb.github.io/apuracao-2026/> (página inicial para escolher a ferramenta).

## Estrutura

| Pasta / arquivo | O que é | Onde roda |
|---|---|---|
| `index.html` | Página inicial: escolha entre Apuração e Mapa de Votos | GitHub Pages |
| `apuracao/` | **Apuração 2026**: busca de candidatos, votos, situação, ranking por município e cadeiras | GitHub Pages (`/apuracao/`) |
| `analise/` | **Mapa de Votos 2026**: desempenho por região, município, bairro, local e seção (Ceará) | Cloudflare (Worker + banco D1) |
| `analise/carga/` | Script que lê os arquivos oficiais do TSE e prepara o banco | GitHub Actions |
| `analise/worker/` | Página e API (só leitura) do Mapa de Votos | Cloudflare Workers |
| `analise/regioes/` | Municípios por Região de Planejamento do Ceará (IPECE) | embutido no Worker |
| `.github/workflows/analise-carga.yml` | Publica o Mapa de Votos; recarrega os dados só quando pedido | GitHub Actions |
| `_config.yml` | Tira a pasta `analise/` do GitHub Pages | GitHub Pages |

Links antigos da apuração com parâmetros (`?uf=…`) são levados automaticamente para `/apuracao/`.

## Fontes e privacidade
- **Apuração:** os dados vêm do navegador de quem acessa, direto do TSE (`resultados.tse.jus.br`). A página bloqueia (Content-Security-Policy) conexões a outros endereços.
- **Mapa de Votos:** votação por seção e eleitorado por local de votação do Portal de Dados Abertos do TSE (`dadosabertos.tse.jus.br`), guardados num banco próprio no Cloudflare. Nomes, partidos, situação e fotos vêm de `resultados.tse.jus.br`. Regiões: IPECE. Mapa: OpenStreetMap.
- Contador de acessos silencioso (GoatCounter), sem cookies e sem dados pessoais.

## Mapa de Votos: publicação e carga
- Um push no `main` que mexa em `analise/**` republica a página/API do Mapa de Votos no Cloudflare. **Os dados não são regravados.**
- Para recarregar os dados (ex.: 2º turno), rode o workflow manualmente com `carga=sim` (escolhendo UF, ano e turno), ou faça um commit com `[carga]` na mensagem.
- O plano grátis do banco permite 100 mil linhas gravadas por dia; uma carga do Ceará usa cerca de 10%.
- Segredos do repositório: `CLOUDFLARE_API_TOKEN` (obrigatório) e `ANALISE_CHAVE` (opcional, fecha o Mapa de Votos com link secreto).

> Projeto independente, sem vínculo com a Justiça Eleitoral. Resultados e projeções podem mudar até o fim da totalização; a situação oficial é a divulgada pelo TSE.
