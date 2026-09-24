# Phase 2 Enrollments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar ficha completa, documentos privados e revisão administrativa até o estado `awaiting_signature`.

**Architecture:** perfis autenticados apontam para `students`; cada aluno possui uma matrícula corrente e documentos privados. Server Actions usam serviços Appwrite administrativos após autorização explícita do aluno, responsável ou professor. Regras puras validam completude, arquivos e transições antes de persistir.

**Tech Stack:** Next.js Server Actions, Zod, Appwrite TablesDB/Storage, Vitest.

---

### Task 1: Schema e regras

**Files:**
- Modify: `src/lib/appwrite/ids.ts`
- Modify: `scripts/appwrite/schema.ts`
- Modify: `scripts/appwrite/setup.ts`
- Create: `src/features/students/types.ts`
- Create: `src/features/students/schemas.ts`
- Create: `src/features/students/rules.ts`
- Test: `src/features/students/rules.test.ts`

- [x] Declarar `students`, `enrollments`, `student_documents` e `enrollment_reviews` com índices estáveis.
- [x] Adicionar suporte declarativo a colunas inteiras no setup.
- [x] Testar normalização de CPF, completude, assinatura de arquivo e transições de matrícula.
- [x] Implementar as regras mínimas para os testes passarem.

### Task 2: Rascunho e jornada do aluno

**Files:**
- Create: `src/features/students/access.ts`
- Create: `src/features/students/service.ts`
- Create: `src/features/students/enrollment-service.ts`
- Create: `src/app/actions/enrollment.ts`
- Create: `src/app/matricula/page.tsx`
- Create: `src/features/students/components/enrollment-form.tsx`
- Modify: `src/app/aluno/page.tsx`
- Modify: `src/app/responsavel/page.tsx`

- [x] Resolver o aluno alvo com isolamento entre conta própria e vínculo familiar.
- [x] Salvar ficha e matrícula como rascunho com revisionamento.
- [x] Exigir ficha completa na submissão e bloquear reenvio após a submissão.
- [x] Renderizar seções de identificação, contato, saúde, taekwondo, financeiro e documentos.

### Task 3: Documentos privados

**Files:**
- Create: `src/features/students/document-service.ts`
- Create: `src/app/api/student-documents/[documentId]/route.ts`
- Modify: `src/app/actions/enrollment.ts`

- [x] Validar tamanho máximo de 5 MB, MIME, extensão e bytes mágicos.
- [x] Substituir documento anterior com compensação se a persistência falhar.
- [x] Criar download autenticado após checagem de propriedade ou vínculo.
- [x] Persistir somente `file_id`, metadados e estado de revisão.

### Task 4: Revisão administrativa

**Files:**
- Create: `src/app/admin/alunos/page.tsx`
- Create: `src/app/admin/alunos/[studentId]/page.tsx`
- Create: `src/app/actions/enrollment-review.ts`
- Create: `src/features/students/components/review-panel.tsx`
- Modify: `src/features/students/enrollment-service.ts`

- [x] Listar matrículas com busca e paginação por cursor.
- [x] Aprovar ou rejeitar documentos, exigindo motivo na rejeição.
- [x] Confirmar mensalidade, desconto, vencimento e vigência.
- [x] Avançar apenas fichas completas e documentos aprovados para `awaiting_signature`.
- [x] Registrar revisão e auditoria para toda alteração administrativa.

### Task 5: Verificação e entrega

**Files:**
- Modify: `plan/fase-2-matriculas.md`

- [x] Aplicar o schema no Appwrite Cloud.
- [x] Executar `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- [x] Criar commits separados para schema/domínio, jornada/documentos e revisão administrativa.
