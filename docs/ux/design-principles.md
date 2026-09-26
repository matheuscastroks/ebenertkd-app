# Princípios de Design e Usabilidade — Ebener TKD (Fase 9.1)

Diretrizes centrais de experiência do usuário para o aplicativo da academia Ebener TKD.

---

## 1. Princípios Centrais

1. **Linguagem Direta e Marcial**:
   - Falamos a língua da academia. "Turmas", "Treinos", "Avisos", "Graduação", "Faixas" e "Dojô" substituem jargões técnicos de software ou termos genéricos de SaaS.
2. **Prioridade Mobile-First com Alta Densidade no Admin**:
   - O professor frequentemente opera o sistema no celular no tatame (fazendo chamada rápida ou conferindo um comprovante com uma mão). Ações prioritárias devem estar a 1 toque de distância com alvos mínimos de 44×44 px.
   - O aluno acessa seu painel buscando saber imediatamente: *"Quando é o meu próximo treino?"* e *"Minha mensalidade está em dia?"*.
3. **Causa e Efeito (Feedback Imediato)**:
   - Toda interação produz retorno visual explícito. Nenhum clique deixa o usuário em dúvida se a ação foi processada.
   - Operações em andamento exibem spinners e desabilitam botões para evitar duplicação.
4. **Sensação de Segurança e Recuperação de Erros**:
   - Ações destrutivas mostram claramente as consequências com o nome do aluno/entidade.
   - Validações de formulário apontam o erro diretamente junto ao campo com orientação de correção em português, preservando os dados já preenchidos.
5. **Autonomia com Eficiência**:
   - Automações como a busca de CEP via ViaCEP preenchem automaticamente rua, bairro, cidade e estado, poupando digitação e direcionando o foco diretamente para o número residencial.
