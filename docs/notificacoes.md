# Notificações: push, caixa de avisos e e-mail

## Como funciona hoje

- **Caixa interna de avisos** (`/avisos`): sempre funciona e é a fonte da verdade. Push e e-mail são complementares e não valem como comprovante de leitura.
- **Web Push** (PWA): inscrição feita no navegador (`PushPermissionCard` e etapa de onboarding), salva cifrada (AES-256-GCM) em `push_subscriptions`. Envio por `web-push` no app (avisos publicados pelo admin) e na Function `daily-operations` (lembretes de pagamento e falha da rotina).
- **Idempotência**: o aviso usa `dedupe_key` (na Function o id da linha é derivado dela); destinatário e entrega (`notification_deliveries`) usam id estável `hash(destinatário:inscrição)`. Entrega já `sent` nunca é reenviada; `failed` é tentada de novo na próxima execução.
- **Inscrição expirada**: resposta 404/410 do serviço de push marca a inscrição como `expired` e a entrega como `expired`.
- **Preferências** por categoria (`announcements_enabled`, `financial_enabled`, `system_enabled`), aplicadas tanto no app quanto na Function. Menores de idade não têm a categoria financeira (vai para os responsáveis).
- O texto do push é genérico ("Você tem um novo aviso no aplicativo.") para não expor dados financeiros na tela bloqueada.

## Variáveis necessárias

| Variável | Onde | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | app (build) e Function | Chave pública VAPID (65 bytes, base64url). Embutida no build: após alterar, faça novo deploy. |
| `VAPID_PRIVATE_KEY` | app e Function | Segredo (32 bytes, base64url). |
| `VAPID_SUBJECT` | app e Function | `mailto:email@real` ou `https://...`. |
| `PUSH_SUBSCRIPTION_ENCRYPTION_KEY` | app e Function | Segredo, 32 bytes em base64. Deve ser **idêntica** no app e na Function. Trocar invalida as inscrições existentes. |

O app só considera o push configurado quando as quatro são válidas (`src/features/notifications/push-config.ts`); a tela Admin > Sistema reflete isso.

## Passo a passo para o professor ativar o push

1. Gere as chaves (nada é gravado em arquivo):
   ```
   npm run push:generate-keys -- mailto:seu-email@exemplo.com
   ```
2. Copie as quatro linhas para o `.env.local` (e para as variáveis do ambiente de produção/hospedagem do app). Não commite nem compartilhe a chave privada.
3. Coloque as **mesmas** quatro variáveis na Function `daily-operations` (Console Appwrite > Functions > daily-operations > Settings > Variables). O script `npm run appwrite:deploy-function` também sincroniza essas variáveis a partir do `.env.local`; reimplante a Function depois de alterá-las.
4. Faça novo build/deploy do app (a chave pública entra no bundle).
5. Em Admin > Sistema, confira que "Push" aparece como configurado.
6. Teste:
   - **Android (Chrome)**: abra o site, entre com uma conta, vá em Configurações ou Avisos e toque em "Ativar notificações neste aparelho" e aceite a permissão. Como admin, publique um aviso para esse perfil; a notificação deve chegar com o app fechado.
   - **iPhone (iOS/iPadOS 16.4+)**: abra o site no Safari, toque em Compartilhar > "Adicionar à Tela de Início", abra o app **pela tela inicial** (o push não funciona na aba normal do Safari), entre e toque em "Ativar notificações neste aparelho". Publique um aviso de teste.
   - Desative a categoria em Configurações e confirme que o push dessa categoria não chega (o aviso continua na caixa).
   - Execute `npm run appwrite:run-daily` apenas em ambiente de teste para validar lembretes.

## E-mail: avaliação

Hoje o app **não envia e-mail transacional**; o único e-mail é o de redefinição de senha do Appwrite Auth. Não implementamos envio de e-mail neste PR, porque exige decisões e configurações externas e envolve dados de contato de menores e responsáveis.

O que seria necessário:

1. Um provedor SMTP (por exemplo Gmail com senha de app, Brevo, Resend, SES) e um domínio/remetente verificado (SPF e DKIM) para não cair em spam.
2. No Console Appwrite: Messaging > Providers > adicionar o provedor SMTP (ou SMTP em Settings do projeto para o e-mail do Auth) e criar tópicos/targets de e-mail.
3. Código: um canal `email` em `notification_deliveries` (hoje `channel` só aceita `push`; exige alteração em `scripts/appwrite/schema.ts` e `infra:apply`), preferência por canal, texto genérico sem dados financeiros, link de descadastro e envio pela Function ou por `Messaging.createEmail`.
4. Revisão de privacidade (LGPD): consentimento, e-mail do responsável para menores, retenção.

Recomendação: ativar primeiro o push (barato e já pronto) e decidir o e-mail depois do piloto.

## Checklist de ação humana

- [ ] Gerar as chaves com `npm run push:generate-keys` e guardá-las em local seguro.
- [ ] Definir um `VAPID_SUBJECT` com e-mail real.
- [ ] Preencher as 4 variáveis no ambiente do app (produção) e na Function `daily-operations`.
- [ ] Reimplantar a Function e fazer novo deploy do app.
- [ ] Confirmar Admin > Sistema com push configurado.
- [ ] Testar em Android Chrome e em iPhone com o app instalado na tela inicial.
- [ ] Confirmar que a Function `daily-operations` tem execução diária agendada no Console.
- [ ] Decidir sobre e-mail (provedor SMTP no Appwrite) após o piloto.
