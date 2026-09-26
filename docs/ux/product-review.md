# Homologação — Fase 9

Data: 25/09/2026. Ambiente: `localhost:3000`, Next.js 16.3.6.

## Verificado

- Painel administrativo: sidebar segmentada, logo, conta, visão geral e ações operacionais.
- Avisos: lista recebida, filtros, leitura e separação de avisos enviados.
- Financeiro: indicadores, filtros, tabela com avatar, paginação e configuração PIX em modal.
- Turmas: listagem, disponibilidade e ações contextuais.
- Layout em 360 px e 1536 px: sem rolagem horizontal nas telas Financeiro e Avisos.
- CSP de desenvolvimento contém `unsafe-eval`; build de produção permanece sem essa diretiva.
- Manifest e service worker usam `/brand-icon.png`.

## Automação executada

- `npm test`: 155 testes aprovados.
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `E2E_BROWSER_CHANNEL=chrome npm run test:e2e`: 8 testes públicos aprovados em desktop e mobile; 6 testes autenticados ignorados porque as credenciais isoladas `E2E_*` não estão configuradas.

## Limites conhecidos

- A homologação autenticada de aluno e responsável precisa de um projeto Appwrite isolado e das credenciais `E2E_*`; ela não deve usar o projeto operacional.
- O ícone fornecido tem 96×96 px. O PWA está funcional com esse arquivo, mas uma versão quadrada de 192×192 e 512×512 melhorará a instalação em launchers que exigem maior resolução.
