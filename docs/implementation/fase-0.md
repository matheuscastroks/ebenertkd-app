# Evidências da Fase 0

## Fundação implementada

- Configuração Appwrite validada com Zod.
- Clientes administrativo, de autenticação e de sessão separados.
- Cookie HTTP-only `ebenertkd-session`.
- IDs estáveis e schema aditivo para banco, tabelas, índices, bucket e Functions.
- Bucket privado de 5 MB para imagens e PDF.
- Functions diárias idempotentes para operações e backup.
- Diagnóstico autenticado sem retorno de chave ou payload sensível.
- PWA básica com manifesto, ícones e service worker.

## Validação

Os comandos obrigatórios são:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run appwrite:ping
```

O projeto `My first project` foi provisionado no Appwrite Cloud pelo schema de `scripts/appwrite/schema.ts`. Os quatro perfis de teste foram validados contra suas rotas protegidas.

## Pendências operacionais

- Executar `npm run infra:smoke` após mudanças de infraestrutura.
- Publicar as duas Functions e confirmar suas execuções agendadas.
- Configurar preview no Appwrite Sites.
- Validar Web Push em Android e iOS instalado como PWA.
- Usar uma chave administrativa com os menores escopos necessários.
