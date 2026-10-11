# Mapa de Votos 2026 (Cloudflare)

Código do Mapa de Votos. Esta pasta **não** vai para o GitHub Pages (ver `_config.yml`).

- `carga/carga.py`: lê os arquivos oficiais do TSE (Portal de Dados Abertos) e gera o SQL para o banco D1.
- `worker/`: API só de leitura no Cloudflare Workers (`https://analise-eleitoral.joao-antonio-araujo62.workers.dev/`). A página fica em `desempenho/` (GitHub Pages).
- `regioes/ce-ipece.json`: municípios por Região de Planejamento do Ceará (IPECE).

Publicação e carga: ver o `README.md` da raiz.
