# Validação da retomada — 2026-11-17

## Implementação integrada

As tarefas de código dos planos 01–05 foram implementadas com responsabilidades separadas, revisão cruzada de subagentes e commits diretos na main, conforme autorização do dono. O plano mestre continua sendo a referência de pendências e gates.

Foram corrigidos também: UTF-8 inválido durante edição, atributos do Radix nas abas, valor acessível de progresso, fuso de São Paulo nos treinos, erro de persistência no onboarding, confirmação de ações por teclado, IDs de formulários desktop/mobile, limpeza dos rascunhos e inscrição push no logout e recarga indevida na primeira instalação PWA.

As fontes Poppins 400/500/600 estão locais, com licença OFL. Dev e build usam Webpack devido à falha interna recorrente do Turbopack observada neste ambiente Windows. A última compilação completa com Webpack, inclusive verificação TypeScript, passou. A tentativa incremental que encontrou falha no hash do cache foi repetida após limpar somente o cache gerado; a compilação posterior também foi aprovada.

## Evidência executada

| Verificação | Resultado |
| --- | --- |
| `npm test -- --maxWorkers=4 --pool=threads` | 118 arquivos / 428 testes aprovados, com acesso a loopback para os testes OAuth |
| `npm run build` | Aprovado com Webpack |
| `npm run lint` | Aprovado |
| `npm run typecheck` | Aprovado |
| Playwright público, Edge desktop e mobile | 18 testes aprovados |
| Entrada/cadastro/recuperação, 375px claro/escuro | Capturas inspecionadas; sem transbordamento, abas contidas e primeira instalação preservando formulário |
| Guarda de design | Sem exceções por arquivo; baseline vazio |
| UTF-8 | Código da interface validado com decodificação estrita |
| Coleta de E2E autenticados | Casos coletados e tipados, sem execução contra dados reais |

Os testes públicos bloquearam toda rede externa do navegador. O backend de produção não foi usado para login ou mutações de teste. Screenshots e traces locais ficam em `test-results/`; cópias da entrada em claro/escuro e outras telas públicas estão em `reports/ui-2026-11-17/` (artefatos ignorados no Git).

## Gates que continuam abertos

- Projeto Appwrite isolado: `E2E_APPWRITE_PROJECT_ID` está vazio. Console administrativo localizado, mas a criação do projeto proposto “Ebener TKD - Homologacao”, em Frankfurt, foi bloqueada pela revisão automática por exigir autorização específica para um recurso real de nuvem potencialmente cobrável. O projeto não foi criado. A aprovação solicitada limita a criação a um ambiente gratuito, sem contratação de plano pago.
- Execução autenticada e inspeção das áreas protegidas com administrador, adulto, menor e responsável por dois filhos. Roteiro automatizado e pré-condições: [E2E isolado](../../tests/e2e/LIFECYCLE.md).
- Google Drive/OAuth e chave de backup não configurados localmente; ensaio de restauração não executado. VAPID local preenchido, sem prova de entrega push em dispositivos ou de configuração no ambiente publicado.
- Deploy da rotina diária e conferência operacional não executados. Nenhum deploy Appwrite foi feito nesta retomada.
- Revisão jurídica e preenchimento dos campos da página de privacidade; piloto com professor e duas famílias, incluindo Android/iPhone reais.

A implementação não deve ser tratada como lançamento homologado enquanto esses gates estiverem abertos. O objetivo completo continua ativo.
