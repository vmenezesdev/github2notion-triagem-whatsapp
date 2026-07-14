# Confiabilidade e retomada

## Journal operacional

`tracking.csv` e atualizado por escrita atomica depois de cada transicao
relevante. IDs de upload sao persistidos um a um, permitindo retomar sem enviar
novamente os arquivos ja aceitos.

## Backoff

O cliente tenta novamente respostas 429 e 5xx. O atraso usa o maior valor entre
`Retry-After` e um backoff exponencial com jitter, limitado por configuracao.
Erros de validacao e autenticacao nao sao repetidos automaticamente.

## Circuit breaker de lote

Tres falhas consecutivas da mesma causa interrompem a rodada. Continuar diante
de um schema incorreto, token revogado ou indisponibilidade persistente apenas
ampliaria o dano e dificultaria a auditoria.

## Matriz de retomada

| Estado encontrado | Acao segura |
|---|---|
| uploads parciais, sem pagina | continuar do primeiro anexo sem ID |
| pagina registrada no CSV | reler e verificar antes de qualquer criacao |
| pagina encontrada por titulo | reutilizar somente se for unica |
| propriedades divergentes | marcar erro; nao criar copia automaticamente |
| relacao incerta | manter vazia e encaminhar a triagem |

## Garantias e nao garantias

O fluxo oferece idempotencia operacional por grupo dentro do contrato de titulo
e controle. Nao oferece transacao distribuida entre filesystem e Notion. Por
isso, cada etapa e observavel e repetivel, e a verificacao remota e obrigatoria.
