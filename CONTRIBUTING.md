# Como contribuir

Este projeto privilegia mudancas pequenas, reproduziveis e auditaveis.

1. Abra uma issue explicando o caso de uso e o risco de dados pessoais.
2. Crie uma branch curta e inclua testes para mudancas de comportamento.
3. Rode `npm run check` e `npm run demo`.
4. Confirme que nenhum arquivo real, exportacao de conversa, ID de workspace,
   token, URL privada ou caminho pessoal entrou no diff.
5. Abra um pull request descrevendo contrato alterado, estrategia de retomada
   e impacto sobre a revisao humana.

Dados de teste devem ser sinteticos. Nao aceite fixtures obtidas de turmas,
grupos de mensagens ou workspaces reais, mesmo quando parecem anonimizadas.
