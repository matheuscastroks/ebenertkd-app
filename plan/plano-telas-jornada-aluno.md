# Plano de Implementação: Telas da Jornada do Aluno (Adulto e Menor)

> **Data:** 2026-11-18  
> **Escopo:** Expandir a área `/aluno` com telas de evolução técnica, estudo, constância, agenda e passaporte digital, mantendo total isolamento financeiro para alunos menores e aderência aos contratos de design e cache do projeto.

---

## 1. Arquitetura de Rotas

| Rota | Público | Objetivo Principal |
| :--- | :--- | :--- |
| `/aluno/evolucao` | Adulto e Menor | Caminho da faixa (10º Gub a Dan), medidor de prontidão pedagógica para o próximo exame, Poomsae e histórico de graduações. |
| `/aluno/estudos` | Adulto e Menor | Guia técnico personalizado pela faixa atual: Poomsae, vocabulário coreano, os 5 princípios, etiqueta no dojang e quiz rápido de revisão. |
| `/aluno/conquistas` | Adulto e Menor | Reforço positivo: sequência de semanas treinando (*streak*), mapa de constância (26 semanas), gráfico mensal e medalhas desbloqueáveis. |
| `/aluno/calendario` | Adulto e Menor | Grade semanal da turma, próximas aulas previstas/reposição, exames agendados e exportação `.ics` para o calendário do celular. |
| `/aluno/carteirinha` | Adulto e Menor | Passaporte Digital do Dojang (PWA) + situação anual do atestado médico (365 dias), foto de perfil e resumo de emergência. |

---

## 2. Princípios de Produto e Segurança
- **Isolamento do Menor:** Nenhuma das novas telas expõe cobranças, mensalidades, valores em `R$` ou bloqueios financeiros para o aluno menor (nem mistura financeiro no percentual técnico de prontidão).
- **Reforço Positivo:** Conquistas e sequências celebram presença e evolução sem penalizar faltas abonadas (`excused`) ou doença.
- **Reaproveitamento de Domínio:** Reutiliza `GUB_ELIGIBILITY_REQUIREMENTS`, `GUB_BELT_OPTIONS`, `poomsaeForGub`, `evaluateStudentCompliance` e `resolveStudentProfile`.

---

## 3. Checklist de Implementação

- [x] Rotas em `src/lib/navigation/routes.ts` e atualização de `src/lib/navigation/routes.test.ts`
- [x] Tela 1: Caminho da Faixa (`/aluno/evolucao`) + regras + gráfico + testes
- [x] Tela 2: Guia Técnico e Quiz (`/aluno/estudos`) + catálogo por faixa + testes
- [x] Tela 3: Conquistas e Constância (`/aluno/conquistas`) + regras + heatmap + gráfico + testes
- [x] Tela 4: Calendário e Exportação `.ics` (`/aluno/calendario`) + regras + testes
- [x] Tela 5: Carteirinha Digital e Regularidade (`/aluno/carteirinha`) + atalho no dashboard
- [x] Validação final: testes unitários + guardas arquiteturais, `npm run typecheck`, `npm run lint` e `npm run build`
