# Validação das ilustrações — 22/11/2026

## Reorganização dos cards

- Corrigida marcação inválida em metadados: ícones animados com wrapper `div` dentro de `p` eram separados do texto pelo parser HTML, criando células e espaços indevidos. O novo teste reproduz a passagem por HTML de servidor e confirma que o local e seu ícone permanecem no mesmo `dd`.
- Eventos usam títulos no tamanho padrão `text-base`, arte de 80/112 px, metadados agrupados e rodapé único para valores, ocupação e ações. No celular, os metadados aproveitam a largura abaixo do cabeçalho; no desktop, permanecem à direita da arte.
- Grades igualam a altura dos cards por linha, mantendo rodapés, datas e progressos alinhados na base. O conteúdo permanece agrupado no topo; no celular, cada card mantém altura natural. Marcos e reconhecimentos usam arte lateral de 64 px e colunas que se adaptam ao espaço de leitura. Exames seguem o mesmo cabeçalho dos eventos.
- Na amostra desktop, o primeiro card administrativo passou de aproximadamente 327 px para 227 px de altura, preservando as informações e a ação.
- A revisão mantém os 32 cenários de página aprovados, incluindo os dois temas, 320/1280 px e leitura dos reconhecimentos a 200%, com zero requisições externas.
- Ajuste posterior de alinhamento: eventos, marcos e reconhecimentos agora têm altura igual por linha e rodapés alinhados. A verificação compara as alturas e a posição das ações, datas ou progresso entre cards vizinhos; 32/32 cenários e 18 testes focados passaram.
- Na rechecagem após esse ajuste, a compilação passou, mas o build parou em `scripts/environment/run.ts:18` com TS2540 (atribuição a `NODE_ENV` somente leitura). Esse script não rastreado e a alteração de `package.json` surgiram em trabalho paralelo e foram preservados. O resultado anterior de build aprovado abaixo pertence à revisão precedente.

## Validação das páginas sem Appwrite

- Oito prévias de páginas completas: eventos de aluno e professor, exames e conquistas, cada uma com conteúdo e estado vazio.
- 32/32 combinações de viewport (320/1280 px) e tema (claro/escuro) passaram, sem imagens indisponíveis ou transbordamento do conteúdo.
- Zero requisições externas no navegador. Serviços e sessão usam dados sintéticos; `fetch` é bloqueado no gerador das páginas. O servidor local usa CSP com `connect-src 'none'` e `form-action 'none'`.
- A regressão de rótulos de conquistas a 200% foi reproduzida, corrigida com quebra de linha e confirmada dentro dos limites dos cards. Os indicadores de constância também adaptam o número de colunas ao espaço do texto.
- A conferência de componentes isolados cobriu seis cenários, incluindo imagens indisponíveis. Textos e ações permanecem disponíveis quando a arte falha.
- Prévia disponível enquanto o servidor estiver ativo: `http://127.0.0.1:4317`.
- Evidências e métricas: `reports/illustrations/pages/` e `reports/illustrations/pages/results.json`, ignorados pelo Git.

Essa validação comprova apresentação com as páginas e componentes reais, usando substitutos locais para sessão e serviços. Não comprova operações autenticadas, inscrição, cobrança ou disponibilidade do Appwrite.

## Revisões das imagens solicitadas

- `event-seminar`: professor com aparador e alunos em guarda, substituindo os braços erguidos da primeira versão.
- `empty-journey`: camiseta comum no personagem; dobok nas mãos, pose e bolsa preservados.
- `achievement-first-graduation`: faixa com duas voltas, nó compacto, costuras e pontas retas; removidos o laço decorativo e o medalhão.
- As três revisões foram geradas pela ferramenta integrada de imagens com os dois avatares como referências, inspecionadas e exportadas para os mesmos nomes do catálogo. Prompts e originais de referência estão registrados em `prompts.json`.
- Auditoria final: 27 WebP de 480 × 480 px, com pixels transparentes e opacos, totalizando 850.868 bytes.

## Verificação de código

| Verificação | Resultado |
| --- | --- |
| Testes focados de ilustrações, eventos, exames, conquistas e contratos compartilhados | 34/34 testes em oito arquivos passaram após a reorganização dos cards, com HTTP bloqueado |
| TypeScript | Passou |
| ESLint | Passou |
| Build de produção offline | Passou, com HTTP bloqueado; os fallbacks de configuração existentes foram usados |
| Revisão independente | Um problema de leitura de títulos/rótulos a 200% encontrado e corrigido; nenhum outro achado acionável |
| Suíte completa offline | 1.172 testes passaram e 47 falharam; sete arquivos com falhas |

Arquivos com falhas na suíte geral, que não foram alterados nesta implementação:

- `scripts/backup/drive-oauth.test.ts`: chamadas HTTP bloqueadas pela validação offline.
- `src/features/events/championship-service.test.ts` e `registration-service.test.ts`: mocks de configuração sem o export `getBeltContext`, além de uma asserção assíncrona sem `await` relatada pelo runner.
- `src/features/students/components/review-panel.test.tsx`, `graduation-card.test.tsx`, `src/features/families/components/dependent-header.test.tsx` e `src/features/billing/components/exam-result-actions.test.tsx`: expectativas de interface que falham no estado atual do checkout.

Os resultados da suíte geral não são apresentados como aprovação global do repositório. Não foi feita uma comparação de baseline isolada para atribuir todas as causas. Alterações que já existiam em notificações e serviços foram preservadas.

O primeiro build com acesso normal encontrou o limite mensal de leituras do Appwrite. Depois do aviso do usuário, a validação passou a usar as páginas sintéticas e o guard `scripts/testing/offline-network.cjs`; o build final não dependia de saída HTTP. Não houve migração, deploy, commit ou push nesta implementação.
