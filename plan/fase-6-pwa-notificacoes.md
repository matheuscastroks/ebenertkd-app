# Fase 6 — PWA e notificações Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** entregar instalação como PWA, caixa de avisos e lembretes push idempotentes para pagamentos e operação.

**Architecture:** a caixa interna é a fonte confiável; push é um canal complementar. Inscrições são por dispositivo. A Function diária produz eventos por chave única e registra entrega, falha e expiração.

**Tech Stack:** Web App Manifest, Service Worker, Web Push/VAPID, Appwrite TablesDB/Functions/Messaging, Vitest/Playwright.

---

## 6.1 PWA seguro

**Arquivos:** alterar `src/app/manifest.ts`, `public/sw.js`, `src/components/pwa/register-sw.tsx`; criar `src/components/pwa/install-guide.tsx`.

- [ ] Completar manifesto com `id`, escopo, orientação, cores e ícones 192/512 maskable.
- [ ] Versionar service worker e implementar atualização controlada; remover caches antigos na ativação.
- [ ] Usar cache somente para shell e ativos públicos versionados; excluir rotas autenticadas, APIs, PDFs, saúde, comprovantes e contratos.
- [ ] Em falha de rede, mostrar página de indisponibilidade e nunca confirmar operação localmente.
- [ ] Orientar instalação por plataforma; no iOS, explicar tela inicial antes da permissão push.

## 6.2 Avisos e inscrições

**Arquivos:** criar `src/features/notifications/types.ts`, `notification-service.ts`, `push-service.ts`, `src/app/(portal)/avisos/page.tsx`; alterar schema.

- [ ] Criar `notifications`, `notification_recipients`, `push_subscriptions` e `notification_deliveries`.
- [ ] Professor publica aviso geral, por turma ou individual; destinatários são congelados na publicação.
- [ ] Caixa interna mostra histórico, lido/não lido e destino, respeitando família e papel.
- [ ] Solicitar push apenas após clique explicativo; armazenar endpoint e chaves criptografadas/privadas por conta e dispositivo.
- [ ] Remover inscrição em respostas 404/410; não considerar push enviado como lido.
- [ ] Usar texto de tela bloqueada genérico, sem CPF, saúde, valor ou nome completo.

## 6.3 Lembretes automáticos

**Arquivos:** criar `src/features/notifications/payment-reminders.ts`; integrar à Function `daily-operations`.

- [ ] Criar etapas `due_minus_3`, `due_today`, `overdue_plus_3`, `overdue_weekly_N`.
- [ ] Enviar para adulto ou responsáveis vinculados ao menor; nunca enviar finanças à conta do menor.
- [ ] Suspender em `proof_under_review`; encerrar em `paid`/`cancelled`; rejeição gera aviso imediato e reinicia somente etapas futuras.
- [ ] Deduplicar por cobrança+destinatário+etapa; novas tentativas atualizam a mesma entrega.
- [ ] Notificar professor sobre cadastro submetido, documento pendente, comprovante e falha de automação.

## Testes e aceite

- [ ] Testar atualização do SW, navegação sem rede, ausência de cache sensível e permissão push negada.
- [ ] Testar inscrição expirada, múltiplos dispositivos, responsável de dois filhos e usuário sem push.
- [ ] Testar calendário de lembretes, análise, rejeição, pagamento e reexecução do cron.
- [ ] Validar Android/Chrome e iPhone/Safari instalado; registrar modelo, SO e resultado.
- [ ] Gate: toda mensagem fica na caixa interna e push nunca é duplicado nem vaza dado sensível.

