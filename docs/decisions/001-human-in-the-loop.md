# ADR 001: baixa confianca entra na fila, nao no catalogo final

## Status

Aceita.

## Contexto

Bloquear todo material incerto protege o catalogo, mas impede que a equipe de
triagem veja e resolva justamente os casos para os quais a fila existe.
Preencher uma relacao aproximada acelera o envio, mas transforma ambiguidade em
erro semantico.

## Decisao

Enviar casos incertos para a data source de triagem com marcador explicito,
justificativa auditavel e relacoes incertas vazias. A automacao nao aciona a
decisao final.

## Consequencias

- cobertura do acervo sem fingir certeza;
- mais trabalho manual concentrado onde agrega valor;
- consultas devem distinguir registros padrao e de baixa confianca;
- o corpo e o tracking precisam preservar a justificativa.
