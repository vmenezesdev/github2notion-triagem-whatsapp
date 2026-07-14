# Estudo de caso anonimizado

## Problema

Um acervo de materiais academicos estava disperso em anexos e contexto
conversacional. O objetivo era leva-lo a uma data source de triagem, mantendo
ordem, justificativa e capacidade de retomada sem publicar o acervo.

## Funil observado

| Marco | Resultado agregado |
|---|---:|
| Itens inventariados | 223 |
| Grupos semanticos | 59 |
| Fluxo padrao | 40 |
| Baixa confianca para triagem | 19 |
| Paginas criadas | 56 |
| Paginas preexistentes revalidadas | 3 |
| Falhas finais | 0 |

## Ajuste metodologico decisivo

Inicialmente, baixa confianca era tratada como impedimento. A finalidade do
destino mostrou que isso estava errado: uma fila de triagem deve receber casos
incertos, desde que a incerteza seja explicita e nao contamine relacoes do
catalogo. O fluxo passou a enviar esses grupos com marcador, justificativa e
relacao de disciplina vazia.

## Aprendizados transferiveis

1. Modele a finalidade do destino antes de definir o que “bloqueia” o pipeline.
2. Use a mesma chave idempotente no journal e no produto remoto.
3. Salve progresso apos cada upload, nao apenas ao final do grupo.
4. Prefira consulta restrita pela chave a varreduras amplas de propriedades
   pesadas.
5. Releia objetos criados e reutilizados com os mesmos criterios.
6. Incerteza bem representada e mais util que uma classificacao confiante e
   incorreta.

Nenhuma URL, ID, pessoa, disciplina real, anexo ou trecho de conversa do caso
original e incluido neste repositorio.
