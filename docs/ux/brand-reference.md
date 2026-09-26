# Referência de marca — Ebener TKD

## Decisão vigente — 26/09/2026

Por solicitação do usuário, o produto voltou à paleta **Neutral padrão do shadcn/ui**, conforme `components.json` e https://ui.shadcn.com/docs/theming. Os tokens base usam OKLCH e os componentes recebem as mesmas cores semânticas nos temas claro e escuro. As personalizações anteriores em laranja/zinc abaixo ficam como histórico, não como instrução para novas telas.

**Poppins** é a fonte única de títulos e conteúdo, carregada por `next/font/google` nos pesos 400, 500, 600 e 700. Chakra Petch e Inter foram removidas. A logo permanece; a troca de tema mantém View Transition com respeito a movimento reduzido. Cores de status continuam limitadas a sucesso, aviso, informação e erro.

## Referência histórica do site

Fonte confirmada pelo usuário: https://ebenertkd.com.br/.
Inspeção em 24/09/2026: HTML e CSS públicos, sem captura visual nesta etapa.
Folha consultada: https://ebenertkd.com.br/_next/static/chunks/0s54op61ilmva.css. O nome do arquivo pode mudar em novos deployments.

## Valores observados

| Elemento | Valor observado | Evidência |
| --- | --- | --- |
| Nome público | Ebener TKD | Navegação, título e rodapé |
| Laranja da marca | `#F98E03` | Classes `primary-500`, gradientes e scrollbar |
| Laranja claro | `#FFB833` | Classes `primary-400` |
| Primary semântico | `hsl(33 96% 50%)` | `:root` e `.dark` |
| Fundo claro | `hsl(0 0% 100%)` | `--background` |
| Texto claro | `hsl(222.2 84% 4.9%)` | `--foreground` |
| Fundo escuro | `hsl(222 47% 11%)` | `.dark --background` |
| Superfície escura secundária | `hsl(217 33% 17%)` | `.dark --secondary` |
| Texto escuro | Branco | `.dark --foreground` |
| Fonte característica | Chakra Petch | Fonte carregada e aplicada em `html` |
| Fonte adicional carregada | Inter | Declaração de fonte e variável no HTML |
| Raio base do site | `1.5rem` | `--radius` |

O hexadecimal `#F98E03` e o HSL arredondado do site não são exatamente a mesma cor. Para a aplicação, usar o hexadecimal como referência canônica; se o contrato atual continuar armazenando canais HSL, converter com precisão suficiente em vez de copiar os dois valores como se fossem idênticos.

## Tradução para o produto

Estas são decisões propostas para o app, não valores adicionais extraídos do site:

- Padronizar o nome visível como **Ebener TKD** em sidebar, metadata, manifesto e textos. IDs técnicos, projeto Appwrite e cookies permanecem estáveis.
- Ações principais e progresso usam o laranja da marca com texto escuro. Não presumir contraste adequado de texto branco sobre laranja ou de links laranja sobre branco: medir antes da implementação.
- Usar Chakra Petch em marca, títulos e números de destaque; Inter em campos, tabelas e textos longos. Carregar apenas pesos necessários e remover famílias redundantes.
- Fundo claro branco e superfícies secundárias zinc. O modo escuro usa zinc pouco saturado em camadas: fundo 16%, sidebar 18%, cards 20%, popovers 23% e interação 29% de luminosidade HSL. Texto principal é quase branco, texto secundário é cinza e a seleção da sidebar recebe um laranja discreto. Esta revisão substitui o azul profundo do site institucional no produto, conforme solicitado pelo usuário.
- Tokens semânticos `primary`, `primary-foreground`, `ring`, `sidebar-primary` e estados selecionados derivam da marca; `success`, `warning`, `destructive` continuam comunicando estados distintos.
- Raio proposto para densidade do app: controles 8 px, superfícies 12 px e modais 16 px. O raio de 24 px do site institucional não precisa ser aplicado a todas as linhas e campos.
- Logo: usar `/brand-icon.png`, preservando o original em `src/assets/favicon.png`. Reservar dimensões para evitar deslocamento.
- Tom: próximo, direto e específico à tarefa. Preservar o vocabulário de treino, turma e professor; o portal autenticado não precisa repetir slogans de divulgação.
- Fotos e elementos expressivos podem apoiar identidade em contextos apropriados, sem competir com leitura financeira e formulários.

## Aplicação aos planos

A Fase 9 implementa estes tokens, tipografia, marca e convenções. A Fase 10 herda o mesmo sistema: cores de faixa servem como identificação da graduação; laranja continua sendo a cor de ação do produto.

## Validação na implementação

- [ ] Comparar visualmente site e logo com o app, em claro e escuro.
- [ ] Medir contraste dos pares de texto, ações, bordas/foco e estados ativos.
- [ ] Confirmar legibilidade da logo recolhida e da marca expandida.
- [ ] Validar Chakra Petch em títulos reais e Inter em tabelas densas.
- [ ] Registrar captura antes/depois e matriz final de tokens no relatório de revisão.
