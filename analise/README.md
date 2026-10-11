# Análise eleitoral por área (em validação, fora do site)

Este ramo (`analise-bairros`) não é publicado no GitHub Pages.

- `carga/carga.py`: lê os arquivos oficiais do TSE (Portal de Dados Abertos) e gera o SQL para o banco D1.
- `worker/`: API só de leitura no Cloudflare Workers.
- `.github/workflows/analise-carga.yml`: baixa do TSE, carrega no D1 e publica a API. Usa o segredo `CLOUDFLARE_API_TOKEN`.

Fonte única: TSE. O Cloudflare só guarda e entrega os dados.
