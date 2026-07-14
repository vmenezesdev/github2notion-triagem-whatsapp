# Privacidade por desenho

## Principio de minimizacao

O repositorio publica regras e contratos, nao o dataset. Mesmo dados academicos
aparentemente banais podem revelar autoria, turma, calendario ou desempenho
quando combinados.

## O que fica fora do Git

- imagens, PDFs, documentos e planilhas do acervo;
- conversas exportadas e janelas reais de contexto;
- nomes, telefones e identificadores de remetentes;
- IDs de databases, data sources, paginas e uploads;
- URLs privadas, tokens, logs e caminhos absolutos;
- outputs locais de enriquecimento, controle e sincronizacao.

## Publicacao segura

Use fixtures produzidas do zero. Nao “anonimize” uma conversa real trocando
apenas nomes: datas, combinacoes de disciplinas e sequencias de mensagens ainda
podem reidentificar pessoas. Execute a auditoria descrita em `SECURITY.md` antes
de cada release.
