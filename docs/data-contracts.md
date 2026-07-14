# Contratos de dados

## Inventario CSV

Campo obrigatorio: `filename`. A ordem das linhas define `source_order`.

## Mensagens estruturadas JSON

Cada item possui `timestamp`, `author`, `text` e `attachments[]`. O showcase nao
inclui parser de uma plataforma especifica: adapte o exportador na borda e
mantenha o nucleo independente da origem.

## Decisoes curadas JSON

Cada decisao liga `filename` a `group_id`, `discipline`, `term`, `assessment`,
`reference_date`, `confidence` e `evidence`. A ausencia de decisao produz valores
desconhecidos, nunca uma inferencia silenciosa.

## Grupo preparado

Um grupo possui metadados comuns, `low_confidence`, evidencias deduplicadas e
`attachments[]` ordenados. Os caminhos absolutos aparecem apenas em artefatos
locais ignorados pelo Git.

## Tracking CSV

| Campo | Uso |
|---|---|
| `group_id` | chave idempotente |
| `status` | maquina de estados operacional |
| `page_id`, `page_url` | retomada e auditoria |
| `upload_ids` | uploads persistidos em ordem, separados por `;` |
| `attempts`, `last_error` | diagnostico e limite operacional |
| `updated_at`, `notes` | contexto da ultima transicao |
