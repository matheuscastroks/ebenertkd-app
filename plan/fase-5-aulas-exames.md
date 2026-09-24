# Fase 5 — Aulas e exames de faixa Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** gerenciar turmas, chamadas e exames, integrando taxas e histórico de graduação.

**Architecture:** horários recorrentes originam aulas concretas. Presenças pertencem a uma aula e matrícula. Eventos de exame possuem participantes; confirmação cria cobrança e aprovação atualiza graduação de forma idempotente.

**Tech Stack:** Appwrite TablesDB Transactions, Next.js, Vitest/Testing Library.

---

## 5.1 Turmas e aulas

**Arquivos:** criar `src/features/classes/types.ts`, `schemas.ts`, `class-service.ts`, `attendance-service.ts`; alterar `scripts/appwrite/schema.ts`.

- [ ] Criar `classes`, `class_schedules`, `class_enrollments`, `lessons` e `attendance_records`.
- [ ] Definir nome, local, dias, início/fim, capacidade opcional e estado da turma.
- [ ] Vincular somente matrículas ativas; encerramento preserva histórico e impede novas aulas.
- [ ] Gerar aula concreta por turma+data+horário com índice único; professor também pode criar reposição.
- [ ] Registrar `present`, `absent`, `excused`; índice único por aula+matrícula e trilha de correções.

## 5.2 Interface de chamada

**Arquivos:** criar `src/app/admin/turmas/page.tsx`, `src/app/admin/turmas/[classId]/page.tsx`, `src/features/classes/components/attendance-sheet.tsx`.

- [ ] Listar turmas de hoje e permitir abrir chamada com os alunos ativos.
- [ ] Otimizar para celular: ações grandes, salvar em lote e mostrar conflitos antes de confirmar.
- [ ] Permitir correção posterior com motivo; aluno/responsável consulta somente o próprio histórico.
- [ ] Calcular presença mensal e frequência por período sem usar dados limitados por paginação visual.

## 5.3 Eventos e graduação

**Arquivos:** criar `src/features/exams/types.ts`, `exam-service.ts`, `graduation-service.ts`; páginas sob `src/app/admin/exames/`.

- [ ] Criar `exam_events`, `exam_participants` e `belt_history`.
- [ ] Definir evento, data, inscrições, faixa pretendida, taxa individual e estados `planned`, `confirmed`, `completed`, `cancelled`.
- [ ] Ao confirmar participante, criar uma única `exam_fee` via serviço financeiro; remoção cancela apenas cobrança não paga.
- [ ] Se já houver pagamento, exigir decisão administrativa registrada: crédito futuro ou manutenção do valor; não apagar o lançamento.
- [ ] Aprovação no exame acrescenta histórico e atualiza faixa/GUB em uma transação; reenvio não duplica graduação.
- [ ] Reprovação ou ausência preserva faixa e registra o resultado.

## Testes e aceite

- [ ] Testar aula duplicada, aluno inativo, chamada em lote parcial, correção e isolamento de histórico.
- [ ] Testar participante repetido, taxa única, cancelamento antes/depois do pagamento e conclusão repetida.
- [ ] Testar ordem do histórico e atualização coerente de faixa/GUB.
- [ ] Rodar suíte, lint, typecheck e build.
- [ ] Gate: professor executa chamada e exame completos; ficha, cobrança, pagamento e graduação permanecem consistentes.

