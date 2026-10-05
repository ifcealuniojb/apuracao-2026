# Apuração 2026 · Busca de candidatos

Site estático para consultar os resultados das **Eleições Gerais 2026 (1º turno em 04/10 e 2º turno em 25/10/2026)** usando **exclusivamente os arquivos públicos oficiais do TSE** (`https://resultados.tse.jus.br/oficial`).

## O que faz
- Busca por estado, cargo, nome, número, partido ou federação/coligação (com autocompletar).
- Total de votos, situação oficial do TSE e ranking de votos por município (ou por estado, para Presidente).
- Para Deputado Federal/Estadual/Distrital: cadeiras por partido/federação e projeção de eleitos enquanto o TSE não conclui a totalização (Código Eleitoral, arts. 106 a 109, e STF, ADIs 7228, 7263 e 7325). Quando o TSE publica a situação oficial, ela prevalece.
- Foto oficial dos candidatos.
- 1º e 2º turno: Presidente com situação nacional em qualquer estado; no 2º turno, mostra as disputas (Presidente e Governador) até o TSE publicar a apuração.

## Fontes e privacidade
- Todos os dados vêm do navegador de quem acessa, direto do TSE. Não há servidor, chaves de API nem coleta de dados.
- O próprio `index.html` bloqueia (Content-Security-Policy) qualquer conexão a endereços que não sejam `resultados.tse.jus.br`.
- Documentação técnica do TSE: <https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados>

> Projeto independente, sem vínculo com a Justiça Eleitoral. Projeções podem mudar até o fim da totalização; a situação oficial é a divulgada pelo TSE.
