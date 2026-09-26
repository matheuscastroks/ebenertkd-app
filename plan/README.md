# Plano mestre de implementação

Este diretório transforma o planejamento do sistema da academia em fases executáveis. O produto será um PWA Next.js hospedado no Appwrite Cloud, com Appwrite Auth, TablesDB, Storage, Functions e Messaging. A implementação prioriza fluxos funcionais antes do refinamento visual.

## Ordem de execução

| Fase | Entrega | Depende de | Gate de saída |
| --- | --- | --- | --- |
| [0](./fase-0-fundacao.md) | Fundação Appwrite e automação | — | Ambiente reproduzível e provas técnicas aprovadas |
| [1](./fase-1-acesso.md) | Login, papéis e vínculos familiares | 0 | Isolamento entre perfis testado |
| [2](./fase-2-matriculas.md) | Ficha, documentos e aprovação | 1 | Matrícula completa e aprovável |
| [3](./fase-3-contratos.md) | Contratos, assinatura e cancelamento | 2 | PDF imutável e regras de vigência testadas |
| [4](./fase-4-financeiro.md) | Mensalidades, PIX e comprovantes | 3 | Painel e conciliação consistentes |
| [5](./fase-5-aulas-exames.md) | Turmas, presença e exames | 2 e 4 | Chamada e exame completos |
| [6](./fase-6-pwa-notificacoes.md) | PWA, avisos e push | 1 e 4 | Lembretes idempotentes em dispositivos reais |
| [7](./fase-7-backup-operacao.md) | Backup, restauração e observabilidade | 0–6 | Restauração ensaiada com sucesso |
| [8](./fase-8-homologacao.md) | Segurança, piloto e lançamento | 0–7 | Professor opera sem console técnico |
| [9](./fase-9-ui-ux.md) | Refinamento de experiência | 8 | Fluxos do piloto melhorados sem regressão |
| [10](./fase-10-jornada-gamificada.md) | Jornada gamificada, check-in e aprendizagem | 5, 6 e 9 | Ciclo piloto justo, auditável e sem rastreamento contínuo |

O contrato transversal de componentes e as subfases de correção estão em [Refinamento shadcn/ui](./refinamento-shadcn-ui.md). Ele é obrigatório para qualquer tela criada ou alterada, independentemente da fase funcional em execução.

## Regras de execução

A próxima prioridade de experiência é a [Revisão geral de produto e UX](./revisao-geral-produto-ux.md), organizada em R0–R6: baseline, jornadas, wireframes, componentes, implementação, acessibilidade e piloto. Ela complementa a [Fase 9 — Identidade e experiência de produto](./fase-9-produto-identidade-experiencia.md) e deve preceder a Jornada gamificada. A [referência de marca](../docs/ux/brand-reference.md) registra a decisão vigente: **Neutral padrão do shadcn e Poppins**; propostas anteriores de paleta e fonte ficam como histórico.

- Trabalhar uma fase por vez e marcar os checkboxes somente após validação.
- Antes de criar HTML ou componente visual próprio, consultar a matriz shadcn/ui; toda exceção deve explicar por que a primitive instalada não atende ao caso.
- Manter primitives em `src/components/ui/`, composições reutilizáveis em `src/components/shared/` e regras de domínio em `src/features/`.
- Armazenar valores monetários internamente em centavos, mas sempre receber e exibir reais na interface (`150` = `R$ 150,00`); usar datas de negócio em `America/Sao_Paulo`.
- Colocar autorização e regras sensíveis no servidor; componentes não usam chave administrativa.
- Toda operação crítica deve ser idempotente, auditável e coberta por teste de sucesso e falha.
- Não antecipar escopo: integração bancária, WhatsApp, múltiplas academias e operação totalmente offline ficam fora deste ciclo.
- Encerrar cada subfase com `npm test`, `npm run lint` e `npm run build`; registrar exceções no próprio arquivo da fase.

## Estado

O código funcional das fases 0–6 está implementado. A Fase 7 possui backup, restore e painel implementados, mas seu gate operacional aguarda credenciais do Drive e ensaio de restauração. A Fase 8 está em homologação automatizada; dispositivos, revisão jurídica e piloto permanecem necessariamente humanos.

- [ ] Fase 0
- [ ] Fase 1
- [ ] Fase 2
- [ ] Fase 3
- [ ] Fase 4
- [ ] Fase 5
- [ ] Fase 6
- [ ] Fase 7
- [ ] Fase 8
- [x] Fase 9
- [ ] Fase 10
