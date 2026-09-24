# Fase 10 — Jornada gamificada, check-in e aprendizagem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar uma jornada motivadora por turma que reconheça presença, estudo e contribuição comunitária, sem transformar XP em aprovação automática no exame nem usar rastreamento contínuo.

**Architecture:** presença, aprendizagem, XP e prontidão serão domínios separados, ligados por eventos idempotentes. O check-in PWA usa localização somente após ação do aluno, dentro da janela da aula, e produz uma solicitação que o professor confirma; lembretes em segundo plano são baseados no horário, pois a Web Platform não oferece geofencing confiável com o PWA fechado. O currículo e os critérios de exame serão configuráveis para refletir a metodologia real da academia.

**Tech Stack:** Next.js 16, React 19, TypeScript, Appwrite TablesDB/Functions/Messaging, Web Geolocation API, YouTube IFrame API, shadcn/ui, Sonner, Vitest, Testing Library e Playwright.

---

## 1. Decisões de produto

### 1.1 Princípios

- Chamar a área do aluno de **Minha Jornada** e o ciclo semestral de **Caminho da Faixa**.
- Separar três números:
  - **XP:** reconhecimento motivacional acumulado no ciclo.
  - **Frequência:** dado objetivo obtido das chamadas concluídas.
  - **Prontidão:** cumprimento de critérios definidos pelo professor para o próximo exame.
- XP nunca aprova exame, altera faixa, compensa falta técnica ou compra vantagem.
- A decisão final de participação no exame permanece com o professor e deve ser auditável.
- Não retirar XP por falta, doença ou ausência justificada. Usar reforço positivo e recuperação de sequência.
- Não misturar situação financeira no percentual técnico. Pendências financeiras podem aparecer ao professor como informação administrativa separada.
- Menores não terão nome completo, posição ou localização expostos publicamente. Ranking usa primeiro nome + inicial e exige autorização do responsável para visibilidade aos colegas.

### 1.2 Fontes e implicações

- A Kukkiwon reconhece Taegeuk 1–8 para praticantes Geup e Koryo em diante para Dan. A referência brasileira consultada relaciona fundamentos/Saju à branca e Taegeuk Il Jang até Pal Jang à progressão colorida; a academia, porém, usa cinza, laranja e tons intermediários. Portanto, a associação graduação–conteúdo não será hardcoded.
- A API de geolocalização exige HTTPS e permissão explícita. O PWA pode consultar `navigator.geolocation` com a tela ativa, mas o service worker não mantém rastreamento contínuo nem geofencing portátil com o aplicativo fechado.
- Gamificação tende a ajudar atividade física no curto prazo, mas competição pura pode desmotivar quem fica no fim. A UI deve priorizar progresso pessoal, times e conquistas antes do ranking absoluto.
- O YouTube permite detectar `YT.PlayerState.ENDED`, mas esse evento não prova domínio técnico. Assistir gera pouco XP; questionário e validação presencial do professor têm peso maior.

Referências:

- [Poomsae por faixa — Taekwondo Brasil](https://www.taekwondobrasil.com.br/o-que-e-o-poomsae-no-taekwondo/)
- [Pesquisa Kukkiwon sobre poomsae reconhecido](https://research.kukkiwon.or.kr/society/researchKukkiwon/homepage/boardMedia/11584)
- [Regras de Poomsae da World Taekwondo](https://www.worldtaekwondo.org/att_file/documents/Poomsae_Competition_Rules_and_Interpretation_%28In_force_as_of_June_14_2024%29.pdf)
- [Geolocation API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Operações PWA em segundo plano — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Modo de privacidade do player YouTube](https://support.google.com/youtube/answer/171780)
- [Revisão sistemática de gamificação e atividade física](https://pmc.ncbi.nlm.nih.gov/articles/PMC8767479/)
- [Consentimento específico e revogável na LGPD](https://www.gov.br/mdr/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-e-respostas-frequentes-sobre-lgpd/o-tratamento-de-dados-pessoais)

## 2. Escopo funcional

### 2.1 Jornada do aluno

- Ver graduação atual, próximo objetivo, XP do ciclo e critérios de prontidão.
- Receber lembrete de aula por horário e abrir o check-in.
- Consultar sequência de presenças, conquistas e histórico de XP.
- Assistir aos poomsaes liberados para sua graduação e revisar anteriores.
- Responder uma verificação curta após cada módulo.
- Ver ranking da própria turma e optar por não aparecer para colegas.
- Compartilhar um convite pessoal sem fornecer agenda de contatos ao sistema.

### 2.2 Operação do professor

- Confirmar o endereço inicial `Rua Abélia, 197 — Jardim Guanabara` por pino no mapa antes de salvar latitude e longitude.
- Configurar raio, precisão máxima, antecedência e tolerância de atraso por unidade/turma. A janela efetiva sempre é calculada a partir da aula concreta vinculada ao aluno, nunca por um horário global.
- Conciliar solicitações de check-in na chamada existente.
- Configurar ciclos, regras de XP, catálogo de graduações, conteúdos e critérios de exame.
- Validar competências técnicas e decidir elegibilidade para exame.
- Consultar ranking com explicação da pontuação e reverter eventos incorretos sem apagar histórico.

### 2.3 Fora do primeiro ciclo

- Geofencing real com aplicativo fechado, rastreamento de trajeto, reconhecimento facial, biometria, contagem de passos e integração com relógios.
- Chat livre entre menores, compra de XP, recompensas financeiras e ranking entre turmas de idades muito diferentes.
- Download de vídeos do YouTube ou tentativa de impedir avanço manual do player.

## 3. Modelo motivacional

### 3.1 Fontes padrão de XP

| Evento confirmado | XP inicial | Regra |
| --- | ---: | --- |
| Presença confirmada | 100 | Uma vez por aula concluída |
| Sequência de 3 aulas | 25 | Uma vez por sequência |
| Sequência de 6 aulas | 50 | Substitui o bônus de 3, sem duplicar |
| Sequência de 12 aulas | 100 | Reinicia somente após falta não justificada |
| Vídeo concluído | 10 | Primeira conclusão por aula digital |
| Questionário aprovado | 30 | Primeira aprovação; tentativas extras não geram XP |
| Competência validada pelo professor | 100 | Uma vez por competência e graduação |
| Espírito de equipe | 25 | Concedido pelo professor, máximo semanal configurável |
| Indicação convertida | 150 | Após matrícula e contrato ativos |
| Indicado ativo por 30 dias | 150 | Evento separado e idempotente |

Faltas e justificativas valem zero, nunca pontuação negativa. Regras ficam versionadas e editáveis apenas para ciclos futuros; alterar uma regra não reescreve o placar histórico.

### 3.2 Prontidão para exame

O professor configura pesos e bloqueadores por graduação. Padrão inicial:

```ts
type ReadinessPolicy = {
  minimumDaysInRank: number;       // padrão: 150
  minimumAttendanceRate: number;  // padrão: 0.75
  requiredLessonCompletion: number; // padrão: 1.0
  requiredSkillIds: string[];
  weights: {
    attendance: number; // padrão: 40
    learning: number;   // padrão: 25
    skills: number;     // padrão: 35
  };
};
```

- Exibir `Em progresso`, `Critérios cumpridos` ou `Convidado para o exame`, nunca “chance de aprovação”.
- Frequência só considera aulas concluídas durante o ciclo e após entrada do aluno na turma.
- Atestado/ausência justificada não dá presença nem XP, mas pode ser excluído do denominador se essa for a política escolhida pelo professor.
- Prontidão calculada é recomendação; convite é um ato administrativo explícito.

### 3.3 Ranking saudável

- Temporadas coincidem com ciclos de exame, normalmente seis meses.
- Mostrar primeiro o progresso pessoal, depois pódio e ranking.
- Exibir até três vizinhos acima/abaixo do aluno; a tabela completa fica em uma ação secundária.
- Oferecer ranking semanal, do ciclo e conquistas cooperativas da turma.
- Desempate: mais presenças, mais competências validadas, data mais antiga de alcance do XP.
- Aluno oculto aparece como “Participante” para colegas, mas continua visível ao professor e ao responsável.
- Criar conquistas de constância, estudo, ajuda e retorno; evitar medalhas ligadas a pagamento ou características pessoais.

## 4. Arquitetura de dados

### 4.1 Novas tabelas Appwrite

Adicionar em `src/lib/appwrite/ids.ts` e `scripts/appwrite/schema.ts`:

```ts
gamificationCycles: "gamification_cycles",
graduationCatalog: "graduation_catalog",
learningModules: "learning_modules",
learningLessons: "learning_lessons",
lessonProgress: "lesson_progress",
skillDefinitions: "skill_definitions",
skillAssessments: "skill_assessments",
checkinRequests: "checkin_requests",
xpRules: "xp_rules",
xpEvents: "xp_events",
studentCycleScores: "student_cycle_scores",
achievements: "achievements",
studentAchievements: "student_achievements",
examReadiness: "exam_readiness",
referralInvites: "referral_invites",
referralConversions: "referral_conversions",
academyLocations: "academy_locations"
```

Índices únicos obrigatórios:

- ciclo: `training_class_id + starts_at`;
- progresso: `student_id + learning_lesson_id`;
- check-in: `student_id + lesson_id`;
- evento XP: `student_id + idempotency_key`;
- placar: `student_id + cycle_id`;
- conquista: `student_id + achievement_id + cycle_id`;
- prontidão: `student_id + cycle_id + target_graduation_id`;
- conversão: `referral_invite_id + referred_student_id`.

### 4.2 Contratos de domínio

Criar módulos pequenos e coesos:

```text
src/features/gamification/
  types.ts
  xp-rules.ts
  xp-service.ts
  leaderboard-service.ts
  achievement-service.ts
  readiness-rules.ts
  readiness-service.ts
  referral-service.ts
  components/
src/features/checkin/
  types.ts
  geo-rules.ts
  checkin-service.ts
  components/
src/features/learning/
  types.ts
  curriculum-service.ts
  progress-service.ts
  youtube.ts
  components/
```

Eventos de XP formam um livro-razão append-only:

```ts
type XpEvent = {
  student_id: string;
  cycle_id: string;
  source_type: "attendance" | "streak" | "lesson" | "quiz" | "skill" | "community" | "referral" | "reversal";
  source_id: string;
  idempotency_key: string;
  points: number;
  rule_version: number;
  occurred_at: string;
  reversed_event_id?: string | null;
};
```

`student_cycle_scores` é projeção reconstruível. Toda alteração grava `xp_events` e atualiza a projeção na mesma transação. Correções criam evento de reversão, sem editar ou apagar o evento original.

### 4.3 Migração de graduações

O modelo atual suporta apenas GUB 9–1 e não representa branca, Poom ou Dan. Executar migração em duas etapas:

1. Criar catálogo configurável com `name`, `short_name`, `system`, `rank_number`, `order`, `color_token`, `required_module_id` e `active`.
2. Adicionar `current_graduation_id` a `students` e `previous_graduation_id`/`new_graduation_id` a `belt_history`, mantendo `current_belt` e `gub` para compatibilidade durante uma versão.

Seed sugerido para validação do professor, não regra definitiva:

| Graduação local atual | Conteúdo sugerido |
| --- | --- |
| Branca / introdutória | Saju tirigui e Saju are maki |
| Cinza, 9º GUB | Fundamentos e Saju definidos pelo professor |
| Amarela, 8º GUB | Taegeuk Il Jang |
| Laranja, 7º GUB | Taegeuk I Jang |
| Verde, 6º GUB | Taegeuk Sam Jang |
| Verde escura, 5º GUB | Taegeuk Sa Jang |
| Azul, 4º GUB | Taegeuk Oh Jang |
| Azul escura, 3º GUB | Taegeuk Yuk Jang |
| Vermelha, 2º GUB | Taegeuk Chil Jang |
| Vermelha escura, 1º GUB | Taegeuk Pal Jang |
| Preta / 1º Dan | Koryo |

## 5. Check-in por localização

### 5.1 Fluxo viável no PWA

1. Uma Function `class-reminders`, executada a cada cinco minutos, consulta as aulas concretas da próxima faixa de tempo, cruza cada uma com `class_enrollments` ativos e envia o push no instante derivado de `lesson_date + start_time` em `America/Sao_Paulo`.
2. Para uma aula das 19h, a política padrão gera uma janela das 18h45 às 19h30: 15 minutos de antecedência e 30 minutos de tolerância após o início. Para uma aula das 20h, a mesma regra gera 19h45–20h30 automaticamente.
3. O push informa a turma e o horário: “Sua aula das 19h começou. Abra o app para fazer check-in”. Não inclui localização nem informação sensível na tela bloqueada.
4. Ao abrir `/aluno/jornada/check-in?lesson={lessonId}`, o servidor confirma que aquela aula pertence a uma turma na qual o aluno possui vínculo ativo e que o horário atual está dentro da janela calculada.
5. O aluno toca em **Verificar localização** na primeira utilização; depois da permissão, a tela pode iniciar a busca automaticamente quando for aberta por um push de aula elegível.
6. Enquanto a tela estiver visível e a janela permanecer aberta, o cliente usa uma observação curta da posição para lidar com o aluno que ainda está chegando. A observação termina no primeiro resultado aceito, ao ocultar/fechar a tela ou ao expirar a janela.
7. O cliente envia latitude, longitude, `accuracy`, nonce e identificador da aula.
8. O servidor usa seu próprio relógio, recalcula a janela pela aula, mede distância por Haversine e valida raio, precisão e nonce.
9. O servidor descarta as coordenadas exatas e persiste apenas distância arredondada, precisão arredondada, resultado, horário e motivo.
10. O professor vê a solicitação pré-selecionada na chamada e confirma a presença ao concluir a aula.
11. A interface pode mostrar “100 XP pendentes” imediatamente; somente a chamada concluída transforma isso em XP definitivo.

Configuração inicial sugerida: raio de 120 m, precisão máxima de 80 m, abertura 15 minutos antes e fechamento 30 minutos após o início. Antecedência e tolerância são propriedades da turma ou da unidade, mas os horários absolutos são sempre derivados de cada `Lesson`. Reposição, cancelamento ou alteração de horário usam os dados da aula concreta e invalidam qualquer agendamento anterior.

### 5.2 Cálculo dinâmico da janela

Criar uma função pura usada tanto pelo agendador quanto pelo endpoint de check-in:

```ts
type CheckinWindowPolicy = {
  opensBeforeMinutes: number; // padrão: 15
  closesAfterStartMinutes: number; // padrão: 30
  timeZone: "America/Sao_Paulo";
};

type CheckinWindow = {
  opensAt: string;
  closesAt: string;
};

function calculateCheckinWindow(
  lessonDate: string,
  lessonStartTime: string,
  policy: CheckinWindowPolicy,
): CheckinWindow;
```

- Usar `Lesson.lesson_date` e `Lesson.start_time`, não apenas o horário recorrente de `TrainingClass`.
- Deduplicar o lembrete por `lesson_id + account_id + reminder_stage`; reexecuções do cron não podem repetir o push.
- Resolver a aula pelo vínculo ativo do aluno; conhecer um `lessonId` não autoriza check-in.
- Se o aluno estiver em duas turmas com janelas simultâneas, exibir as duas aulas e exigir seleção explícita.
- Aula cancelada fecha imediatamente a janela e cancela o lembrete ainda não entregue.
- Mudança de horário recalcula push, nonce e janela; o agendamento antigo deixa de ser válido.
- O servidor interpreta datas em `America/Sao_Paulo` e compara com horário de servidor.

### 5.3 Regras antifraude e privacidade

- Não confiar no relógio do aparelho, IP, estado do botão ou distância calculada no cliente.
- Nonce assinado, uso único e validade de cinco minutos.
- Limitar tentativas por conta/aula e registrar auditoria de recusas sem armazenar trajetória.
- GPS simulado continua possível na Web; professor é a autoridade final.
- `watchPosition` só pode existir na tela visível de check-in, durante a janela da aula selecionada, com descarte imediato das leituras recusadas; nunca executá-lo no service worker ou fora desse fluxo.
- Permissão negada nunca impede chamada manual.
- Para maior garantia em uma fase futura, combinar localização com QR rotativo exibido no dojang.
- Geofencing verdadeiro em segundo plano exige avaliar aplicativo nativo/Capacitor; não prometer essa capacidade no PWA.

## 6. Conteúdo e aprendizagem

### 6.1 Catálogo

- O professor cadastra módulo, graduação, ordem, objetivo, vídeo, duração estimada, pontos-chave e questionário.
- Usar somente `videoId`; gerar embed em `https://www.youtube-nocookie.com/embed/{videoId}`.
- O aluno acessa conteúdos da graduação atual e revisões anteriores. Próxima graduação aparece bloqueada como prévia, se o professor habilitar.
- A playlist informada será importada como rascunho e cada item deverá ser associado manualmente a uma graduação antes de publicar.

### 6.2 Evidências de aprendizagem

- `started`: player iniciou.
- `watched`: player chegou a `ENDED`; concede 10 XP uma vez.
- `quiz_passed`: atingiu a nota configurada; concede 30 XP uma vez.
- `skill_validated`: professor confirmou execução presencial; concede 100 XP e atende critério técnico.
- Reassistir e repetir questionário melhora domínio, mas não cultiva XP infinito.

## 7. Experiência e interface

### 7.1 Direção visual

Usar uma estética **dojang contemporâneo**: fundo claro quente, carvão, vermelho de selo e a cor da faixa atual como acento. A assinatura visual é uma trilha vertical inspirada no caminho do poomsae, com nós para presença, estudo e competências. Evitar estética de cassino, gradientes roxos genéricos e animações contínuas.

### 7.2 Rotas

```text
/aluno/jornada
/aluno/jornada/ranking
/aluno/jornada/treinos
/aluno/jornada/treinos/[lessonId]
/aluno/jornada/conquistas
/aluno/jornada/check-in
/responsavel/dependentes/[profileId]/jornada
/admin/engajamento
/admin/engajamento/ciclos
/admin/engajamento/conteudos
/admin/engajamento/criterios
/admin/turmas/[classId]/ranking
```

Adicionar `Minha jornada` à sidebar de aluno e uma versão somente leitura à página do dependente. Professor recebe o grupo `Engajamento`, com ciclos, conteúdos e critérios como subitens.

### 7.3 Composição da tela principal

1. `JourneyHero`: avatar, faixa atual, XP, nível da jornada e CTA contextual.
2. `ReadinessCard`: `Progress` geral e `Accordion` com critérios; bloqueadores usam `Badge` e `Tooltip`.
3. `NextClassCard`: horário, turma e botão de check-in durante a janela.
4. `StreakCard`: constância atual e opção de recuperação após falta justificada.
5. `LearningPath`: trilha dos poomsaes com estados bloqueado, disponível e concluído.
6. `AchievementShelf`: últimas conquistas; `Dialog` mostra descrição e data.
7. `ClassPodium`: três primeiros com `Avatar`; botão abre ranking completo.
8. `ReferralCard`: código/link e regras transparentes do bônus.

Usar componentes shadcn racionalmente:

- `Card`, `Tabs`, `Avatar`, `Badge`, `Progress`, `Accordion`, `Separator`, `Tooltip`, `Dialog`, `Drawer`, `Switch`, `Skeleton` e `Sonner`.
- `Skeleton` somente nos dados dinâmicos; sidebar e estrutura permanecem estáveis.
- `Sonner` para sucesso/erro de check-in, XP e convite. Critérios permanentes ficam no conteúdo, não em toast.
- Pódio deve ter lista semântica equivalente; cor nunca é o único indicador.
- Celebração curta somente ao conquistar nível/faixa, respeitando `prefers-reduced-motion`.

## 8. Plano de implementação por entregas

### Entrega 10A — Fundação, catálogo e ciclos

**Files:**
- Modify: `src/lib/appwrite/ids.ts`
- Modify: `scripts/appwrite/schema.ts`
- Modify: `scripts/appwrite/schema.test.ts`
- Create: `src/features/gamification/types.ts`
- Create: `src/features/gamification/xp-rules.ts`
- Create: `src/features/gamification/xp-rules.test.ts`
- Create: `src/features/gamification/readiness-rules.ts`
- Create: `src/features/gamification/readiness-rules.test.ts`
- Create: `src/features/learning/types.ts`
- Modify: `src/features/students/types.ts`
- Modify: `src/features/students/options.ts`

- [ ] Escrever testes que exijam IDs, atributos, índices únicos e permissões fechadas das novas tabelas.
- [ ] Executar `npm test -- scripts/appwrite/schema.test.ts` e confirmar falha pelos IDs ausentes.
- [ ] Adicionar tabelas e tipos, incluindo catálogo de graduação e compatibilidade temporária com GUB.
- [ ] Implementar funções puras `calculateXpAward`, `calculateReadiness` e `resolveRankTie` com versões de regra.
- [ ] Testar idempotência, reversão, empate, falta justificada e ausência de pontuação negativa.
- [ ] Executar `npm run infra:plan`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`.
- [ ] Commit: `feat: add gamification and readiness foundation`.

### Entrega 10B — Livro-razão de XP e ranking

**Files:**
- Create: `src/features/gamification/xp-service.ts`
- Create: `src/features/gamification/leaderboard-service.ts`
- Create: `src/features/gamification/achievement-service.ts`
- Create: `src/features/gamification/xp-service.test.ts`
- Modify: `src/features/classes/attendance-service.ts`
- Modify: `src/features/exams/service.ts`
- Create: `src/app/admin/turmas/[classId]/ranking/page.tsx`
- Create: `src/features/gamification/components/class-podium.tsx`
- Create: `src/features/gamification/components/leaderboard-table.tsx`

- [ ] Escrever testes de evento único por presença, correção com reversão e reconstrução da projeção.
- [ ] Integrar XP após commit da chamada, nunca antes da conclusão da aula.
- [ ] Criar consulta paginada por turma/ciclo sem buscar além de 500 linhas silenciosamente.
- [ ] Implementar pódio e ranking com anonimização, opt-out e desempate determinístico.
- [ ] Validar com alunos empatados, aluno transferido, chamada corrigida e ciclo encerrado.
- [ ] Commit: `feat: add class XP ledger and leaderboard`.

### Entrega 10C — Check-in consciente por localização

**Files:**
- Create: `src/features/checkin/types.ts`
- Create: `src/features/checkin/geo-rules.ts`
- Create: `src/features/checkin/geo-rules.test.ts`
- Create: `src/features/checkin/checkin-service.ts`
- Create: `src/app/actions/checkin.ts`
- Create: `src/app/aluno/jornada/check-in/page.tsx`
- Create: `src/features/checkin/components/checkin-card.tsx`
- Modify: `src/features/classes/components/attendance-sheet.tsx`
- Modify: `src/features/notifications/push-service.ts`
- Modify: `src/lib/appwrite/ids.ts`
- Modify: `scripts/appwrite/deploy-function.ts`
- Create: `appwrite/functions/class-reminders/package.json`
- Create: `appwrite/functions/class-reminders/src/main.js`
- Create: `appwrite/functions/class-reminders/src/reminder-rules.js`
- Create: `appwrite/functions/class-reminders/src/reminder-rules.test.js`

- [ ] Testar Haversine, borda do raio, baixa precisão, janelas dinâmicas para aulas em horários diferentes, reposição, mudança de horário, nonce expirado, replay, sobreposição de turmas e aluno sem vínculo.
- [ ] Implementar endpoint servidor que recebe coordenadas apenas para validação e persiste prova minimizada.
- [ ] Criar UI que solicita permissão somente após clique e explica finalidade/retenção antes do prompt.
- [ ] Exibir check-ins pendentes na chamada sem marcar automaticamente `present`.
- [ ] Criar a Function `class-reminders` com cron `*/5 * * * *`, envio Web Push/VAPID já adotado pelo projeto e chave idempotente por aula, conta e etapa.
- [ ] Agendar push por `Lesson` e vínculo ativo, usando `lesson_date + start_time` em `America/Sao_Paulo`; ao abrir, revalidar aula, janela dinâmica e localização.
- [ ] Testar Android/Chrome e iPhone/Safari instalado no endereço real, incluindo permissão negada e GPS impreciso.
- [ ] Commit: `feat: add privacy-aware class check-in`.

### Entrega 10D — Trilha de poomsae

**Files:**
- Create: `src/features/learning/curriculum-service.ts`
- Create: `src/features/learning/progress-service.ts`
- Create: `src/features/learning/youtube.ts`
- Create: `src/features/learning/progress-service.test.ts`
- Create: `src/features/learning/components/youtube-player.tsx`
- Create: `src/features/learning/components/learning-path.tsx`
- Create: `src/app/aluno/jornada/treinos/page.tsx`
- Create: `src/app/aluno/jornada/treinos/[lessonId]/page.tsx`
- Create: `src/app/admin/engajamento/conteudos/page.tsx`
- Create: `src/app/actions/learning.ts`

- [ ] Testar liberação por graduação, acesso a revisão, bloqueio da próxima faixa e conclusão única.
- [ ] Importar a playlist como rascunho, validar IDs e impedir publicação sem graduação associada.
- [ ] Usar player `youtube-nocookie.com`, proporção fixa e placeholder para evitar layout shift.
- [ ] Registrar `ENDED` como vídeo visto e aplicar questionário curto validado no servidor.
- [ ] Integrar XP idempotente para vídeo, questionário e validação técnica.
- [ ] Testar vídeo removido, embed desativado, rede lenta e aluno menor.
- [ ] Commit: `feat: add belt-based poomsae learning path`.

### Entrega 10E — Prontidão e jornada do aluno

**Files:**
- Create: `src/features/gamification/readiness-service.ts`
- Create: `src/features/gamification/components/journey-dashboard.tsx`
- Create: `src/features/gamification/components/readiness-card.tsx`
- Create: `src/features/gamification/components/achievement-shelf.tsx`
- Create: `src/app/aluno/jornada/page.tsx`
- Create: `src/app/aluno/jornada/ranking/page.tsx`
- Create: `src/app/aluno/jornada/conquistas/page.tsx`
- Create: `src/app/responsavel/dependentes/[profileId]/jornada/page.tsx`
- Modify: `src/lib/navigation/routes.ts`

- [ ] Escrever testes do painel com progresso parcial, critérios completos e bloqueio administrativo separado.
- [ ] Implementar agregação servidor de jornada sem chamadas N+1 por aluno.
- [ ] Criar tela mobile-first com hierarquia definida na seção 7 e componentes shadcn existentes.
- [ ] Adicionar sidebar, breadcrumbs, loading sem remover shell e estados vazios acionáveis.
- [ ] Validar teclado, leitor de tela, contraste, 360 px e `prefers-reduced-motion`.
- [ ] Commit: `feat: add student gamified journey`.

### Entrega 10F — Indicações e comunidade

**Files:**
- Create: `src/features/gamification/referral-service.ts`
- Create: `src/features/gamification/referral-service.test.ts`
- Create: `src/features/gamification/components/referral-card.tsx`
- Create: `src/app/convite/[code]/page.tsx`
- Create: `src/app/actions/referrals.ts`
- Modify: `src/features/students/enrollment-service.ts`
- Modify: `src/features/contracts/signature-service.ts`

- [ ] Criar código aleatório revogável, limite por ciclo e proteção contra autoindicação.
- [ ] Permitir compartilhamento nativo/link sem importar contatos nem enviar mensagem pelo servidor.
- [ ] Registrar conversão somente após consentimento do indicado e vínculo à matrícula.
- [ ] Conceder bônus em duas etapas: contrato ativo e retenção de 30 dias.
- [ ] Testar código expirado, duplicidade, cancelamento, menor e reversão de matrícula.
- [ ] Commit: `feat: add consent-aware referral rewards`.

### Entrega 10G — Administração, piloto e balanceamento

**Files:**
- Create: `src/app/admin/engajamento/page.tsx`
- Create: `src/app/admin/engajamento/ciclos/page.tsx`
- Create: `src/app/admin/engajamento/criterios/page.tsx`
- Create: `src/features/gamification/components/rule-editor.tsx`
- Create: `src/features/gamification/components/readiness-review.tsx`
- Modify: `scripts/appwrite/demo-seed-data.ts`
- Modify: `docs/pilot-script.md`
- Modify: `docs/security-test-matrix.md`

- [ ] Criar editores para ciclo, XP, visibilidade, graduação e política de prontidão com versões publicadas imutáveis.
- [ ] Gerar seed realista com seis meses de presenças, progresso e conquistas.
- [ ] Executar piloto de quatro semanas sem bônus de indicação; medir check-ins aceitos, correções, uso dos vídeos e percepção dos últimos colocados.
- [ ] Habilitar ranking completo apenas se opt-out, anonimização e feedback do piloto forem aprovados.
- [ ] Ativar indicações depois de validar consentimento e regras antifraude.
- [ ] Documentar mudanças de pontuação somente entre ciclos.
- [ ] Commit: `feat: add gamification administration and pilot controls`.

## 9. Testes de aceite

- [ ] O mesmo check-in, chamada, vídeo, questionário ou indicação nunca gera XP duplicado.
- [ ] GPS fora do raio, impreciso, atrasado ou reutilizado é rejeitado com mensagem compreensível.
- [ ] Negar localização mantém a chamada manual disponível.
- [ ] Professor consegue corrigir presença e o placar recebe reversão correspondente.
- [ ] Aluno só vê sua turma e conteúdos autorizados pela graduação.
- [ ] Responsável vê apenas dependentes vinculados; menor não acessa dados financeiros pela jornada.
- [ ] Ranking de colegas não mostra nome completo, contato, idade, localização ou razão de ausência.
- [ ] Prontidão explica cada critério e não muda faixa nem cria inscrição no exame automaticamente.
- [ ] Conteúdo do YouTube preserva espaço, funciona no modo de privacidade e apresenta fallback.
- [ ] Sidebar permanece visível durante loading; somente cards dinâmicos usam skeleton.
- [ ] Sonner apresenta retornos transitórios sem layout shift.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run infra:plan` e Playwright autenticado passam.

## 10. Métricas e critérios de sucesso

- Taxa de presença por turma antes/depois do piloto, sem interpretar correlação como causalidade.
- Percentual de check-ins confirmados sem correção e taxa de falha por precisão/permissão.
- Alunos ativos semanais na jornada e conclusão de módulos por graduação.
- Distribuição de XP: nenhum pequeno grupo deve concentrar quase toda a pontuação.
- Opt-out do ranking, abandono após visualizar ranking e feedback qualitativo dos últimos colocados.
- Conversão e retenção de indicações, sem contabilizar contatos ou cliques como sucesso.
- Número de convites para exame versus alunos com critérios cumpridos e justificativas administrativas.

## 11. Gate de saída da fase

A fase termina somente quando um ciclo piloto completo comprovar: presença sem duplicação, check-in sem localização persistente, ranking isolado por turma, currículo validado pelo professor, prontidão explicável, proteção de menores, reversões auditáveis e ausência de regressões nas chamadas e exames existentes.
