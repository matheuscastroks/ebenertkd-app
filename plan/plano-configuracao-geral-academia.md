# Plano de Implementação: Configurações Gerais da Academia

> **Data:** 2026-11-18
> **Escopo:** Auditoria de tudo que é específico da academia e está fixo no código, e plano para transformar esses pontos em configuração editável pelo professor (admin): identidade, sistema de faixas e graduações (com presets CBTKD / ITF / Kukkiwon), política financeira, regras de contrato, regras de exame e regras operacionais (frequência, documentos, lembretes, conquistas).
> **Depende de:** Fases 3, 4 e 5, [plano de gestão periódica](./plano-gestao-periodica-admin.md) e [Ferramentas Financeiras do Professor](./plano-ferramentas-financeiras-professor.md) (em execução paralela; ver §5.4).
> **Fora de escopo (regra do [plano mestre](./README.md)):** múltiplas academias (multi-tenant), troca de fuso horário de negócio, renomear identificadores técnicos (banco `ebenertkd`, cookies, domínios de e-mail internos) e editor visual de ícones do PWA.

---

## 0. Princípios

1. **Nada quebra no dia 1.** Todo valor configurável nasce com um *default tipado igual ao valor atual do código*. Sem linha no banco, o sistema se comporta exatamente como hoje.
2. **Registros imutáveis guardam o valor da época.** Contrato assinado, cobrança emitida, inscrição em exame e histórico de faixa nunca são recalculados com a configuração nova (§2.5).
3. **Regra pura recebe a política como parâmetro.** As funções de `*-rules.ts` deixam de importar constantes e passam a receber `policy` com default — os testes atuais continuam válidos.
4. **Deny-by-default.** Tabelas novas com `permissions: []` e `rowSecurity: true` (padrão de `scripts/appwrite/setup.ts`); leitura e escrita só por serviço `server-only` com verificação `role === "admin"` para escrita.
5. **Toda alteração é auditada e versionada** (quem, quando, antes/depois, motivo opcional) e mostra o impacto antes de salvar.

## 0.1 Decisões do dono (2026-11-18) — prevalecem sobre o restante deste plano

1. **O gub é o eixo central.** Toda academia tem 10º a 1º gub (e os graus de faixa preta: Poom 1–4 e Dan 1–9). O que muda entre academias e federações é **o nome e a cor** de cada gub. Por isso **não existem "sistemas de faixa" trocáveis** (`belt_systems` e `belt_system_migrations` saem do plano) e **não há migração de alunos**: o gub de cada aluno nunca muda por causa de configuração.
2. **Alias por gub:** o professor define, para cada gub, o nome usado na academia dele (ex.: 9º gub = "Ponta Amarela", "Amarela listra branca" ou "Laranja"), nomes alternativos para reconhecer dados antigos e a cor.
3. **Cores:** paleta de cores comuns para pré-seleção (branca, cinza, amarela, laranja, verde, azul, roxa, marrom, vermelha, preta) **e** um seletor de cor livre (color picker, hex) para cor personalizada. Estilo da faixa: lisa, ponta, listra ou meia. Prévia do badge ao vivo.
4. **Presets CBTKD / ITF / Kukkiwon** viram apenas **modelos de nomes e cores** aplicados à tabela de gubs; depois o professor ajusta livremente.
5. **Tempos e presenças mínimos para exame são configuráveis por gub** (nada fixo); os valores atuais (90–180 dias, 20–48 presenças) são só o padrão inicial.
6. **Política de privacidade genérica e simples** neste primeiro momento: texto básico com o nome da academia e um contato, sem exigir CNPJ/endereço/DPO para publicar. Os campos jurídicos completos ficam opcionais.

---

## 1. Inventário de pontos fixos no código

Legenda de prioridade: **alta** = o professor precisa mudar para operar corretamente ou há inconsistência visível; **média** = regra de negócio que varia entre academias; **baixa** = ajuste fino/cosmético. Risco = risco de mudar o valor em produção.

### 1.1 Faixas e graduações (15 pontos)

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco da mudança |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| F1 | `src/features/students/options.ts:1-12` | Lista de gubs com nome PT/EN e poomsae | 10 gubs: Branca → Ponta Preta, com faixas "ponta"; Taegeuk Il–Pal Jang | `belt_rank_settings[]` (configuração de faixas) | alta | Alto: base de toda a graduação |
| F2 | `src/features/students/options.ts:14-18` | Dans disponíveis | Só 1º–3º Dan (Koryo, Keumgang, Taebaek); sem Poom | `belt_rank_settings[poom-*, dan-*]` | alta | Médio: faixas pretas acima do 3º Dan não são representáveis |
| F3 | `src/features/students/options.ts:25-40` | Enums `GUB_OPTIONS`/`BELT_OPTIONS` usados em zod | 11 gubs + 13 nomes | Validação dinâmica por `rank_key` da configuração de faixas | alta | Alto: altera validação de matrícula e exame |
| F4 | `src/features/students/options.ts:64-84` | Aliases de nome → gub (`gubForBelt`) | Strings PT/EN fixas | `belt_rank_settings.aliases` + `rank_key` | média | Médio: reconhecimento de dados legados |
| F5 | `src/features/students/options.ts:92-104` | Próxima graduação = `gub - 1`; 1º gub → "Preta" | Sequência linear | `catálogo `ranks.ts` (ordem fixa)` | alta | Médio |
| F6 | `src/features/students/options.ts:113-211` | Cores das faixas (`getBeltTheme`, classes Tailwind) | 11 temas fixos | `belt_rank_settings.color_primary/color_secondary/color_style` | média | Baixo (visual), atenção a contraste |
| F7 | `src/features/students/components/belt-badge.tsx:17-371` | Mapa de estilos por nome de faixa (455 linhas) | Nomes PT fixos + variações | Render a partir de `belt_rank_settings` | média | Baixo (visual) |
| F8 | `src/features/exams/eligibility-rules.ts:18-29` | Tempo mínimo e presenças por gub | 90d/20 … 180d/48 (= plano de gestão §2.2) | `belt_rank_settings.min_days`, `min_presences` | alta | Médio: muda quem aparece como elegível |
| F9 | `src/features/exams/eligibility-rules.ts:140-144` | Requisito padrão quando o gub não está na tabela | 90 dias / 24 presenças | `exam_policy.fallback_min_days/presences` | baixa | Baixo |
| F10 | `src/features/exams/eligibility-rules.ts:162` | Limiar de "quase pronto" | 75% | `exam_policy.almost_ready_pct` | baixa | Baixo |
| F11 | `src/features/students/journey-rules.ts:1,62,151` | Caminho da faixa do aluno reutiliza F8 e assume gub 10 sem dado | Branca padrão | `gub-10` (catálogo fixo) | média | Baixo |
| F12 | `src/features/students/study-catalog.ts:21-381` | Guia de estudos por faixa (poomsae Taegeuk/Koryo, terminologia Kukkiwon) | Conteúdo fixo por gub | `belt_rank_settings.form_name` + catálogo por preset (fase 2) | média | Médio: ITF usa *tul*, não *poomsae* |
| F13 | `src/features/operations/annual-analytics-rules.ts:179-180` | Funil de faixas do balanço anual | `GUB_BELT_OPTIONS` + "Preta" | Configuração de faixas, agrupado por `rank_key` | média | Baixo |
| F14 | `scripts/appwrite/schema.ts:180,204,206,232`; `src/features/students/schemas.ts:20,50`; `src/features/exams/schemas.ts:14-15` | `gub` inteiro 0–10; faixa varchar 64 | Máximo 10 níveis coloridos; Dan = gub 0 | Coluna aditiva `rank_key` (gub continua central) | alta | Médio: Poom e Dan 4–9 passam a ser representáveis |
| F15 | `src/features/exams/components/enroll-participant-form.tsx:41-58`; `src/features/students/components/graduation-card.tsx:15`; `src/features/exams/service.ts:270-271` | Alvo do exame só até "Preta (1º Dan)"; próxima faixa calculada por gub; promoção grava rótulo/gub | Fixo | Configuração de faixas + `rank_key` | alta | Médio |

### 1.2 Mensalidade e financeiro (15 pontos)

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| B1 | `src/features/students/components/review-panel.tsx:705` | Mensalidade padrão sugerida na aprovação | R$ 150,00 (`15000`) | `billing.default_monthly_fee_cents` | alta | Baixo (só sugestão) |
| B2 | `src/features/students/options.ts:41`; `src/features/students/schemas.ts:27,52,58`; `scripts/appwrite/schema.ts:258-259` | Dias de vencimento permitidos | 5,10,15,20,25,30; schema min 5 / max 30 | `billing.due_day_options` (subconjunto de 1–28/30) | média | Médio: dia < 5 exige alterar limite do schema |
| B3 | `src/features/billing/types.ts:3` | Tipo `enrollment_fee` existe, mas nenhuma rotina gera a cobrança | Sem taxa de matrícula | `billing.enrollment_fee_cents` + `enrollment_fee_enabled` | média | Médio: nova cobrança no fluxo de aprovação |
| B4 | `src/app/admin/exames/page.tsx:229-230` | Taxa padrão do exame não tem default (placeholder R$ 150) | Digitada a cada banca | `exam_policy.default_fee_cents` | média | Baixo |
| B5 | `src/lib/domain/billing-rules.ts:36-47`; `src/features/contracts/cancellation-service.ts:33` | Prazo de aviso de saída e encargo | Dia 20 do mês anterior; encargo = 1 mensalidade | `contract_policy.cancellation_notice_day`, `exit_fee_mode`, `exit_fee_cents` | alta | Alto: jurídico; deve valer pelo contrato assinado |
| B6 | `src/lib/domain/billing-rules.ts:49-58` | Rematrícula após afastamento | 6 meses (função só usada em teste) | `contract_policy.rematriculation_after_months` | baixa | Baixo |
| B7 | `src/features/billing/access-lock-rules.ts:6-7` | Bloqueio de acesso ao app | 30 dias após pagamento; aviso 5 dias antes | `access_policy.enabled`, `window_days`, `warning_days` | alta | Alto: pode bloquear alunos |
| B8 | `src/features/billing/rules.ts:21`; `appwrite/functions/daily-operations/src/main.js:28` | Antecedência de geração da mensalidade | 7 dias antes da competência | `billing.charge_lead_days` | baixa | Médio: duplicado na Function |
| B9 | `src/features/notifications/payment-reminders.ts:9-24`; `appwrite/functions/daily-operations/src/reminders.js:8-11` | Régua de lembretes de pagamento e textos | −3, 0, +3 e semanal a partir de +10 | `notification_policy.payment_stages[]` | média | Médio: duplicado na Function |
| B10 | `src/features/notifications/pending-notifications-rules.ts:125,160`; `src/features/families/pendencies.ts:50` | Alerta de vencimento próximo; textos citam "30 dias" | ≤ 7 dias; "ciclo de 30 dias" | Derivar de B7/B9 | média | Baixo (texto fica errado se B7 mudar) |
| B11 | `src/features/billing/adjustment-rules.ts:41` | Antecedência mínima do aviso de reajuste | 30 dias | `billing.adjustment_min_notice_days` | média | Baixo |
| B12 | `src/features/billing/adjustment-message.ts:3`; `src/features/billing/adjustment-service.ts:298` | Nome da academia na mensagem de reajuste; `{professor}` sem fonte | "Ebener TKD" | `academy.display_name`, `academy.professor_name` | alta | Baixo |
| B13 | (inexistente) | Multa e juros por atraso; descontos de política (irmãos, pagamento antecipado, bolsas) | Não há; desconto só manual em `enrollment.discount_cents` | `billing.late_fee_bps`, `late_interest_bps_month`, `discount_rules[]` (fase 2) | baixa | Alto se ativado: muda valores cobrados |
| B14 | `src/features/billing/settings-service.ts:14-40`; `scripts/appwrite/schema.ts:540-551` | PIX (chave, tipo, beneficiário, instruções) | **Já configurável** em `billing_settings` | Reutilizar; mover a tela para a área nova | — | — |
| B15 | `src/features/students/options.ts:234-247`; `src/features/contracts/renewal-service.ts:219` | Duração padrão do contrato e da renovação | 12 meses | `contract_policy.default_duration_months` | média | Baixo (só sugestão de datas) |

### 1.3 Modelo de contrato (6 pontos)

O texto do contrato **já é editável e versionado** em `/admin/contratos/modelo` (`contract_templates` + `contract_versions` imutáveis, hash SHA-256, snapshot renderizado em `contracts.content_snapshot`). O que continua fixo:

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| C1 | `src/features/contracts/template-service.ts:15-23` | Texto padrão cita regras em texto livre | "até o dia 20", "uma mensalidade", "mais de seis meses" | Usar variáveis novas (C4) no texto padrão | alta | Médio: texto e regra podem divergir |
| C2 | `src/features/contracts/contract-service.ts:44` | Variável `academia.nome` preenchida com constante | "Ebener Taekwondo" | `academy.legal_name` | alta | Baixo (só contratos novos) |
| C3 | `src/features/contracts/pdf.ts:46` | Cabeçalho do PDF e cor | "EBENERT KD" (grafia diferente das demais telas), vermelho | `academy.short_name` + logo opcional | alta | Baixo (só PDFs novos) |
| C4 | `src/features/contracts/rules.ts:3-12,73` | Variáveis disponíveis | Só nome, CPF, responsável, academia, mensalidade, vencimento, datas | Novas: `academia.documento`, `academia.endereco`, `academia.cidade`, `professor.nome`, `contrato.dia_limite_cancelamento`, `contrato.encargo_saida`, `contrato.meses_rematricula`, `taxa.matricula` | alta | Baixo (aditivo) |
| C5 | `src/features/contracts/rules.ts:130,142-146`; `appwrite/functions/daily-operations/src/main.js:154-158` | Lembretes de renovação e faixas da esteira | 30 e 7 dias; buckets 7/30/60/90 | `contract_policy.renewal_reminder_days[]` | baixa | Baixo; duplicado na Function |
| C6 | `src/features/contracts/signature-service.ts:85` | Texto pós-assinatura | "…na Ebener Taekwondo…" | `academy.display_name` | média | Baixo |

### 1.4 Exames (5 pontos — além de F8–F10 e B4)

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| E1 | `src/features/exams/eligibility-rules.ts:158-159` | Inadimplência bloqueia elegibilidade | Sempre (`financial_hold`) | `exam_policy.block_on_overdue` | média | Médio |
| E2 | `src/features/exams/components/enroll-participant-form.tsx:41-52` | Permite inscrever para qualquer faixa acima (pular faixa) | Livre | `exam_policy.allow_skip_grades` | baixa | Baixo |
| E3 | `scripts/appwrite/schema.ts:183,185` | Resultados e decisão financeira de ausência | approved/failed/absent; future_credit/keep_charge | Manter enum (é domínio, não preferência); configurar só a **decisão padrão** `exam_policy.absent_default_decision` | baixa | Baixo |
| E4 | (inexistente) | Idade mínima por graduação (ex.: Dan vs Poom), tempo entre Dans | Não há | `belt_rank_settings.min_age_years`, `min_days` para Dans | média | Médio |
| E5 | `src/features/exams/service.ts:206` | Taxa por inscrição vem da banca; sem taxa por faixa | Uma taxa por evento | `belt_rank_settings.exam_fee_cents` opcional (prioridade sobre o padrão da banca) | baixa | Baixo |

### 1.5 Identidade da academia (12 pontos)

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| I1 | `src/app/layout.tsx:28-34` | Título/metadata | "Ebener TKD" | `academy.short_name` via `generateMetadata` | média | Baixo |
| I2 | `src/app/manifest.ts:6-14` | Nome do PWA, descrição, `theme_color` | "Ebener TKD", `#f59300` | `academy.short_name`, `academy.theme_color` | baixa | Médio: PWA instalado só atualiza nome/cor em reinstalação |
| I3 | `public/offline.html:7`; `public/sw.js:56` | Título offline e título padrão de push | "Ebener TKD" | Manter estático (arquivo público sem acesso ao banco); push já envia título no payload | baixa | Baixo |
| I4 | `src/features/notifications/push-payload.ts:3` | Título das notificações push | "Ebener TKD" | `academy.short_name` | média | Baixo |
| I5 | `src/features/onboarding/types.ts:42,44,77,113` | Boas-vindas e nome do professor | "Bem-vindo à Ebener TKD", "Mestre Ebener Santos" | `academy.display_name`, `professor_title` + `professor_name` | alta | Baixo |
| I6 | `src/components/auth/auth-shell.tsx:19,45`; `src/components/dashboard/app-sidebar.tsx:144`; `src/components/pwa/install-app-card.tsx:36,46`; `install-modal.tsx:37,45`; `install-guide.tsx:71`; `src/app/configuracoes/page.tsx:152` | Marca na interface | "Ebener TKD" | `academy.short_name` | média | Baixo |
| I7 | `src/app/aluno/carteirinha/page.tsx:135`; `src/features/students/components/parq-form.tsx:671`; `src/features/billing/components/student-access-gate.tsx:60` | Carteirinha, PAR-Q impresso e tela de bloqueio | "Ebener Taekwondo" | `academy.display_name` | média | Baixo |
| I8 | `src/app/aluno/calendario/page.tsx:65,131,184`; `src/features/classes/student-calendar-rules.ts:218` | Textos e PRODID do arquivo de calendário | "Portal Ebener TKD" | `academy.short_name` (manter UID técnico `@ebenertkd`) | baixa | Baixo |
| I9 | `src/features/privacy/privacy-policy-content.ts:29-43` | Controlador LGPD, CNPJ/CPF, endereço, canal de privacidade, DPO | Nome fixo + `PRIVACY_PLACEHOLDER` pendente | `academy.legal_name`, `document_*`, `address_*`, `privacy_contact`, `dpo_name` | **alta** | Médio: exigência legal ainda em aberto |
| I10 | `src/features/locations/locations-service.ts:7-35` | Locais de treino gravados em `data/locations.json` com endereços de exemplo | "Sede Ebener Taekwondo — Tatame Central" etc. | Tabela `training_locations` no Appwrite | **alta** | Alto: arquivo local não persiste em hospedagem serverless |
| I11 | `src/lib/dates.ts:1-20` (+ 17 arquivos) | Fuso de negócio | `America/Sao_Paulo` | `academy.timezone` **somente leitura** neste ciclo | baixa | Alto se editável |
| I12 | `src/lib/appwrite/ids.ts:2,46`; `src/lib/auth/auth-utils.ts:32,44`; `src/features/onboarding/service.ts:13`; `public/sw.js:1`; chaves `ebener:*` em `notification-nav-item.tsx` | Identificadores técnicos | `ebenertkd`, `@aluno.ebenertkd.app` | **Não configurar** (mudar quebra login, sessão e backup) | — | Muito alto |

### 1.6 Regras operacionais (7 pontos)

| # | Arquivo:linha | O que está fixo | Valor atual | Chave proposta | Prior. | Risco |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| O1 | `src/features/classes/retention-rules.ts:101-132` | Limiar de risco de evasão | Crítico: ≥3 faltas seguidas, ≥21 dias, <50%; Atenção: 2 faltas, 14–20 dias, <75% | `retention_policy.*` | média | Baixo (só painel) |
| O2 | `src/features/students/compliance-rules.ts:12-13` | Validade do atestado médico e janela de alerta | 365 / 30 dias | `compliance_policy.medical_validity_days`, `expiring_window_days` | média | Médio: muda quem está irregular |
| O3 | `src/features/students/parq-rules.ts:4-5`; `appwrite/functions/daily-operations/src/main.js:228-229` | Validade do PAR-Q e lembretes | 365 dias; avisos 30/7/0 | `compliance_policy.parq_validity_days`, `parq_reminder_days[]` | média | Médio; duplicado na Function |
| O4 | `src/features/students/achievements-rules.ts:139,150-157` | Conquistas (metas e textos) | 1/25/50/100 treinos, 4 semanas, mês ≥ 4 aulas, 12 meses | `gamification_policy.badges[]` | baixa | Baixo |
| O5 | `src/features/students/compliance-rules.ts:188` | Rótulo "Vence em 30d" | Texto fixo | Derivar de O2 | baixa | Baixo |
| O6 | `plan/fase-10-jornada-gamificada.md` | XP/pontos ainda não implementados | — | Nascerá lendo `gamification_policy` | baixa | — |
| O7 | `src/features/operations/health-rules.ts:6-7`; `appwrite/functions/daily-operations/src/reminders.js:2` | Limiares de armazenamento e catch-up | 70/85%; 14 dias | **Não configurar** (operação técnica, não academia) | — | — |

**Totais:** 15 faixas · 15 financeiro (1 já configurável) · 6 contrato · 5 exames · 12 identidade (1 que não deve ser configurado) · 7 operacionais (1 que não deve ser configurado) = **60 pontos**, sendo **14 de prioridade alta**.

**Achados que merecem correção mesmo antes da configuração:**
1. Grafia inconsistente da marca: "EBENERT KD" no PDF do contrato (C3) × "Ebener TKD" × "Ebener Taekwondo".
2. Locais de treino gravados em arquivo local (I10): em produção serverless as alterações se perdem.
3. A cláusula de cancelamento é texto livre no modelo (C1) enquanto a regra (B5) é código: mudar uma sem a outra gera contrato que diz uma coisa e sistema que cobra outra.
4. `enrollment_fee` existe como tipo de cobrança, mas nunca é gerada (B3).
5. Regras duplicadas na Function `daily-operations` (B8, B9, C5, O3) — qualquer configuração precisa chegar lá também.
6. Política de privacidade com dados do controlador ainda em placeholder (I9).

---

## 2. Modelo de configuração (Appwrite)

Declarar tudo em `scripts/appwrite/schema.ts` e IDs em `src/lib/appwrite/ids.ts` antes de `npm run infra:plan` → `npm run infra:apply`. Todas as tabelas: `permissions: []`, `rowSecurity: true`, linhas criadas com `permissions: []`; acesso só pelo cliente admin em módulos `server-only`.

### 2.1 Decisão de formato: colunas tipadas × JSON validado

- **Identidade** usa colunas tipadas (poucas, estáveis, consultadas em muitas telas).
- **Políticas numéricas** usam uma linha por seção com `data_json` (text) validado por zod com `schema_version`. Motivo: são ~50 parâmetros que vão crescer (Fase 10), e cada nova coluna exigiria `infra:apply`; o zod dá a tipagem e os defaults que o Appwrite não dá.
- **Faixas** usam tabelas relacionais (são listas ordenadas, referenciadas por alunos, exames e histórico).

### 2.2 Tabelas

**`academy_settings`** (singleton; identidade)

| Coluna | Tipo | Observação |
| :-- | :-- | :-- |
| `legal_name` | varchar 160, req. | Razão social / nome no contrato e LGPD |
| `display_name` | varchar 96, req. | "Ebener Taekwondo" |
| `short_name` | varchar 24, req. | "Ebener TKD" (PWA, push, sidebar) |
| `document_type` | enum `cnpj`, `cpf`, opc. | |
| `document_number` | varchar 14, opc. | Só dígitos; validar DV |
| `address_line`, `address_complement`, `address_district` | varchar 160/96/96, opc. | Reusar `src/lib/address.ts` / ViaCEP |
| `address_city`, `address_state`, `address_zip` | varchar 96 / 2 / 8, opc. | |
| `phone_whatsapp` | varchar 24, opc. | Normalizar com `src/lib/phone.ts` |
| `contact_email` | varchar 320, opc. | |
| `instagram_handle` | varchar 64, opc. | |
| `professor_name` | varchar 128, opc. | Fonte de `{professor}` no reajuste |
| `professor_title` | varchar 32, opc. | "Mestre", "Sabumnim", "Professor" |
| `professor_graduation` | varchar 64, opc. | Ex.: "5º Dan Kukkiwon" |
| `privacy_contact` | varchar 320, opc. | Canal LGPD (I9) |
| `dpo_name` | varchar 128, opc. | |
| `logo_file_id` | varchar 36, opc. | Bucket privado; servido por rota com `Cache-Control` (§4.5) |
| `theme_color` | varchar 7, opc. | Hex; validar contraste |
| `federation` | enum `cbtkd`, `itf`, `kukkiwon`, `custom`, opc. | Informativo; indica o último preset de nomes/cores aplicado |
| `timezone` | varchar 64, req., default `America/Sao_Paulo` | Somente leitura neste ciclo |
| `setup_completed_at` | datetime, opc. | Controla o assistente inicial |
| `revision` | integer ≥ 1, req. | Concorrência otimista |
| `updated_by_account_id`, `created_at`, `updated_at` | — | |

**`academy_policies`** (uma linha por seção)

| Coluna | Tipo | Observação |
| :-- | :-- | :-- |
| `section` | enum `billing`, `access`, `contract`, `exam`, `retention`, `compliance`, `notifications`, `gamification` | Índice único |
| `schema_version` | integer ≥ 1 | Versão do zod da seção |
| `data_json` | text | Validado por `academyPolicySchemas[section]` |
| `revision` | integer ≥ 1 | Concorrência otimista (rejeita gravação com revisão antiga) |
| `updated_by_account_id`, `created_at`, `updated_at` | — | |

Conteúdo de cada seção (default = valor atual):

| Seção | Campos (default) |
| :-- | :-- |
| `billing` | `default_monthly_fee_cents` (15000), `enrollment_fee_enabled` (false), `enrollment_fee_cents` (0), `due_day_options` ([5,10,15,20,25,30]), `charge_lead_days` (7), `adjustment_min_notice_days` (30), `late_fee_bps` (0), `late_interest_bps_month` (0) |
| `access` | `enabled` (true), `window_days` (30), `warning_days` (5) |
| `contract` | `default_duration_months` (12), `cancellation_notice_day` (20), `exit_fee_mode` (`one_monthly_fee` \| `fixed` \| `none`), `exit_fee_cents` (0), `rematriculation_after_months` (6), `renewal_reminder_days` ([30, 7]) |
| `exam` | `default_fee_cents` (null), `block_on_overdue` (true), `almost_ready_pct` (75), `fallback_min_days` (90), `fallback_min_presences` (24), `allow_skip_grades` (true), `absent_default_decision` (null) |
| `retention` | `critical_consecutive_absences` (3), `critical_days_without_presence` (21), `critical_rate_pct` (50), `critical_min_lessons` (4), `warning_consecutive_absences` (2), `warning_days_without_presence` (14), `warning_rate_pct` (75), `warning_min_lessons` (3), `window_days` (30) |
| `compliance` | `medical_validity_days` (365), `medical_expiring_window_days` (30), `parq_validity_days` (365), `parq_expiring_window_days` (30), `parq_reminder_days` ([30, 7, 0]) |
| `notifications` | `payment_stages` ([−3, 0, +3]), `overdue_weekly_from_day` (10), `due_soon_alert_days` (7) |
| `gamification` | `badges[]` com `{id, title, description, metric, target}` (8 atuais) |

**`academy_config_revisions`** (append-only, auditoria e "desfazer")

| Coluna | Tipo |
| :-- | :-- |
| `scope` | enum `settings`, `policy`, `belt_ranks` |
| `section` | varchar 32, opc. |
| `entity_id` | varchar 36 |
| `revision` | integer |
| `before_json`, `after_json` | text |
| `reason` | varchar 500, opc. |
| `changed_by_account_id`, `changed_at` | — |
| índices | `scope + section + revision` (único), `changed_at` |

Além disso, cada gravação chama `writeAuditEvent("academy.settings.updated" | "academy.policy.updated" | "belt_ranks.updated" | ...)` com metadados sem dados pessoais.

**Catálogo fixo de graduações (código, não banco):** `src/features/academy/ranks.ts` define as chaves estáveis `rank_key`: `gub-10` … `gub-1`, `poom-1` … `poom-4`, `dan-1` … `dan-9`, com ordem de progressão. É igual para toda academia; a coluna `gub` atual continua válida (`gub-N` ↔ `gub = N`).

**`belt_rank_settings`** (uma linha por `rank_key`; sem linha = padrão atual do código)

| Coluna | Tipo | Observação |
| :-- | :-- | :-- |
| `rank_key` | varchar 16 | único (`gub-9`, `dan-1`…) |
| `display_name` | varchar 64 | Alias da academia: "Ponta Amarela" |
| `aliases` | varchar 64, array | Nomes alternativos para reconhecer dados antigos (`gubForBelt`) |
| `color_primary`, `color_secondary` | varchar 7 | Hex; escolhido na paleta comum ou no color picker |
| `color_style` | enum `solid`, `tip`, `stripe`, `half` | Lisa / ponta / listra / meia |
| `form_name` | varchar 96, opc. | Poomsae/Tul exigido |
| `min_days`, `min_presences` | integer ≥ 0, opc. | Elegibilidade para **sair** desta graduação (configurável, padrão = valores atuais) |
| `min_age_years` | integer, opc. | Ex.: Dan só a partir de certa idade |
| `exam_fee_cents` | integer ≥ 0, opc. | Sobrescreve a taxa padrão da banca |
| `enabled` | boolean | Ex.: academia que não usa Poom desativa `poom-*` |
| `revision`, `updated_by_account_id`, `updated_at` | — | Auditoria e concorrência |

Campos gerais em `academy_policies.belts`: `form_label` ("Poomsae"/"Tul"), `level_label` ("Gub"/"Gup"/"Kup"), `preset_applied` (informativo) e `uses_poom`.

**`training_locations`** (substitui `data/locations.json`, I10): `name`, `address`, `complement`, `is_default`, `status`, auditoria.

### 2.3 Colunas aditivas em tabelas existentes (opcionais, sem quebrar dados)

| Tabela | Colunas novas | Uso |
| :-- | :-- | :-- |
| `students` | `rank_key` | Graduação atual (backfill a partir de `gub`; Dan hoje = gub 0 + nome → `dan-N`); `current_belt` continua como rótulo legado |
| `exam_participants` | `target_rank_key` | Alvo do exame |
| `belt_history` | `previous_rank_key`, `new_rank_key` | Histórico; nomes antigos continuam como snapshot |
| `contracts` | `policy_snapshot_json` (text), `academy_legal_name`, `academy_document` | Regras de cancelamento/encargo **da época da assinatura** |
| `enrollments` | (nenhuma) | `monthly_fee_cents` e `discount_cents` já são o valor acordado |

### 2.4 Permissões

- Nenhuma tabela nova tem permissão de cliente. Leitura de identidade pública (nome, logo, cor) ocorre no servidor e é passada às páginas; não há endpoint que liste `academy_settings` inteiro para quem não é admin.
- Escrita exige `requireProfile("admin")` na página **e** `actor.role === "admin"` no serviço (padrão de `saveBillingSettings`).
- Dados de contato do controlador (I9) são públicos por natureza (política de privacidade); `document_number` é exibido somente no contrato, na política e na tela admin.
- Teste de autorização por action: aluno, responsável e menor recebem `admin_required`.

### 2.5 Snapshots: o que nunca muda retroativamente

| Registro | Já guarda snapshot? | O que acrescentar |
| :-- | :-- | :-- |
| Contrato assinado | Sim: texto renderizado, hash, `monthly_fee_cents`, datas, versão do modelo | `policy_snapshot_json` com `cancellation_notice_day`, `exit_fee_mode/cents`, `rematriculation_after_months`. `calculateExitFee` passa a ler o snapshot do contrato; contratos antigos sem snapshot usam os defaults legados (dia 20, 1 mensalidade). |
| Cobrança | Sim: `amount_cents`, `due_date`, descrição | Nada. Mudança de política só afeta cobranças geradas depois. |
| Inscrição em exame | Sim: `fee_cents`, `target_belt`, `target_gub` | `target_rank_key`. |
| Banca de exame | Sim: `default_fee_cents` | Default do formulário vem de `exam.default_fee_cents`. |
| Histórico de faixa | Sim: nomes e gub anteriores/novos | `rank_key`; **nunca** reescrever nomes antigos quando o professor renomear um gub. |
| Versão do modelo de contrato | Sim: imutável | Nada. |
| Reajuste (`tuition_adjustments`) | Sim: valores por item | `message_template` já é snapshot; o nome da academia/professor é interpolado no momento da geração. |

---

## 3. Presets de federação

### 3.1 Estrutura

Presets são **código versionado**: `src/features/academy/presets/{cbtkd,itf,kukkiwon}.ts`, cada um exportando `{ id, version, formLabel, levelLabel, ranks: { rank_key, display_name, color_primary, color_secondary, color_style, form_name }[] }`. "Aplicar preset" apenas **preenche nomes, cores e formas** de `belt_rank_settings` (com prévia e confirmação); não mexe em alunos, tempos ou presenças, a menos que o professor marque essa opção. Depois o professor ajusta cada gub livremente.

### 3.2 Diferenças a modelar

| Aspecto | CBTKD (filiada à World Taekwondo) | Kukkiwon (certificação de Dan/Poom) | ITF |
| :-- | :-- | :-- | :-- |
| Níveis coloridos | 10 gubs. O sistema atual da academia (Branca, Ponta Amarela, Amarela, Ponta Verde, Verde, Ponta Azul, Azul, Ponta Vermelha, Vermelha, Ponta Preta) é o **preset base**. Cores e nomes variam entre federações estaduais — **a confirmar com o professor** | O Kukkiwon não padroniza as cores dos gubs; usa o preset CBTKD como base | 10 gups: Branca, Branca listra Amarela, Amarela, Amarela listra Verde, Verde, Verde listra Azul, Azul, Azul listra Vermelha, Vermelha, Vermelha listra Preta (`color_style = stripe`) |
| Termo do nível | "Gub" (uso no app) | "Geup/Gub" | "Gup/Kup" |
| Formas | Poomsae Taegeuk Il–Pal Jang; Koryo, Keumgang, Taebaek… para Dans (como hoje) | Mesmas formas | Tul: Chon-Ji, Dan-Gun, Do-San, Won-Hyo, Yul-Gok, Joong-Gun, Toi-Gye, Hwa-Rang, Choong-Moo; Dans com Kwang-Gae, Po-Eun, Ge-Baek… — **associação exata tul × gup a confirmar com o professor** |
| Faixa preta de menores | Poom (1º–4º Poom, faixa meia vermelha/meia preta) para menores de 15 anos, convertível em Dan — **idade de corte e regra de conversão a confirmar** | Mesmo (o Kukkiwon emite o certificado de Poom) | Não usa Poom; algumas escolas usam faixa preta júnior/"provisória" — **a confirmar** |
| Graus de faixa preta | 1º–9º Dan (hoje o app só tem 1º–3º) | 1º–9º Dan; tempo mínimo entre Dans (ex.: 1→2 em 1 ano, 2→3 em 2 anos…) — **números a confirmar** | 1º–9º Degree; tempos próprios — **a confirmar** |
| Tempo mínimo por gub | Da academia (hoje F8: 90–180 dias e 20–48 presenças) | — (definido pela academia/federação nacional) | Da escola — **a confirmar** |
| Guia de estudos | `study-catalog.ts` atual (Kukkiwon/Taegeuk) | Idem | Requer catálogo próprio (tul e terminologia) — fase 2; sem catálogo, a tela de estudos mostra só a forma exigida |

Regras para os presets:
- Nenhum número de tempo/presença é afirmado como "oficial" da federação; os presets trazem os **valores atuais da academia** e o professor ajusta.
- Todo campo incerto é exibido na tela com o selo "Revise: valor sugerido".
- O número de graduações é sempre o mesmo (10 gubs + Poom + Dan); o que varia é nome e cor. Academias com faixas extras (ex.: cinza, laranja, roxa) as representam renomeando/recolorindo os gubs correspondentes.

### 3.3 Migração das graduações existentes

Como o gub é o eixo central, **não há migração de alunos**:
1. Script idempotente (`--dry-run`) preenche `rank_key` em `students`, `exam_participants` e `belt_history` a partir de `gub`/`current_belt` (usando `gubForBelt`). Registros sem correspondência ficam em "Graduação a revisar", sem bloquear nada.
2. Sem linhas em `belt_rank_settings`, o app mostra os nomes e cores atuais do código (fallback).
3. Renomear ou recolorir um gub muda só a exibição a partir dali; snapshots antigos (histórico, contratos) mantêm o texto da época.

---

## 4. Telas

### 4.1 Rota escolhida: `/admin/academia`

Justificativa frente a `src/lib/navigation/routes.ts`:
- `/configuracoes` (`ROUTES.settings`) já é a área **pessoal** de todos os perfis (perfil, tema, notificações); misturar academia ali confunde e exigiria checagem de papel por seção.
- `/admin/financeiro/configuracoes` (`ROUTES.adminBillingSettings`) hoje só redireciona para o diálogo de PIX; passará a redirecionar para `/admin/academia/financeiro`.
- `/admin/configuracoes` seria ambíguo com a área pessoal. "Academia" é o vocabulário do professor e já nomeia o grupo do menu.

Novas chaves: `adminAcademy`, `adminAcademyIdentity`, `adminAcademyGrades`, `adminAcademyFinance`, `adminAcademyContracts`, `adminAcademyExams`, `adminAcademyRules`, `adminAcademySetup`, `adminAcademyHistory`; item "Configurações da academia" no grupo "Gestão" (ícone `system`), com subitens. `adminLocations` (`/admin/locais`) permanece onde está e ganha atalho na visão geral.

| Rota | Seções | Fonte |
| :-- | :-- | :-- |
| `/admin/academia` | Visão geral: cartões por seção com status ("completo", "usando padrão", "revisar"), checklist de pendências (CNPJ, contato LGPD, logo) | Todas |
| `/admin/academia/identidade` | Nome legal, exibição e curto; documento; endereço (ViaCEP); WhatsApp/e-mail/Instagram; professor (nome, título, graduação); logo; cor; fuso (somente leitura) | `academy_settings` |
| `/admin/academia/graduacoes` | Tabela fixa 10º gub → 1º gub, Poom e Dan; por gub: nome usado na academia (alias), nomes alternativos, cor (paleta de cores comuns + color picker livre), estilo (lisa/ponta/listra/meia), prévia ao vivo do `BeltBadge`, forma, **tempo mínimo e presenças mínimas**, idade mínima, taxa; botão "Aplicar modelo CBTKD/ITF/Kukkiwon" (só nomes e cores, com prévia) | `belt_rank_settings` |
| `/admin/academia/financeiro` | Mensalidade padrão, taxa de matrícula, dias de vencimento, antecedência de geração, antecedência do reajuste, multa/juros (desligado), **PIX** (formulário de `billing_settings` movido para cá) | `billing`, `billing_settings` |
| `/admin/academia/contratos` | Duração padrão, prazo de cancelamento, encargo de saída, rematrícula, lembretes de renovação; atalho "Editar texto do contrato" → `/admin/contratos/modelo` | `contract` |
| `/admin/academia/exames` | Taxa padrão, bloqueio por inadimplência, "quase pronto", pular faixas, decisão padrão de ausência | `exam` |
| `/admin/academia/regras` | Acesso ao app (bloqueio), retenção, atestado/PAR-Q, régua de lembretes, conquistas | `access`, `retention`, `compliance`, `notifications`, `gamification` |
| `/admin/academia/historico` | Linha do tempo de `academy_config_revisions` com "ver diferença" e "restaurar esta versão" (gera nova revisão) | revisões |
| `/admin/academia/primeiros-passos` | Assistente inicial (§4.2) | Todas |

Componentes: só primitives de `src/components/ui/` (Card, Field, Input, Select, Switch, Tabs, Table, Dialog, Badge, Textarea), padrão `consequence-dialog.tsx` para confirmações e `OperationToast` para retorno, conforme [uso racional do shadcn/ui](./uso-racional-shadcn-ui.md). Interface em reais; armazenamento em centavos (`reaisToCents`/`formatBrl`).

### 4.2 Assistente de primeira configuração

Exibido em `/admin` enquanto `academy_settings.setup_completed_at` estiver vazio (cartão "Configure sua academia", sem bloquear o painel), integrado ao checklist de ativação do [plano de onboarding](./plano-onboarding-e-hierarquia-exames.md):

1. **Sua academia** — nomes, documento, endereço, WhatsApp, professor.
2. **Federação e faixas** — escolher CBTKD / ITF / Kukkiwon / Personalizado; prévia das faixas; "usar como está" ou "ajustar depois".
3. **Mensalidade** — valor padrão, dias de vencimento, taxa de matrícula, PIX.
4. **Contrato** — prazo de cancelamento e encargo; aviso de que o texto do modelo será atualizado com as variáveis novas (publicação explícita).
5. **Revisão** — resumo com "usar padrões sugeridos" em cada item não preenchido.

Cada passo salva sozinho (pode parar e voltar). Instalação já em uso: os valores atuais vêm pré-preenchidos pelos defaults.

### 4.3 Validações (zod, servidor)

- Nomes: tamanho mínimo/máximo; `short_name` ≤ 24 (limite prático do PWA).
- CNPJ/CPF com dígito verificador; CEP 8 dígitos; WhatsApp normalizado.
- Cor: hex válido e contraste ≥ 4.5:1 contra texto claro/escuro (reaproveitar a fórmula de `src/lib/color-contrast.test.ts` num util puro).
- Faixas: `rank_key` do catálogo fixo; `display_name` obrigatório e único; cores em hex válido (contraste do texto do badge calculado automaticamente); `min_days`/`min_presences` ≥ 0; gub com alunos não pode ser desativado.
- Dias de vencimento ⊂ [5, 30] enquanto o schema mantiver esse limite (ampliar exige mudar `schema.ts` primeiro).
- `cancellation_notice_day` 1–28; `exit_fee_mode = fixed` exige `exit_fee_cents > 0`.
- `window_days ≥ warning_days`; listas de dias sem repetição e ordenadas.
- Concorrência: gravação envia `revision`; divergência → "Outra alteração foi salva; recarregue".

### 4.4 Avisos de impacto (antes de confirmar)

| Alteração | Aviso calculado |
| :-- | :-- |
| Tempo/presenças de faixa | "12 alunos deixam de estar elegíveis e 3 passam a estar" (reutiliza `evaluateExamEligibility` com a política proposta) |
| Bloqueio de acesso | "N alunos ficariam bloqueados hoje com a nova janela" |
| Validade de atestado/PAR-Q | "N alunos ficariam irregulares" |
| Retenção | Nova contagem por nível de risco |
| Mensalidade padrão | "Vale para novas matrículas. Para alunos atuais, use Reajuste de mensalidade" (link para `/admin/financeiro/reajuste`) |
| Prazo de cancelamento / encargo | "Contratos já assinados mantêm a regra da assinatura. O texto do modelo cita {{contrato.dia_limite_cancelamento}}? Se não, publique uma nova versão" |
| Identidade (nome) | "Contratos já emitidos não mudam; o app instalado pode exigir reinstalar para trocar o nome do ícone" |
| Troca de sistema de faixas | Fluxo completo de migração (§3.3) |

### 4.5 Logo

O bucket é privado (`scripts/appwrite/schema.ts`, 5 MB, png/jpg/webp). O logo é servido por rota `GET /api/academia/logo` (sem sessão, só o arquivo referenciado em `logo_file_id`, `Cache-Control` público com ETag pelo hash). Usos: cabeçalho do PDF, carteirinha, tela de login e sidebar. **Ícones do PWA continuam arquivos em `public/`** (exigem tamanhos e máscara específicos; trocar exige deploy) — ver decisão em aberto 6.

---

## 5. Camada de leitura

### 5.1 Módulos

```
src/features/academy/defaults.ts            (puro) DEFAULT_ACADEMY_SETTINGS, DEFAULT_POLICIES = valores atuais do código
src/features/academy/schemas.ts             (puro) zod por seção, com .default() campo a campo + migração de schema_version
src/features/academy/types.ts               AcademyIdentity, AcademyPolicies, BeltSystem, BeltGrade
src/features/academy/presets/*.ts           (puro) cbtkd, itf, kukkiwon
src/features/academy/belt-rules.ts          (puro) nextGrade, gradeByCode, resolveLegacyGrade, theme do badge
src/features/academy/impact-rules.ts        (puro) cálculos de §4.4
src/features/academy/config-service.ts      server-only: leitura em cache
src/features/academy/config-admin-service.ts server-only: gravação, revisões, auditoria, migração
src/app/actions/academy-settings.ts         server actions (admin + zod)
```

### 5.2 Leitura com cache

```ts
// config-service.ts (server-only)
export function getAcademyIdentity()   // cachedRead({ name: "academy-identity", key: [], tags: [CACHE_TAGS.academySettings], revalidate: 3600 })
export function getAcademyPolicies()   // cachedRead({ name: "academy-policies", key: [], tags: [CACHE_TAGS.academyPolicies], revalidate: 3600 })
export function getPolicy<S>(section)  // atalho tipado sobre getAcademyPolicies()
export function getActiveBeltSystem()  // cachedRead({ name: "belt-system-active", key: [], tags: [CACHE_TAGS.beltSystem], revalidate: 3600 })
```

- Novas tags em `src/lib/cache/tags.ts`: `academySettings`, `academyPolicies`, `beltSystem`, `trainingLocations`. Gravações chamam `invalidateTags(...)` com a tag da seção (padrão de `saveBillingSettings`).
- **Fallback sem quebra:** linha ausente → default; `data_json` inválido → `safeParse` campo a campo, mantém os válidos, usa default nos inválidos e registra erro seguro (`src/lib/security/safe-error.ts`, sem conteúdo). Falha de rede no Appwrite → defaults (o app nunca deixa de renderizar por causa da configuração).
- Componentes cliente recebem a configuração por props (objeto serializável, sem `document_number` quando não for necessário). Nenhum componente importa o serviço.
- `manifest.ts` e `generateMetadata` do `layout.tsx` leem `getAcademyIdentity()`; antes de implementar, ler o guia de metadata/manifest em `node_modules/next/dist/docs/` (regra do AGENTS.md: esta versão do Next tem mudanças).

### 5.3 Migração por feature (padrão: parâmetro com default)

| Feature | Mudança |
| :-- | :-- |
| `students/options.ts` | Mantém as constantes como **default do preset CBTKD** (re-exportadas de `presets/cbtkd.ts`). Funções ganham variante que recebe `BeltGrade[]`; as atuais delegam ao default. Remoção das constantes só depois de todos os consumidores migrarem. |
| Zod de matrícula/exame (F3, F14) | `z.enum(BELT_OPTIONS)` → `z.string()` + refinamento no servidor contra o configuração de faixas (`gradeByCode`). |
| `belt-badge.tsx`, `getBeltTheme` (F6, F7) | Badge recebe `{name, colorPrimary, colorSecondary, colorStyle}`; temas Tailwind atuais viram fallback quando não há sistema. Ajustar `design-contract-baseline.json` se o estilo inline de cor for necessário. |
| `eligibility-rules.ts`, `journey-rules.ts` (F8–F11) | `evaluateExamEligibility(input, { grades, examPolicy })`; `GUB_ELIGIBILITY_REQUIREMENTS` vira default. `eligibility-service.ts` e `journey-service.ts` buscam a política e passam adiante. |
| `annual-analytics-rules.ts` (F13) | Funil recebe `grades`. |
| `access-lock-rules.ts` (B7) | `evaluateStudentAppAccess({ ..., policy })`; `enabled = false` → sempre `not_applicable`. Textos de B10 usam `policy.window_days`. |
| `review-panel.tsx` (B1, B2) | Página passa `billingPolicy` (default de mensalidade e dias). |
| `cancellation-service.ts` (B5) | Lê `contract.policy_snapshot_json`; sem snapshot → defaults legados. |
| `contract-service.ts`, `pdf.ts`, `rules.ts` (C2–C4) | Variáveis novas preenchidas de `getAcademyIdentity()` + política vigente, gravadas também em `policy_snapshot_json`. |
| `retention-rules.ts`, `compliance-rules.ts`, `parq-rules.ts`, `achievements-rules.ts` | Política por parâmetro com default. |
| Textos de marca (I1–I8) | `getAcademyIdentity()` no servidor; componentes cliente recebem `shortName`/`displayName`. |
| `locations-service.ts` (I10) | Troca de arquivo para tabela `training_locations`; script importa o JSON atual uma vez. |
| Function `daily-operations` (B8, B9, C5, O3) | Lê `academy_policies` no início da execução (1 consulta); `src/policy-defaults.js` com os mesmos defaults e **teste de paridade** com `src/features/academy/defaults.ts` (modelo de `push-parity.test.ts`). Exige `npm run appwrite:deploy-function` após o merge. |

### 5.4 Integração com as Ferramentas Financeiras (plano paralelo)

Sem editar os arquivos do outro plano enquanto ele estiver em execução; integrar **depois** que as Etapas A–C dele forem concluídas:

| Ponto | Integração |
| :-- | :-- |
| `adjustment-message.ts:3` `ACADEMY_NAME` e `{professor}` | Substituir por `getAcademyIdentity().short_name` e `professor_title + professor_name`, passados pelo `adjustment-service.ts`; a constante vira fallback. |
| `adjustment-rules.ts:41` `MIN_NOTICE_DAYS` | Já é parâmetro com default (`defaultEffectiveFrom`, `checkNotice`): o serviço passa `billing.adjustment_min_notice_days`. Responde à decisão em aberto 1 daquele plano. |
| Mensalidade padrão × reajuste | O reajuste altera `enrollment.monthly_fee_cents` de alunos atuais; a política altera o **padrão de novas matrículas**. Ao aplicar uma campanha, oferecer o checkbox "Atualizar também a mensalidade padrão para novas matrículas para R$ X" (gera revisão da seção `billing`). |
| Calculadora (`planning-service.ts`) | Exibir `default_monthly_fee_cents` ao lado da média real dos contratos; atalho "Usar como mensalidade padrão". `finance_scenarios` continua independente (custos não são configuração da academia). |
| Taxa de meio de pagamento | Se a academia passar a aceitar cartão, `billing.payment_fee_bps` pode alimentar o default do campo da calculadora (decisão 4 daquele plano). |
| Arquivos compartilhados | `src/lib/appwrite/ids.ts`, `src/lib/cache/tags.ts`, `scripts/appwrite/schema.ts` e `routes.ts` estão sendo alterados pelo outro plano: aplicar as mudanças deste plano em commit próprio, depois do merge daquele, para evitar conflito. |

---

## 6. Etapas de execução

### Etapa 0 — Correções imediatas (sem schema novo)
- [ ] Unificar a grafia da marca no PDF (`pdf.ts:46`) com o nome usado nas demais telas
- [ ] Criar `src/features/academy/defaults.ts` com todos os valores atuais (fonte única) e fazer as constantes existentes reexportarem dele
- [ ] Teste: snapshot dos defaults (qualquer mudança acidental de valor quebra o teste)

### Etapa 1 — Identidade (prioridade alta)
- [ ] Declarar `academy_settings` e `academy_config_revisions` em `schema.ts` + `ids.ts`; atualizar `schema.test.ts`
- [ ] `npm run infra:plan` → revisar → `npm run infra:apply`
- [ ] `config-service.ts` (leitura com `cachedRead`) e `config-admin-service.ts` (gravação, revisão, auditoria)
- [ ] Tela `/admin/academia` e `/admin/academia/identidade`; rotas e menu (`routes.ts` + teste)
- [ ] Substituir I1, I2, I4–I9, C2, C3, C6, B12 pela identidade
- [ ] Política de privacidade **genérica e simples** (decisão 0.1-6): texto básico com nome da academia e contato; remove `PRIVACY_PLACEHOLDER`; CNPJ/endereço/DPO opcionais
- [ ] Rota do logo e uso no PDF/carteirinha
- [ ] Testes: autorização (aluno/responsável/menor recebem `admin_required`), validação de CNPJ/CPF/cor, fallback sem linha, concorrência por `revision`

### Etapa 2 — Política financeira e de contrato (alta)
- [ ] Declarar `academy_policies`; colunas aditivas em `contracts` (`policy_snapshot_json`, `academy_legal_name`, `academy_document`)
- [ ] Zod das seções `billing`, `access`, `contract` com defaults
- [ ] `/admin/academia/financeiro` (incluindo PIX movido) e `/admin/academia/contratos`; redirect de `/admin/financeiro/configuracoes`
- [ ] Migrar B1, B2, B5, B7, B10, B11, B15 para parâmetros
- [ ] Novas variáveis de contrato (C4) e texto padrão (C1) usando-as; aviso para publicar nova versão do modelo
- [ ] `calculateExitFee` lê snapshot do contrato; contratos antigos mantêm dia 20 / 1 mensalidade
- [ ] Taxa de matrícula (B3): gerar cobrança `enrollment_fee` na aprovação quando habilitada (idempotente por `chargeRowId`)
- [ ] Testes: snapshot preservado após mudar política; bloqueio desligado; aviso de impacto do bloqueio; taxa de matrícula idempotente

### Etapa 3 — Faixas, presets e exames (alta)
- [ ] Declarar `belt_rank_settings`; coluna aditiva `rank_key` em `students`, `exam_participants`, `belt_history`; catálogo `ranks.ts`
- [ ] Presets CBTKD (= atual), Kukkiwon e ITF com campos "a confirmar" marcados
- [ ] Script idempotente de bootstrap e backfill de `rank_key` (com `--dry-run`)
- [ ] `belt-rules.ts`; migrar F1–F15 e E1–E5 para a configuração de faixas
- [ ] `/admin/academia/graduacoes` e `/admin/academia/exames`; editor com prévia do badge
- [ ] "Aplicar modelo" CBTKD/ITF/Kukkiwon (só nomes, cores e formas, com prévia)
- [ ] Testes: progressão com ponta/listra/Poom; renomear/recolorir não altera alunos nem histórico; paleta + color picker; elegibilidade com tempos/presenças configurados; impacto "entram/saem da elegibilidade"

### Etapa 4 — Regras operacionais e Function (média)
- [ ] Seções `retention`, `compliance`, `notifications`, `gamification`; tela `/admin/academia/regras`
- [ ] Migrar O1–O5
- [ ] `daily-operations` lendo `academy_policies` + `policy-defaults.js` + teste de paridade; deploy da Function
- [ ] Testes: régua de lembretes customizada; validade de PAR-Q diferente de 365; paridade Next × Function

### Etapa 5 — Locais, assistente e histórico (média)
- [ ] `training_locations` + importação única de `data/locations.json`
- [ ] Assistente `/admin/academia/primeiros-passos` e cartão em `/admin`
- [ ] `/admin/academia/historico` com diferença e restauração
- [ ] Integração com Ferramentas Financeiras (§5.4), após o merge daquele plano
- [ ] Testes de interação: assistente salva por passo; restaurar revisão cria nova revisão

### Etapa 6 — Catálogo de estudos por preset (baixa)
- [ ] Separar `study-catalog.ts` por preset; ITF com tul e terminologia própria (conteúdo revisado pelo professor)

### Gate de cada etapa
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- [ ] `npm run infra:plan` sem remoções; `npm run infra:smoke` após `infra:apply`
- [ ] Evidência visual (desktop e celular) das telas novas, claro e escuro
- [ ] Validação com o professor: alterar mensalidade padrão, prazo de cancelamento e tempo mínimo de uma faixa e conferir os avisos de impacto

---

## 7. Decisões

### Já decididas (2026-11-18)
- Nomes das faixas variam por academia/federação → **alias por gub** (gub central), ver §0.1.
- **Tempos e presenças mínimos configuráveis** por gub.
- **Política de privacidade genérica** neste primeiro momento.

### Em aberto (para o professor)
1. **Faixa preta de menores:** usar Poom? Com qual idade de corte e conversão para Dan? (Se não usar, basta desativar `poom-*`.)
2. **Dans acima do 3º:** habilitar até o 9º Dan?
3. **Taxa de matrícula:** cobrar? Valor? Gerada na aprovação ou junto com a primeira mensalidade?
4. **Logo e ícone do app:** basta trocar o logo nas telas e no PDF, ou o ícone instalado também (exige novo deploy)?
5. **Multa e juros por atraso:** aplicar (até 2% de multa e 1% ao mês de juros são a referência usual — confirmar com contador) ou manter sem encargos?
6. **Bloqueio de acesso ao app:** manter 30 dias após o pagamento ou trocar para "X dias após o vencimento"?
7. **Encargo de saída:** hoje, quem avisa a saída **depois do dia 20 do mês anterior** paga mais uma mensalidade (o mês de aviso prévio); quem avisa até o dia 20 sai sem custo. Manter, trocar para valor fixo, mudar o dia ou não cobrar?
8. **Exame com inadimplência:** bloquear automaticamente ou só avisar?
9. **Descontos** (irmãos, pagamento antecipado, bolsistas): regra automática ou manual por aluno?
10. **Nome no app:** manter "Ebener TKD" como nome curto e "Ebener Taekwondo" como nome de exibição?
