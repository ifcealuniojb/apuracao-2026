CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS municipio (ano INTEGER, turno INTEGER, uf TEXT, cd_mun INTEGER, nome TEXT, zonas TEXT, PRIMARY KEY (ano, turno, uf, cd_mun));
CREATE TABLE IF NOT EXISTS candidato (ano INTEGER, turno INTEGER, uf TEXT, cargo INTEGER, ds_cargo TEXT, nr INTEGER, sq TEXT, nome TEXT, total INTEGER, PRIMARY KEY (ano, turno, uf, cargo, nr));
CREATE TABLE IF NOT EXISTS blob (chave TEXT, parte INTEGER, dados TEXT, PRIMARY KEY (chave, parte));
