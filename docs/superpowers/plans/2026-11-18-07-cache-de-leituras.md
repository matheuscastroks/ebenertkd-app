# Cache de leituras ao Appwrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todas as leituras ao Appwrite passam por um cache de dados do Next com TTL adequado e invalidação por tags, sem cachear autorização, sessão (`account.get()`), gravações nem bytes de arquivos.

**Architecture:** Um helper único `cachedRead` (`src/lib/cache/cached-read.ts`) envolve `unstable_cache` e exige `tags` e `revalidate`. As leituras cacheadas usam o cliente admin e recebem só ids/filtros serializáveis (a chave inclui todos os argumentos). Autorização (`resolveStudentProfile`, vínculo responsável-aluno, `requireCapability`, `showFinancial`) continua rodando a cada requisição, fora do cache. Gravações invalidam tags com `invalidateTags` (`updateTag` em Server Action, com fallback para `revalidateTag(tag, { expire: 0 })`).

**Tech Stack:** Next.js 16 (App Router, `unstable_cache`, `updateTag`, `revalidateTag`), node-appwrite, TypeScript estrito, Vitest.

**Spec:** pedido do dono: "cachear todas as requisições, com revalidate adequado para cada uma" (telas lentas: cada página faz várias chamadas sequenciais ao Appwrite em Frankfurt, 0,6 a 1,3 s cada).

## Global Constraints

- Next 16: `unstable_cache` ainda existe (marcado como substituído por `use cache`, mas `cacheComponents` não está ligado; mantemos `unstable_cache` por ser o padrão do repositório). `updateTag(tag)` só em Server Action; fora dela `revalidateTag(tag, { expire: 0 })`.
- `unstable_cache` serializa o retorno em JSON: nada de `Map`/`Set`/`Date` no retorno cacheado; consumidores reconstroem.
- Funções cacheadas usam `createAppwriteAdminClient()` e nunca recebem cookie, sessão, segredo nem o objeto `Profile` do ator.
- `account.get()` nunca é cacheado (logout/revogação valem na hora).
- Não cachear: gravações, downloads (documentos, comprovantes, PDF de contrato), lista de usuários do Auth (backup), login/recuperação, qualquer coisa que dependa de cookie.
- Não mudar comportamento visível nem textos.
- Código de gravação que decide com base no estado atual (ex.: `signContract`, `uploadPaymentProof`, `saveAttendanceBatch`) lê pela variante SEM cache (`readXxx`); só as telas usam a versão cacheada.
- Commits em português, convencionais, terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Menor/responsável sem vínculo continua barrado mesmo com dado do aluno em cache (autorização fora do cache).
- Perfil desativado/excluído/rebaixado não pode continuar entrando por mais que o TTL: gravações de perfil invalidam `profiles`; status != active é checado fora do cache.
- Chaves nunca compartilhadas entre usuários para dados por usuário (inbox, contagem de não lidas, preferências, cobranças, frequência).
- Dado que o usuário acabou de gravar aparece na hora (invalidação), não após o TTL (ex.: marcar aviso como lido, enviar comprovante, salvar chamada).
- Gravação feita por fora do app (Appwrite Functions/cron: cobranças, notificações, backups) só aparece após o TTL: aceito e documentado.

---

## Decisões de segurança e trade-offs (sessão)

- `getCurrentProfile` continua chamando `account.get()` a cada requisição (sem cache). Só a busca do PERFIL por `account_id` é cacheada (tag `profile-account:<accountId>` e `profiles`, 60 s).
- `status !== "active"` é verificado FORA do cache, em toda leitura, e a linha cacheada precisa ter `account_id` igual ao da conta autenticada.
- Toda gravação em `profiles` (status, papel, capacidades, vínculo, exclusão de conta, promoção de menor, ativação de responsável, dados pessoais, onboarding) invalida `profiles` (coarse de propósito: gravações de perfil são raras). Logout invalida `profile-account:<accountId>`.
- Staleness máxima aceita: 60 s para mudanças de perfil feitas fora do app (console do Appwrite, Function). Dentro do app a invalidação é imediata.
- Vínculo `guardian_student_links` NUNCA é cacheado (decide acesso). Também não é cacheado `listGuardianMinors`, só as linhas de perfil dos filhos.

## Tabela de leituras (status: [ ] pendente, [x] feito)

Legenda de TTL em segundos. Tags de gravação: ver "Invalidadores".

| # | Leitura (arquivo / função) | Usada por | Chave | TTL | Tags | Invalidada por | Status |
|---|---|---|---|---|---|---|---|
| 1 | `lib/auth/session.ts` `getProfileByAccountId` | toda página (`getCurrentProfile`), API | accountId | 60 | `profiles`, `profile-account:<acc>` | toda gravação em `profiles`, logout | [ ] |
| 2 | `features/profiles/profile-read.ts` `getProfileById` | `resolveStudentProfile`, `listGuardianMinors`, contratos | profileId | 60 | `profiles`, `profile:<id>` | idem 1 | [ ] |
| 3 | `classes/service.ts` `listTrainingClasses` | painel, turmas, financeiro, responsável | includeInactive | 300 | `training-classes` | actions de turma | [ ] |
| 4 | `classes/service.ts` `getTrainingClass` | turma, aula, painel do aluno | classId | 300 | `training-classes`, `training-class:<id>` | actions de turma | [ ] |
| 5 | `contracts/template-service.ts` `getContractTemplate` | modelo, emitir contrato | - | 300 | `contract-template` | action de modelo | [ ] |
| 6 | `contracts/template-service.ts` `listContractVersions` | modelo | templateId | 300 | `contract-template` | action de modelo | [ ] |
| 7 | `contracts/template-service.ts` `getPublishedContractVersion` | emissão de contrato (gravação: usa leitura fresca) | - | - | não cacheada (gravação) | - | [ ] |
| 8 | `billing/settings-service.ts` `getBillingSettings` | financeiro, aluno/responsável | - | 300 | `billing-settings` | action de config PIX | [ ] |
| 9 | `billing/charge-service.ts` `listCharges` (admin, todas) | financeiro, painel | filtros | 60 | `billing-charges` | actions de cobrança/pagamento/comprovante | [ ] |
| 10 | `billing/payment-service.ts` `listPayments` | financeiro, painel | - | 60 | `billing-charges` | idem 9 | [ ] |
| 11 | `billing/report-service.ts` alunos (nomes, turma) | financeiro | - | 60 | `students-all`, `billing-charges` | gravações de aluno | [ ] |
| 12 | `billing/report-service.ts` fotos + comprovantes pendentes da página | financeiro | ids visíveis | 60 | `billing-charges`, `students-all` | idem | [ ] |
| 13 | `billing/charge-service.ts` `listChargesForStudent` (leitura; autorização fora) | financeiro aluno/responsável, painéis | studentId | 60 | `charges:<sid>`, `billing-charges` | cobrança/pagamento/comprovante/exame/cancelamento | [ ] |
| 14 | `billing/proof-service.ts` `listLatestProofsForCharges` | financeiro aluno | chargeIds | 60 | `charges:<sid>` (por aluno) | envio/decisão de comprovante | [ ] |
| 15 | `billing/proof-service.ts` `listProofsForCharge` | revisão | chargeId | 60 | `billing-charges` | idem | [ ] |
| 16 | `students/service.ts` `countEnrollmentsRequiringReview` | shell do professor | - | 60 | `enrollments` | actions de matrícula | [ ] |
| 17 | `students/service.ts` `listEnrollmentsForReview` | painel, matrículas | filtros+página | 60 | `enrollments` | idem | [ ] |
| 18 | `students/service.ts` `getEnrollmentBundleByStudentId` (tela) | revisão admin, contratos | studentId | 60 | `student:<sid>` | gravações de aluno/matrícula/documento | [ ] |
| 19 | `students/service.ts` `findEnrollmentBundleByProfileId` | matrícula do aluno/responsável | profileId | 60 | `student-profile:<pid>`, `student:<sid>` | idem | [ ] |
| 20 | `students/service.ts` `listProfilePhotoDocumentIds` | responsável, painéis | profileIds | 300 | `student-profile:<pid>` (por perfil) | upload/revisão de foto | [ ] |
| 21 | `students/document-service.ts` `listEnrollmentReviews` | revisão admin | studentId | 60 | `student:<sid>` | recordReview | [ ] |
| 22 | `students/access-service.ts` `listStudentAccessProfiles` | acessos | busca+página | 60 | `student-access`, `profiles` | perfil/vínculo | [ ] |
| 23 | `students/access-service.ts` `listMinorProfiles` | acessos | - | 60 | `student-access`, `profiles` | idem | [ ] |
| 24 | `students` por profile (id do aluno) `getStudentByProfileId` | frequência, exames, contratos, cobranças | profileId | 60 | `student-profile:<pid>` | gravações de aluno | [ ] |
| 25 | `classes/attendance-history-service.ts` dados do histórico | aluno, responsável | studentId | 60 | `attendance:<sid>` | chamada salva, vínculo de turma | [ ] |
| 26 | `classes/attendance-calendar-service.ts` dados do mês | frequência aluno/responsável | studentId+mês | 60 (mês corrente) / 600 (passado) | `attendance:<sid>` | idem | [ ] |
| 27 | `classes/attendance-service.ts` `getAttendanceSheet` (tela) | chamada | lessonId | 30 | `lesson:<id>`, `class-enrollments` | salvar chamada, vínculo de turma | [ ] |
| 28 | `classes/attendance-service.ts` `getClassAttendanceSummary` | turma | classId+mês | 60 | `class-lessons:<cid>` | salvar chamada | [ ] |
| 29 | `classes/lesson-service.ts` `listLessonsForClass`/`ForDate` | turma | classId/data | 60 | `class-lessons:<cid>` | criar aula | [ ] |
| 30 | `contracts/contract-service.ts` `listStudentContracts` (autorização fora) | contratos, painéis | studentId | 60 | `student:<sid>`, `contracts` | emitir/assinar/cancelar contrato | [ ] |
| 31 | `contracts/contract-service.ts` `getContract` (tela) | contrato | contractId | 60 | `contract:<id>` | assinar/cancelar | [ ] |
| 32 | `contracts/cancellation-service.ts` `listCancellationRequests` | cancelamentos | status | 60 | `cancellations` | decidir/solicitar | [ ] |
| 33 | `contracts/renewal-service.ts` `listContractsRequiringRenewal` | contratos | data (dia) | 60 | `contracts` | contrato/matrícula | [ ] |
| 34 | `exams/service.ts` `listExamEvents` | painel, exames | - | 60 | `exam-events` | actions de exame | [ ] |
| 35 | `exams/service.ts` `getExamsOverview` | exames | - | 60 | `exam-events` | idem | [ ] |
| 36 | `exams/service.ts` `getExamEvent` / `getExamEventBundle` | evento | eventId | 60 | `exam-events`, `exam-event:<id>` | idem | [ ] |
| 37 | `exams/student-exams-service.ts` dados do aluno | exames aluno/responsável | studentId+showFinancial | 60 | `exams:<sid>`, `charges:<sid>` | exame, cobrança | [ ] |
| 38 | `notifications` `countUnreadNotifications` | shell (toda página), API unread-count | profileId | 20 | `notifications:<pid>` | criar aviso, marcar lido | [ ] |
| 39 | `notifications` `listInbox` | avisos, API inbox | profileId | 30 | `notifications:<pid>` | idem | [ ] |
| 40 | `notifications` `listSentAnnouncements` | avisos (admin) | accountId | 60 | `announcements` | publicar aviso | [ ] |
| 41 | `notifications` `listNotificationAudienceOptions` | avisos (admin) | - | 300 | `profiles`, `training-classes` | perfil/turma | [ ] |
| 42 | `notifications/preferences-service.ts` `getNotificationPreferences` | configurações, push | accountId | 300 | `notification-prefs:<acc>` | salvar preferência | [ ] |
| 43 | `notifications/push-service.ts` `hasActivePushSubscription` | configurações, avisos | profileId | 60 | `push:<pid>` | assinar/revogar | [ ] |
| 44 | `operations/service.ts` `getOperationsHealth` | sistema | - | 120 | `operations` | (cron externo: só TTL) | [ ] |
| 45 | `onboarding` (leitura vem do perfil) | - | - | - | via perfil (1) | invalida `profiles` | [ ] |

Não cacheadas (decisão): `account.get()`; `resolveStudentProfile` (vínculo `guardian_student_links` e papel); `listGuardianMinors` (links); `getChargeForActor`/`getContractForActor` (autorização por ator, usadas em gravações); `getOrCreateEnrollmentBundle` (cria linhas); `getEnrollmentBundleByStudentId` quando chamado por gravação (variante fresca); downloads de documento/comprovante/PDF; `resolveMinorEmail`/login/recuperação; `listUsers` do Auth; todo código de `saveXxx`/`createXxx`/`decideXxx`.

## Invalidadores (tags -> gravações)

Centralizadas em `src/lib/cache/tags.ts`; chamada via `invalidateTags` (`src/lib/cache/invalidate.ts`) dentro dos serviços que gravam (cobre todas as origens) e, quando já existia, também nas actions.

| Tag | Invalidada em |
|---|---|
| `profiles`, `profile-account:<acc>`, `profile:<id>` | `registerAdult/Minor`, `promoteMinorToAdult`, `enableGuardianCapability`, onboarding (salvar/pular/reiniciar), exclusão de conta (self/aluno), vínculo responsável-aluno, logout |
| `student:<sid>`, `student-profile:<pid>`, `enrollments` | `saveEnrollmentDraft`, `adminUpdateStudent`, `recordReview`, `saveFinancialReview`, `advanceToSignature`, upload/revisão de documento, `signContract`, `decideCancellation`, `renewContract`, `recordExamResult`, exclusão de aluno |
| `charges:<sid>`, `billing-charges` | criação de cobrança (mensal/exame/saída), `adjustCharge`, `decidePaymentProof`, `recordManualPayment`, `reversePayment`, `uploadPaymentProof`, cancelamento, `cancelUnpaidExamCharge` |
| `billing-settings` | `saveBillingSettings` |
| `training-classes`, `training-class:<id>` | criar/editar/ativar turma |
| `lesson:<id>`, `class-lessons:<cid>`, `attendance:<sid>`, `class-enrollments` | `createLesson`, `saveAttendanceBatch`, `ensureActiveClassEnrollment`, `endClassEnrollment` |
| `contract-template` | salvar/publicar modelo |
| `contracts`, `contract:<id>` | emitir, assinar, cancelar, renovar contrato |
| `cancellations` | solicitar/decidir cancelamento |
| `exam-events`, `exam-event:<id>`, `exams:<sid>` | criar/cancelar evento, participante, resultado |
| `notifications:<pid>`, `announcements` | `createNotification` (por destinatário), marcar lido, marcar todos |
| `notification-prefs:<acc>` | `setNotificationPreference` |
| `push:<pid>` | `savePushSubscription`, `revokePushSubscription` |

## Tarefas

### Task 1: Infraestrutura de cache (helper, tags, invalidação, guarda)

**Files:** Create `src/lib/cache/cached-read.ts`, `src/lib/cache/invalidate.ts`, `src/lib/cache/cached-read.test.ts`, `src/lib/cache/cache-guard.test.ts`; Modify `src/lib/cache/tags.ts`.

**Interfaces:** Produces `cachedRead<T>(opts: { name: string; key: readonly (string|number|boolean|null|undefined)[]; tags: string[]; revalidate: number }, load: () => Promise<T>): Promise<T>` e `invalidateTags(...tags: string[]): void`.

- [ ] Teste: `cachedRead` lança sem `tags` ou sem `revalidate` válidos; chaves de usuários diferentes não colidem; repassa `tags`/`revalidate` ao `unstable_cache`.
- [ ] Teste de guarda: varre `src/**` e falha se `unstable_cache` for usado fora de `cached-read.ts`.
- [ ] Implementar helper, `invalidateTags` e estender `CACHE_TAGS`.
- [ ] Commit.

### Task 2: Sessão e perfil

**Files:** Modify `src/lib/auth/session.ts`, `src/features/students/access.ts`, `src/features/families/service.ts`; Create `src/features/profiles/profile-read.ts`; Tests `src/lib/auth/session.test.ts`, `src/features/students/access.test.ts`.

- [ ] Testes: (a) autorização fora do cache (menor/responsável sem vínculo barrado com dado em cache); (b) invalidar a tag do perfil faz a leitura seguinte ver o status novo; (c) chaves diferentes por usuário; perfil `status != active` rejeitado mesmo vindo do cache; linha de outra conta rejeitada.
- [ ] Implementar `getProfileByAccountId`/`getProfileById` cacheados e usar em `getCurrentProfile`, `resolveStudentProfile`, `listGuardianMinors`.
- [ ] Invalidar `profiles` em todas as gravações de perfil e no logout.
- [ ] Commit.

### Task 3: Dados de referência (turmas, modelo, PIX, exames)
- [ ] Migrar `unstable_cache` existentes para `cachedRead`; novas leituras 5-8, 34-36; testes de invalidação das actions.
- [ ] Commit.

### Task 4: Operacional do professor (financeiro, matrículas, cancelamentos, acessos, sistema, avisos admin)
- [ ] Leituras 9-12, 15-17, 21-23, 32-33, 40-41, 44; paralelizar `getBillingOverview`; testes.
- [ ] Commit.

### Task 5: Por aluno (cobranças, frequência, contratos, exames, matrícula)
- [ ] Leituras 13-14, 18-20, 24-31, 37 com autorização fora do cache; variantes frescas para gravação; testes.
- [ ] Commit.

### Task 6: Notificações e preferências
- [ ] Leituras 38-39, 42-43; `/api/notifications/unread-count`; invalidação por destinatário; testes.
- [ ] Commit.

### Task 7: Auditoria de invalidação
- [ ] Varrer `src/app/actions/*`, `src/features/*/*service.ts`, `src/app/api/**` e conferir cada leitura da tabela com seus invalidadores; teste de guarda de tags.
- [ ] Commit.

### Task 8: Medição e entrega
- [ ] Medir 8 telas (segunda visita, cache quente) na main e na branch com build de produção; registrar abaixo.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build`; PR.

## Medição (segunda visita, build de produção, banco de dev, ms)

| Tela | Antes | Depois |
|---|---|---|
| (a preencher) | | |

## Status

Em andamento. Task 1 pendente.

## Registro de progresso

- 2026-11-18: plano criado, tabela de leituras e invalidadores levantada a partir de `src/features/*`, `src/app/**`.
