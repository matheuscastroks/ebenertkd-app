# Fase 2 — Matrículas e documentos Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** permitir cadastro completo, upload privado e aprovação administrativa de uma matrícula.

**Architecture:** a ficha é salva como rascunho e submetida para revisão. Documentos ficam no bucket privado e metadados no banco. Aprovação é uma operação de domínio que valida ficha, documentos, contrato futuro e parâmetros financeiros.

**Tech Stack:** Next.js forms, Zod, Appwrite TablesDB/Storage, Vitest/Testing Library.

---

## 2.1 Dados e estados

**Arquivos:** criar `src/features/students/types.ts`, `schemas.ts`, `service.ts`, `enrollment-service.ts`, `document-service.ts`; alterar `scripts/appwrite/schema.ts`.

- [x] Criar `students`, `enrollments`, `student_documents` e `enrollment_reviews`.
- [x] Usar estados de matrícula `draft`, `submitted`, `under_review`, `awaiting_signature`, `active`, `paused`, `cancelled`, `awaiting_renewal`.
- [x] Registrar nome, CPF, nascimento, WhatsApp, endereço, emergência, início no taekwondo, faixa/GUB, saúde, medicamentos, alergias, lesões e contato responsável.
- [x] Manter CPF normalizado e único por academia; restringir saúde ao professor e responsáveis autorizados.
- [x] Guardar valores em centavos, vencimento solicitado/aprovado, desconto, primeiro vencimento, início e término contratual.

## 2.2 Jornada de cadastro

**Arquivos:** alterar `src/app/cadastro/page.tsx` e `src/components/student/student-health-form.tsx`; criar rotas sob `src/app/(portal)/matricula/`.

- [x] Dividir formulário em identificação, contato, saúde, taekwondo, financeiro e documentos, com indicador de progresso.
- [x] Salvar rascunho validado e permitir retomada; submissão exige todos os campos obrigatórios.
- [x] Responsável seleciona o filho antes de editar; adulto edita a própria ficha; menor só consulta dados não sensíveis.
- [x] Solicitar foto do aluno e atestado em JPEG/PNG/WebP/PDF; validar assinatura MIME, tamanho, extensão e proprietário no servidor.
- [x] Entregar download autenticado por streaming; nunca salvar URL pública permanente.

## 2.3 Revisão do professor

**Arquivos:** criar `src/app/admin/alunos/page.tsx`, `src/app/admin/alunos/[studentId]/page.tsx`, `src/features/students/components/review-panel.tsx`.

- [x] Listar e filtrar por nome, status, turma e faixa, com paginação baseada em cursor.
- [x] Mostrar pendências da ficha e documentos; permitir aprovar ou rejeitar documento com motivo obrigatório.
- [x] Confirmar valor padrão/individual, desconto, dia de vencimento, primeira cobrança e vigência.
- [x] Mover para `awaiting_signature` somente com ficha válida e documentos aprovados; ativação final ocorrerá na fase 3.
- [x] Registrar toda alteração administrativa no histórico de revisão e auditoria.

## Testes e aceite

- [ ] Testar menor e adulto, rascunho incompleto, CPF duplicado, dois filhos do mesmo responsável e isolamento familiar.
- [ ] Testar arquivo disfarçado, tamanho excessivo, acesso sem vínculo, substituição e histórico de rejeição.
- [ ] Testar transições inválidas e duplo envio; a operação deve ser idempotente.
- [x] Rodar suíte, lint, typecheck e build.
- [ ] Gate: responsável cadastra dois filhos, professor revisa cada um independentemente e libera apenas a matrícula completa para assinatura.
