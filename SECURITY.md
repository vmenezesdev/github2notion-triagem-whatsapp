# Seguranca e privacidade

## Reporte

Nao abra uma issue publica contendo token, ID privado, URL de pagina, nome de
remetente ou amostra de conversa. Revogue o segredo afetado e use um canal
privado mantido pela organizacao responsavel pelo fork.

## Modelo de ameacas

- tokens e IDs reais em commits, logs ou fixtures;
- anexos contendo dados pessoais, respostas de avaliacao ou metadados;
- associacao incorreta de disciplina apresentada como fato;
- duplicacao de paginas durante retomadas;
- logs com contexto conversacional desnecessario;
- automacao acionando decisoes humanas de aceitar ou rejeitar.

O fluxo reduz esses riscos com configuracao por ambiente, fixtures sinteticas,
dry-run padrao, chave idempotente, persistencia incremental, verificacao de
leitura apos escrita e relacoes vazias quando a evidencia e insuficiente.

## Antes de publicar um fork

Execute:

```bash
git grep -nEi "ntn_|secret_|token|data_source|OneDrive|WhatsApp|pagina_notion_url"
git ls-files | grep -Ei "\.(png|jpe?g|pdf|docx|xlsx|zip)$"
```

Revise manualmente qualquer ocorrencia. Identificadores de exemplo com apenas
zeros sao intencionais; os demais devem ser removidos.
