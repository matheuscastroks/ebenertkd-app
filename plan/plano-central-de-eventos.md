# Plano de Implementação: Central de Eventos

> **Data:** 2026-11-18
> **Escopo:** Substituir a área "Exames de faixa" por uma área **Eventos** que reúne exames de faixa, campeonatos, aulões/seminários, confraternizações e outros eventos, com uma **Central de inscrições** única para professor, alunos e responsáveis.
> **Depende de:** Fase 4 (cobranças), Fase 5 (exames), Fase 6 (avisos/push) e o [Plano de Configuração Geral da Academia](./plano-configuracao-geral-academia.md) (sistema de faixas por federação).
> **Não quebra:** exames, histórico de faixas, elegibilidade, calendário do aluno e relatório anual continuam funcionando durante toda a migração.

---

## 1. Como esses eventos funcionam na prática (pesquisa)

Referências: regulamentos de federações estaduais (FPTKD/PR, FETESP/SP, JEAC/AC, Jogos Escolares/BA) e modelos comuns de sistemas de inscrição. Os regulamentos **mudam de evento para evento**, então o sistema guarda as regras por evento, não fixas no código.

### 1.1 Exame de faixa (organizado pela academia)
Banca na data marcada → professor seleciona alunos elegíveis (tempo mínimo na faixa, presenças, adimplência) → taxa de exame → resultado (aprovado, reprovado, ausente) → nova faixa no histórico → certificado. **Já existe no app** (`exam_events`, `exam_participants`, `belt_history`).

### 1.2 Campeonato (organizado por terceiros: federação, liga, outra academia)
- **Cronograma com várias datas:** prazo de filiação/boletim de faixa na federação, prazo de inscrição, prazo de troca de categoria, pesagem, dia da competição. A filiação costuma fechar alguns dias antes das inscrições (ex.: FPTKD 2026).
- **Inscrição feita pela academia:** em geral é a equipe/academia que inscreve os atletas no sistema da federação, não o atleta.
- **Modalidades:** Kyorugi (luta) e Poomsae (formas), às vezes festival infantil, parataekwondo e equipes. No Kyorugi o atleta entra em **uma** categoria de peso; no Poomsae alguns eventos permitem até duas.
- **Categoria = idade + sexo + peso + faixa.** Classes de idade usuais: infantil, cadete (12–14), juvenil (15–17), adulto (18+) e master. Faixa mínima/máxima por categoria varia (ex.: juvenil a partir de 2º gub em um estadual).
- **Documentos:** documento com foto na pesagem, comprovação de graduação, **autorização do responsável e termo de responsabilidade para menores**.
- **Pesagem:** o atleta que não comparece é eliminado.
- **Custos:** taxa de inscrição da federação + taxa/rateio da academia (transporte, técnico, uniforme).
- **Resultado:** colocação/medalha por categoria, que alimenta o histórico do atleta.

### 1.3 Aulão, seminário, treino especial
Inscrição simples, vagas limitadas, às vezes aberta a convidados de outras academias, taxa opcional, controle de presença (check-in) e, em seminários, certificado de participação.

### 1.4 Confraternização (festa de fim de ano, churrasco, passeio)
Confirmação de presença (RSVP) com número de acompanhantes, taxa ou cota opcional, lista de itens/contribuições, sem requisito técnico.

### 1.5 Padrões de sistemas de inscrição
Evento → **opções de inscrição** (categoria/ingresso com preço e vagas) → **inscrição** com ciclo de status → lista de espera quando lota → check-in no dia. A checagem de vagas deve ser feita no servidor, de forma atômica, para não vender vaga a mais.

---

## 2. Modelo de domínio

Um modelo genérico com **um tipo de evento** e **extensões por tipo**, em vez de uma tabela para cada tipo de evento.

```
events (1) ──< event_options (categorias / ingressos)
   │                 │
   └──────< event_registrations >───┘
                     │── charge_id (cobrança existente)
                     │── event_registration_documents (autorizações, termos)
                     └── event_results (medalha, colocação)  /  exam_participants (exame)
```

### 2.1 Tipos de evento (`event_type`)

| Tipo | Organizador | Quem inscreve | Requisitos | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| `belt_exam` | Academia | Professor (a partir da elegibilidade) | Elegibilidade de faixa | Aprovado/reprovado → nova faixa |
| `championship` | Externo | Aluno/responsável manifesta interesse → professor confirma e envia à federação | Idade, sexo, peso, faixa, filiação, documentos | Colocação/medalha por categoria |
| `seminar` (aulão/seminário) | Academia ou externo | Aluno/responsável ou professor | Faixa mínima opcional | Presença e badge de participação |
| `social` (confraternização) | Academia | Aluno/responsável (RSVP) | — | Presença |
| `other` | Qualquer | Configurável | Configurável | Presença |

O tipo define quais campos e passos aparecem; a tabela e o fluxo de inscrição são os mesmos.

### 2.2 Ciclo de status

**Evento:** `draft` → `published` (visível) → `registration_open` → `registration_closed` → `in_progress` → `completed` | `cancelled`.
As aberturas e os encerramentos seguem datas (`registration_opens_at`, `registration_closes_at`) e podem ser forçados pelo professor.

**Inscrição:**
```
interested ──► pending_approval ──► confirmed ──► checked_in ──► completed
     │                │                 │
     └──► cancelled ◄─┴── waitlisted ◄──┘ (quando lota)
                      └── rejected (requisito não atendido)
```
- `interested`: aluno marcou interesse (campeonato, antes do professor fechar a equipe).
- `pending_approval`: aguardando professor, pagamento ou documento.
- `confirmed`: vaga garantida (e, no campeonato, enviado à federação: `external_submitted_at`).
- `waitlisted`: entra quando `capacity` está cheia; promovido automaticamente na ordem, com aviso.
- `no_show` no lugar de `completed` para quem não compareceu (inclui "não compareceu à pesagem").

### 2.3 Regras transversais
- **Elegibilidade por opção** (`eligibility_json`): faixa mín./máx., classe de idade calculada pela **data de corte do evento** (ano de nascimento ou data do evento — definido por evento), sexo, peso declarado, adimplência, matrícula ativa. O motor de elegibilidade retorna motivos legíveis ("faixa abaixo do mínimo: exige 8º gub").
- **Menor de idade:** inscrição feita ou aprovada pelo responsável; autorização e termo aceitos no app (aceite eletrônico com data/hora, igual ao contrato) e opção de anexar a autorização assinada exigida pela federação.
- **Financeiro:** cada inscrição pagante gera uma cobrança `event_fee` com `origin_id = registration_id` (idempotente), no fluxo PIX/comprovante existente. Cancelamento usa a mesma decisão do exame: crédito futuro ou manter cobrança.
- **Vagas:** checagem e reserva no servidor; contador por opção recalculado a partir das inscrições (não confiar só em contador).
- **Auditoria:** criar/publicar/cancelar evento, confirmar/recusar/cancelar inscrição, registrar resultado.

---

## 3. Dados (declarar em `scripts/appwrite/schema.ts`)

Permissões deny-by-default; leitura e escrita somente por serviços server-only.

### `events`
| Coluna | Tipo | Observação |
| :--- | :--- | :--- |
| `event_type` | enum `belt_exam`, `championship`, `seminar`, `social`, `other` | |
| `title` | varchar 128 | |
| `description` | text | regras, programação |
| `status` | enum (§2.2) | |
| `starts_at`, `ends_at` | datetime | data de negócio em `America/Sao_Paulo` |
| `location_id` | varchar 36, opcional | reutiliza `locations` |
| `location_text` | varchar 160, opcional | local externo |
| `organizer_type` | enum `academy`, `external` | |
| `organizer_name` | varchar 128, opcional | ex.: federação estadual |
| `registration_opens_at`, `registration_closes_at` | datetime, opcional | |
| `audience` | enum `students`, `students_and_guests`, `public` | convidados só com dados mínimos |
| `requires_approval` | boolean | |
| `capacity` | integer, opcional | limite geral |
| `cover_file_id` | varchar 36, opcional | bucket público de imagens |
| `external_url` | varchar 512, opcional | edital/regulamento |
| `legacy_exam_event_id` | varchar 36, opcional | migração (§6) |
| `created_by_account_id`, `created_at`, `updated_at` | — | |
| índices | `starts_at`, `status`, `event_type`, `event_type + starts_at` | |

### `event_deadlines` (cronograma de campeonatos e outros)
`event_id`, `kind` (enum `affiliation`, `registration`, `category_change`, `weigh_in`, `payment`, `custom`), `label`, `due_at`, `notify_days_before` (integer). Usados para lembretes e para a linha do tempo do evento.

### `event_options` (categorias, ingressos ou modalidades)
| Coluna | Tipo |
| :--- | :--- |
| `event_id` | varchar 36 |
| `label` | varchar 128 (ex.: "Kyorugi Cadete Masc. -45 kg", "Adulto", "Acompanhante") |
| `modality` | enum `kyorugi`, `poomsae`, `festival`, `team`, `general` |
| `price_cents` | integer ≥ 0 |
| `capacity` | integer, opcional |
| `eligibility_json` | text (validado por zod: faixa, idade, sexo, peso, data de corte) |
| `max_per_registrant_group` | varchar 32, opcional (ex.: uma categoria de kyorugi por atleta) |
| `sort_order` | integer |

### `event_registrations`
| Coluna | Tipo | Observação |
| :--- | :--- | :--- |
| `event_id`, `option_id` | varchar 36 | |
| `student_id`, `enrollment_id` | varchar 36, opcional | aluno |
| `guest_name`, `guest_contact` | opcional | convidado (dados mínimos, LGPD) |
| `registered_by_account_id` | varchar 36 | aluno, responsável ou professor |
| `status` | enum (§2.2) | |
| `waitlist_position` | integer, opcional | |
| `companions` | integer ≥ 0 | confraternização |
| `declared_weight_grams` | integer, opcional | campeonato |
| `belt_system_id`, `rank_key_snapshot`, `age_class_snapshot` | snapshot na inscrição | segue o `rank_key` (gub central) do plano de configuração (não usar `gub` 0–10) |
| `price_cents` | integer | valor congelado |
| `charge_id` | varchar 36, opcional | |
| `terms_accepted_at`, `guardian_authorized_at`, `guardian_account_id` | opcional | |
| `external_submitted_at` | datetime, opcional | enviado à federação |
| `checked_in_at` | datetime, opcional | |
| `notes` | text, opcional | |
| índices | `event_id + status`, `student_id`, único `event_id + option_id + student_id` | |

### `event_registration_documents`
`registration_id`, `kind` (`guardian_authorization`, `responsibility_term`, `medical`, `federation_card`, `other`), `file_id` (bucket privado), `status` (`pending`, `approved`, `rejected`), `reviewed_by_account_id`, `reviewed_at`.

### `event_results` (campeonatos e outros com colocação)
`registration_id`, `event_id`, `student_id`, `placement` (integer 1–n), `medal` (enum `gold`, `silver`, `bronze`, `none`), `notes`, `recorded_by_account_id`, `recorded_at`. Exames continuam em `exam_participants` + `belt_history`.

### Alterações aditivas em tabelas existentes
- `charges.charge_type`: adicionar `event_fee`.
- `exam_events`: passa a ser a **extensão de exame** do evento (ver §6); nenhuma coluna removida neste ciclo.
- Novas chaves em `APPWRITE_IDS` e `CACHE_TAGS` (`events`, `event(id)`, `eventRegistrations(id)`).

---

## 4. Backend

### 4.1 Módulos (`src/features/events/`)
```
types.ts, schemas.ts (zod de evento, opção, elegibilidade e inscrição)
rules/status-rules.ts        (+ .test)  transições válidas de evento e inscrição
rules/eligibility-rules.ts   (+ .test)  faixa, idade por data de corte, sexo, peso, adimplência → motivos
rules/capacity-rules.ts      (+ .test)  vaga, lista de espera, promoção
rules/category-suggestion.ts (+ .test)  sugere a categoria do atleta (idade/peso/faixa)
event-service.ts             CRUD, publicar, cancelar (server-only, auditado, cache)
registration-service.ts      inscrever, aprovar, recusar, cancelar, promover espera, check-in
registration-documents-service.ts  upload e revisão (bucket privado)
results-service.ts           resultados de campeonato
deadline-reminders.ts        lembretes por prazo (reutiliza Fase 6, idempotente por dedupeKey)
export-service.ts            CSV da equipe para envio à federação
```
Server actions em `src/app/actions/events.ts`, com papel verificado em cada ação:
- **admin:** tudo.
- **aluno adulto:** inscrever a si próprio, cancelar a própria inscrição antes do prazo, enviar documentos.
- **responsável:** inscrever/autorizar dependentes, aceitar termos, enviar documentos.
- **menor:** apenas manifestar interesse; a confirmação depende do responsável.

### 4.2 Regras críticas (testes de sucesso e falha)
- Inscrição idempotente (`event_id + option_id + student_id`).
- Reserva de vaga atômica: confirmar só se `confirmados < capacidade`, senão `waitlisted`; promoção da lista de espera ao cancelar.
- Cobrança `event_fee` criada uma única vez por inscrição; cancelamento aplica crédito/manutenção.
- Elegibilidade reavaliada no momento da confirmação (faixa pode ter mudado).
- Bloqueio pós-prazo para aluno/responsável; professor pode forçar com motivo auditado.
- Isolamento: aluno vê só as próprias inscrições; responsável só as dos dependentes; convidados nunca aparecem para outros alunos.

### 4.3 Exames como tipo de evento
Os serviços de `src/features/exams/` continuam donos da lógica de banca e graduação. A camada de eventos chama `addExamParticipant` / `recordExamResult` quando `event_type = belt_exam`, para não duplicar regra de graduação.

---

## 5. Frontend

### 5.1 Navegação (`src/lib/navigation/routes.ts`)
O grupo **"Exames de faixa"** vira **"Eventos"** (ícone de calendário/troféu), com:

| Item | Rota | Conteúdo |
| :--- | :--- | :--- |
| Agenda de eventos | `/admin/eventos` | Próximos e passados, filtro por tipo, cartões com prazo mais próximo e vagas |
| Central de inscrições | `/admin/eventos/inscricoes` | Todas as inscrições pendentes de ação: aprovar, cobrar, documento faltando, lista de espera |
| Exames de faixa | `/admin/eventos/exames` | Lista atual de bancas (redireciona de `/admin/exames`) |
| Elegibilidade | `/admin/eventos/exames/elegibilidade` | Tela atual (redireciona de `/admin/exames/elegibilidade`) |
| Campeonatos | `/admin/eventos?tipo=championship` | Atalho filtrado |

Detalhe e criação:
- `/admin/eventos/novo` — assistente: **1. tipo** → 2. dados e datas → 3. opções/categorias (com presets por tipo: categorias Kyorugi/Poomsae por classe de idade; "Aluno / Acompanhante" para confraternização) → 4. regras e documentos → 5. revisão e publicação.
- `/admin/eventos/[id]` — abas: **Visão geral** (prazos e contadores), **Inscritos** (tabela com filtros por status/categoria e ações em lote), **Pagamentos**, **Documentos**, **Check-in** (lista para o dia, busca por nome), **Resultados** (medalhas ou resultado do exame), **Exportar** (CSV para a federação).

Redirecionamentos permanentes de `/admin/exames/**` para `/admin/eventos/exames/**`, para não quebrar links salvos e notificações já enviadas.

### 5.2 Aluno e responsável
- `/aluno/eventos` e `/responsavel/dependentes/[profileId]/eventos`: **Abertos para inscrição**, **Minhas inscrições** (status, pagamento, documentos pendentes, prazos), **Histórico** (exames e medalhas).
- Inscrição em até 3 passos: escolher opção (categoria sugerida automaticamente e motivos de inelegibilidade visíveis) → termos/autorização → pagamento (PIX existente).
- "Meus exames" continua como atalho para os exames dentro de Eventos.
- Calendário do aluno (`student-calendar-service.ts`) passa a ler `events` (todos os tipos) em vez de só `exam_events`.

### 5.3 Componentes
Somente primitives instaladas (Tabs, Card, Table, Badge, Dialog, Form, Select, Checkbox, Calendar se existir), conforme [uso racional do shadcn/ui](./uso-racional-shadcn-ui.md). Componentes novos em `src/features/events/components/`: `event-card`, `event-type-badge`, `event-deadline-timeline`, `registration-status-badge`, `registration-table`, `eligibility-reasons`, `event-wizard`, `checkin-list`, `results-editor`. Estados vazios explicando cada tipo de evento ("Nenhum campeonato cadastrado. Cadastre o próximo estadual com os prazos da federação para receber lembretes.").

---

## 6. Migração dos exames existentes (sem perda)

1. Declarar `events` e demais tabelas novas; `infra:plan` → `infra:apply`.
2. Script `scripts/appwrite/migrate-exam-events-to-events.ts` (idempotente, com `--dry-run`): para cada `exam_events`, cria um `events` **com o mesmo `$id`**, `event_type = belt_exam`, `legacy_exam_event_id = id`, status mapeado (`planned`→`published`, `confirmed`→`registration_closed`, `completed`, `cancelled`). Mantendo o mesmo ID, `exam_participants.event_id` e `belt_history.event_id` continuam válidos sem reescrever linhas.
3. `createExamEvent` passa a criar as duas linhas (evento + extensão de exame) na mesma operação, com compensação em caso de falha.
4. Leituras (calendário, relatório anual, jornada) migram para `events` uma de cada vez, com testes de regressão.
5. Só depois de um ciclo estável avaliar fundir `exam_events` em `events` (fora deste plano).

Backup antes da migração (Fase 7) e ensaio em ambiente de desenvolvimento com `appwrite:seed-test-users`.

---

## 7. Integrações com outros planos
- **Configuração da academia:** faixas/gubs, classes de idade e presets de categoria vêm da configuração por federação (CBTKD, ITF, Kukkiwon); enquanto ela não existir, usar os valores atuais do código como padrão.
- **Ferramentas financeiras:** receitas de `event_fee` aparecem no fechamento mensal como categoria separada ("Eventos") e não entram na calculadora de mensalidade.
- **Jornada gamificada (Fase 10):** participação em evento e medalhas podem gerar marcos; fica como gancho, sem implementar pontuação aqui.
- **Avisos e push (Fase 6):** publicação de evento, abertura/fechamento de inscrições, prazo de filiação, promoção da lista de espera, confirmação e lembrete D-1.

---

## 8. Etapas de execução

### Etapa E0 — Fundação de dados e regras
- [ ] Declarar `events`, `event_deadlines`, `event_options`, `event_registrations`, `event_registration_documents`, `event_results`; `event_fee` em `charges`
- [ ] IDs, cache tags, tipos e schemas zod
- [ ] Regras puras com testes: status, elegibilidade, vagas/lista de espera, sugestão de categoria

### Etapa E1 — Migração e navegação
- [ ] Script de migração dos exames (dry-run, idempotente, testado)
- [ ] Grupo "Eventos" no menu, redirecionamentos de `/admin/exames/**`, testes de rotas
- [ ] Bancas e elegibilidade funcionando dentro de `/admin/eventos/exames`

### Etapa E2 — Eventos simples (aulão, seminário, confraternização)
- [ ] Assistente de criação, agenda e detalhe com abas
- [ ] Inscrição do aluno/responsável, RSVP com acompanhantes, lista de espera, check-in
- [ ] Cobrança `event_fee` e cancelamento com decisão financeira

### Etapa E3 — Campeonatos
- [ ] Prazos (filiação, inscrição, troca de categoria, pesagem) com lembretes
- [ ] Categorias com presets por modalidade e classe de idade; sugestão automática e motivos de inelegibilidade
- [ ] Autorização do responsável, termo, documentos e revisão
- [ ] Fluxo interesse → confirmação → enviado à federação; exportação CSV
- [ ] Resultados e medalhas no histórico do aluno
- [ ] Badges de conquista no perfil (participação, medalhas, exame, seminário)

### Etapa E4 — Central de inscrições e leituras unificadas
- [ ] `/admin/eventos/inscricoes` com filas por pendência e ações em lote
- [ ] Calendário do aluno, relatório anual e fechamento lendo `events`
- [ ] Telas do aluno e do responsável

### Gate final
- [ ] Testes de autorização (aluno, responsável, menor, admin) para cada action
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] Ensaio da migração em desenvolvimento e evidência visual (desktop e celular)
- [ ] Piloto com o professor: um aulão real e o próximo campeonato estadual

---

## 9. Decisões

### Decididas pelo dono (2026-11-18)
1. **Campeonato:** a academia **só monta e acompanha a equipe** e envia à federação; chaveamento/sorteio de campeonato interno fica fora.
2. **Convidados sem cadastro: aceitos** em aulões, seminários e confraternizações quando o evento permitir (`audience = students_and_guests` ou `public`). Dados mínimos: nome e WhatsApp; sem acesso ao app; dados apagados após o evento conforme a política de privacidade.
3. **Taxa da federação cobrada separadamente** da taxa/custos da academia: duas cobranças `event_fee` (itens "Taxa da federação" e "Custos da academia"), cada uma idempotente por `registration_id + item`.
4. **Sem certificado em PDF neste ciclo. Em vez disso, conquistas viram badges** no perfil do aluno: participação em evento, medalhas (ouro/prata/bronze), aprovação em exame e presença em seminário geram um badge exibido em "Meu perfil"/"Caminho da faixa", integrado às conquistas da Fase 10 (tabela `student_badges` ou extensão das conquistas existentes, com `source = event_result | event_attendance | exam_result`, idempotente por fonte).

### Proposta com padrão (confirmar)
5. **Como contar a idade para a categoria:** campeonatos dividem atletas em classes de idade (ex.: cadete 12–14). Há duas formas de contar: **(a) pelo ano de nascimento** — vale a idade que o atleta completa no ano do campeonato, então quem nasceu em 2012 é cadete o ano todo de 2026, mesmo antes do aniversário (é o padrão da World Taekwondo e da maioria dos regulamentos); **(b) pela data do evento** — idade exata no dia. **Padrão: (a)**, com opção de trocar por evento quando o edital pedir (b).

### Em aberto
6. **Peso:** só o declarado na inscrição ou registrar também o peso oficial da pesagem?

## Fontes consultadas
- [Regulamento do Campeonato Paranaense — FPTKD](https://files.paranatkd.com.br/arquivos/9ffcf2e5-5c78-4bf3-9074-2b6182bc52c0.pdf)
- [Documentos de competição — FPTKD](https://files.paranatkd.com.br/upload/930f72bf-c5f5-49f9-ad05-913eca1f837d.pdf)
- [Regulamento de Taekwondo JEESP 2025 — FETESP](https://fetesp.com.br/wp-content/uploads/2025/03/250320_Regualmento-de-Taekwondo-2025-JEESP.pdf)
- [Gran Final Paulista 2025 — FETESP](https://fetesp.com.br/wp-content/uploads/2025/05/Gran-Final-Paulista-2025-3-1.pdf)
- [Regulamento Taekwondo JEAC 2025](https://see.ac.gov.br/wp-content/uploads/2025/04/REG._TAEKWONDO___JEAC_2025.pdf)
- [Regulamento específico de taekwondo — PBH 2026](https://prefeitura.pbh.gov.br/sites/default/files/estrutura-de-governo/esportes-e-lazer/2026/regulamento-especifico-taekwondo.pdf)
- [Modelagem de banco para inscrições e ingressos — GeeksforGeeks](https://www.geeksforgeeks.org/how-to-design-a-relational-database-for-online-event-ticketing-and-registration/)
- [Event registration system (capacidade e lista de espera) — RapidDevelopers](https://www.rapidevelopers.com/how-to-build-lovable/event-registration-system)
- [Wix Events — Registration](https://dev.wix.com/docs/api-reference/business-solutions/events/registration/introduction)
