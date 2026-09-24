# Fase 3 — Contratos e cancelamento Implementation Plan

> **For agentic workers:** execute os itens em ordem e marque os checkboxes somente após comprovar o resultado.

**Goal:** gerar, assinar e preservar contratos versionados, controlar renovação e aplicar a regra de saída com revisão do professor.

**Architecture:** modelos editáveis geram versões publicadas imutáveis. A assinatura cria um snapshot do texto e PDF com hash. Cancelamento calcula uma sugestão, mas só a decisão administrativa altera matrícula e cobranças.

**Tech Stack:** Appwrite TablesDB/Storage, pdf-lib, Canvas/Pointer Events, SHA-256, Vitest.

---

## 3.1 Modelos e versões

**Arquivos:** criar `src/features/contracts/types.ts`, `schemas.ts`, `template-service.ts`, `render.ts`; alterar `scripts/appwrite/schema.ts`.

- [x] Criar `contract_templates`, `contract_versions`, `contracts`, `contract_signatures` e `cancellation_requests`.
- [x] Permitir ao professor editar rascunho e publicar uma versão; versões publicadas são imutáveis.
- [x] Suportar campos autorizados de aluno, responsável, academia, mensalidade e vigência; rejeitar variáveis desconhecidas.
- [x] Bloquear liberação de matrícula sem texto publicado e vigência definida.
- [x] Armazenar `content_hash`, `pdf_hash`, versão, ator, IP reduzido/adequado à privacidade e data em São Paulo/UTC.

## 3.2 Leitura, assinatura e PDF

**Arquivos:** criar `src/app/(portal)/contrato/[contractId]/page.tsx`, `src/features/contracts/components/signature-pad.tsx`, `src/features/contracts/sign-contract.ts`.

- [x] Gerar o contrato a partir da versão publicada e congelar o conteúdo no registro antes da assinatura.
- [x] Exigir rolagem/leitura, checkbox de aceite e assinatura desenhada; nome digitado não substitui autenticação.
- [x] Adulto assina a própria matrícula; responsável vinculado assina pelo menor; menor não pode assinar.
- [x] Criar PDF com texto, partes, vigência, assinatura, data e identificador verificável; salvar no bucket privado.
- [ ] Confirmar assinatura e ativar matrícula em uma operação idempotente; somente então criar a primeira cobrança da fase 4.
- [x] Exibir e baixar contrato histórico sem regenerá-lo a partir do modelo atual.

## 3.3 Renovação e saída

**Arquivos:** criar `src/features/contracts/cancellation-service.ts`, `renewal-service.ts`; criar páginas de solicitação e revisão.

- [x] Criar avisos de renovação 30 e 7 dias antes do fim; encerrada a vigência, mover para `awaiting_renewal`.
- [ ] Impedir novas competências financeiras após o fim da vigência quando as cobranças existirem na Fase 4.
- [x] Permitir prorrogação explícita ou novo contrato, sempre preservando o anterior.
- [x] Receber mês de saída e data da solicitação; aviso até dia 20 do mês anterior sugere taxa zero, após dia 20 sugere uma mensalidade.
- [ ] Professor confirma, altera ou isenta com justificativa; a decisão cancela cobranças futuras e mantém débitos existentes.
- [x] Ao retornar, comparar última data ativa: mais de seis meses civis sugere nova matrícula; exatamente seis meses não.

## Testes e aceite

- [x] Testar que editar modelo não altera contrato emitido; conferir hash após download.
- [x] Testar adulto, menor e autorização de responsável; assinatura repetida e recuperação de upload são tratadas de forma idempotente no serviço.
- [x] Testar dias 20/21, virada de ano, fim de mês, seis meses exatos e mais de seis meses.
- [x] Rodar suíte, lint, typecheck e build.
- [ ] Gate: contrato assinado é verificável e imutável; renovação e cancelamento afetam apenas competências corretas.

## Dependência da Fase 4

A ativação após assinatura está pronta. A criação da primeira cobrança, o bloqueio de novas competências após vencimento e o cancelamento seletivo de cobranças futuras serão ligados às entidades financeiras na Fase 4; por isso, os itens correspondentes e o gate financeiro permanecem abertos.
