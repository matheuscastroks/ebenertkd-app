# Fase 5 — Aulas e exames de faixa Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** gerenciar turmas, chamadas e exames, integrando taxas e histórico de graduação.

**Architecture:** horários recorrentes originam aulas concretas. Presenças pertencem a uma aula e matrícula. Eventos de exame possuem participantes; confirmação cria cobrança e aprovação atualiza graduação de forma idempotente.

**Tech Stack:** Appwrite TablesDB Transactions, Next.js, Vitest/Testing Library.

---

## Decisões de implementação

- `training_classes` permanece como agregado simples de turma + horário recorrente; criar `classes` e `class_schedules` duplicaria dados já usados pela matrícula.
- `class_enrollments` passa a registrar o vínculo histórico. `students.training_class_id` continua como leitura rápida e será sincronizado na ativação do contrato.
- A fase será entregue em três commits independentes: núcleo de aulas, interface/histórico de chamada e exames/graduação.
- Datas de aula usam `YYYY-MM-DD` no domínio e meio-dia UTC no Appwrite para evitar mudança de dia por fuso.

## Sequência executável

### Subfase 5A — Núcleo de aulas e presença

**Arquivos:** alterar `src/lib/appwrite/ids.ts`, `scripts/appwrite/schema.ts`, `src/features/classes/types.ts`, `src/features/classes/schemas.ts`, `src/features/classes/service.ts`, `src/features/contracts/signature-service.ts`; criar `src/features/classes/lesson-service.ts`, `src/features/classes/attendance-service.ts` e testes de regras.

- [x] Adicionar localização à turma e criar `class_enrollments`, `lessons` e `attendance_records` com chaves únicas.
- [x] Sincronizar vínculo de turma somente quando a matrícula se torna ativa; encerramento preserva datas e histórico.
- [x] Criar aula regular ou reposição de forma idempotente e impedir novas aulas em turma inativa.
- [x] Validar lote de chamada completo, estados permitidos e justificativa em correções.
- [x] Registrar correções no audit log e calcular frequência usando todos os registros do período.
- [x] Testar regras, executar `infra:plan`, suíte, lint, typecheck e build.
- [x] Commit: `feat: add lesson and attendance domain` (`e752168`).

### Subfase 5B — Chamada mobile e histórico

**Arquivos:** criar rotas sob `src/app/admin/turmas/[classId]/`, ações em `src/app/actions/attendance.ts` e componentes em `src/features/classes/components/`; adicionar consultas do aluno e responsável.

- [x] Mostrar aulas de hoje, criar reposição e abrir uma chamada por URL compartilhável.
- [x] Renderizar uma linha por aluno com `Avatar` e controles grandes `Presente`, `Falta` e `Justificada`.
- [x] Salvar o lote uma vez, destacar conflitos e exigir motivo ao corrigir chamada concluída.
- [x] Exibir frequência mensal para professor e histórico isolado para aluno/responsável.
- [x] Validar controles semânticos, 360 px sem overflow, autorização e estados vazios.
- [x] Commit: `feat: add mobile attendance workflow`.

### Subfase 5C — Exames e graduação

**Arquivos:** criar `src/features/exams/`, ações e rotas sob `src/app/admin/exames/`; integrar `src/features/billing/charge-service.ts` e graduação do aluno.

- [x] Criar `exam_events`, `exam_participants` e `belt_history` com índices idempotentes.
- [x] Confirmar participante e gerar uma única `exam_fee`; tratar remoção conforme estado do pagamento.
- [x] Concluir evento transacionando resultado, histórico e faixa/GUB sem duplicação.
- [x] Implementar páginas de evento, participantes e resultado com valores em reais.
- [x] Testar cobrança, cancelamento, reexecução e ordem do histórico.
- [x] Commit: `feat: add belt exam management`.

## 5.1 Turmas e aulas

**Arquivos:** criar `src/features/classes/types.ts`, `schemas.ts`, `class-service.ts`, `attendance-service.ts`; alterar `scripts/appwrite/schema.ts`.

- [ ] Criar `classes`, `class_schedules`, `class_enrollments`, `lessons` e `attendance_records`.
- [ ] Definir nome, local, dias, início/fim, capacidade opcional e estado da turma.
- [ ] Vincular somente matrículas ativas; encerramento preserva histórico e impede novas aulas.
- [ ] Gerar aula concreta por turma+data+horário com índice único; professor também pode criar reposição.
- [ ] Registrar `present`, `absent`, `excused`; índice único por aula+matrícula e trilha de correções.

## 5.2 Interface de chamada

**Arquivos:** criar `src/app/admin/turmas/page.tsx`, `src/app/admin/turmas/[classId]/page.tsx`, `src/features/classes/components/attendance-sheet.tsx`.

- [x] Listar aulas da turma e permitir abrir a chamada do dia com os alunos ativos.
- [x] Otimizar para celular: ações grandes, progresso do lote e validação antes de confirmar.
- [x] Permitir correção posterior com motivo; aluno/responsável consulta somente o próprio histórico.
- [x] Calcular frequência sobre todos os registros carregados, sem depender da paginação visual.

## 5.3 Eventos e graduação

**Arquivos:** criar `src/features/exams/types.ts`, `exam-service.ts`, `graduation-service.ts`; páginas sob `src/app/admin/exames/`.

- [x] Criar `exam_events`, `exam_participants` e `belt_history`.
- [x] Definir evento, data, inscrições, faixa pretendida, taxa individual e estados `planned`, `confirmed`, `completed`, `cancelled`.
- [x] Ao confirmar participante, criar uma única `exam_fee` via serviço financeiro; remoção cancela apenas cobrança não paga.
- [x] Se já houver pagamento, exigir decisão administrativa registrada: crédito futuro ou manutenção do valor; não apagar o lançamento.
- [x] Aprovação no exame acrescenta histórico e atualiza faixa/GUB em uma transação; reenvio não duplica graduação.
- [x] Reprovação ou ausência preserva faixa e registra o resultado.

## Testes e aceite

- [x] Testar aula duplicada, aluno inativo, chamada em lote parcial, correção e isolamento de histórico.
- [x] Testar participante repetido, taxa única, cancelamento antes/depois do pagamento e conclusão repetida.
- [x] Testar ordem do histórico e atualização coerente de faixa/GUB.
- [x] Rodar suíte, lint, typecheck e build.
- [x] Gate: professor executa chamada e exame completos; ficha, cobrança, pagamento e graduação permanecem consistentes.
