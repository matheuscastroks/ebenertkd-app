# Diretrizes de carga cognitiva

Definidas pelo dono do produto em 2026-11-17. Valem para toda tela criada ou alterada, junto com o [contrato de design](./contrato-de-design.md). Em conflito, a regra mais restritiva vence.

Ao projetar ou modificar interfaces, priorize a redução da carga cognitiva e da complexidade desnecessária.

1. Identifique a tarefa principal e a intenção do usuário em cada tela.
2. Organize as informações em níveis primário, secundário e terciário.
3. Use *progressive disclosure* para funcionalidades avançadas ou contextuais.
4. Estabeleça uma hierarquia visual clara e consistente.
5. Evite cards, botões, ícones, cores e textos sem função.
6. Reduza decisões simultâneas sem esconder ações usadas com frequência.
7. Use agrupamento lógico, espaçamento e padrões familiares de navegação.
8. Preserve a descoberta de funcionalidades e a acessibilidade.
9. Não adicione dashboards, métricas, atalhos ou componentes sem necessidade justificada.
10. Considere usuários novos e recorrentes, estados vazios, erros e carregamento.

Antes de implementar, avalie se cada elemento contribui para a tarefa daquela tela. **Não remova funcionalidades existentes só para melhorar a aparência.** Todo PR que altere uma tela explica as decisões e os trade-offs de UX: o que saiu, o que mudou de nível (primário, secundário, terciário) e por quê.
