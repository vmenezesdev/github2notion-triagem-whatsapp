# Metodologia

## 1. Organizar antes de interpretar

O primeiro produto e um inventario ordenado. Classificacoes ficam vazias ate
existir evidencia. Nomes repetidos devem ser tratados sem sobrescrever arquivos.

## 2. Usar sinais visuais apenas como priorizacao

Brilho, proporcao de pixels claros ou baixa saturacao podem priorizar paginas
que parecem documentos, mas nao comprovam disciplina, semestre, autoria ou tipo
de avaliacao. O pipeline publico comeca no inventario e nao inclui essa heuristica
porque nao publica as imagens que a alimentariam.

## 3. Preservar contexto em janelas pequenas

Cada anexo e ligado a uma mensagem ancora e a uma janela de mensagens vizinhas.
O objetivo e reduzir o volume de leitura sem perder a proveniencia. Mensagens
estruturadas e fixtures sinteticas representam esse contrato no showcase.

## 4. Separar evidencia de decisao

`context_hits` responde “onde encontrei o anexo?”. `discipline`, `assessment`,
`group_id` e `confidence` respondem “qual decisao foi tomada?”. `evidence`
explica por que. Misturar essas camadas torna inferencias dificeis de revisar.

## 5. Agrupar pela unidade do material

Arquivos que pertencem ao mesmo documento ou evento recebem um `group_id`.
O grupo agrega metadados e preserva a ordem original dos anexos. A pagina so e
criada depois que todos os uploads esperados possuem IDs persistidos.

## 6. Tratar incerteza como dado

Alta e media confianca podem usar o fluxo padrao. Baixa confianca, ausencia de
evidencia ou conflito de catalogo nao bloqueiam uma fila de triagem: geram uma
pagina marcada, justificativa visivel e relacao semantica vazia. O destino e uma
fila de decisao, nao um catalogo automaticamente aprovado.

## 7. Verificar o produto, nao apenas a resposta HTTP

Uma resposta 200 confirma que a API aceitou uma operacao; nao confirma que a
pagina representa o grupo esperado. A verificacao compara titulo, quantidade e
ordem dos arquivos, disciplina, tipo e data. So entao o status vira `verified`.

## 8. Manter a decisao final humana

A automacao prepara evidencia e reduz trabalho mecanico. Aceitar, corrigir ou
rejeitar permanece fora do codigo. Essa fronteira e parte do produto, nao uma
limitacao temporaria.
