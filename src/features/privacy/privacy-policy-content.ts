import { DEFAULT_ACADEMY_IDENTITY, type AcademyIdentity } from "@/features/academy/defaults";
import { identityAddress, identityDocumentLabel } from "@/features/academy/identity-rules";
import { formatBrazilianPhone } from "@/lib/phone";

/**
 * Conteúdo da Política de Privacidade (texto genérico e simples). O nome da academia e o canal de
 * contato vêm da identidade; CNPJ/CPF, endereço e encarregado (DPO) só aparecem quando informados.
 */

export const PRIVACY_EFFECTIVE_DATE = "17 de novembro de 2026";
export const PRIVACY_EFFECTIVE_DATE_ISO = "2026-11-17";

export type PrivacyBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export type PrivacySection = {
  id: string;
  title: string;
  blocks: PrivacyBlock[];
};

function controllerSection(identity: AcademyIdentity): PrivacySection {
  const contact = identity.privacy_contact || identity.contact_email || (identity.phone_whatsapp ? formatBrazilianPhone(identity.phone_whatsapp) : null);
  const items = [
    `Nome: ${identity.legal_name}`,
    contact ? `Contato para assuntos de privacidade: ${contact}` : "Contato para assuntos de privacidade: fale diretamente com o professor na academia.",
    identityDocumentLabel(identity) ? `Documento: ${identityDocumentLabel(identity)}` : null,
    identityAddress(identity) ? `Endereço: ${identityAddress(identity)}` : null,
    identity.dpo_name ? `Encarregado pelo tratamento de dados (DPO): ${identity.dpo_name}` : null
  ].filter((item): item is string => Boolean(item));
  return {
    id: "controlador",
    title: "1. Quem é o controlador dos dados",
    blocks: [
      { type: "p", text: `O controlador dos seus dados pessoais é a ${identity.display_name}, academia responsável por este portal. É a academia quem decide por que e como os dados são usados.` },
      { type: "ul", items }
    ]
  };
}

export function buildPrivacySections(identity: AcademyIdentity = DEFAULT_ACADEMY_IDENTITY): PrivacySection[] {
  return [
  controllerSection(identity),
  {
    id: "dados",
    title: "2. Quais dados coletamos",
    blocks: [
      { type: "p", text: "Coletamos apenas os dados necessários para a matrícula, o treino e a gestão da academia." },
      {
        type: "ul",
        items: [
          "Conta e acesso: nome completo, e-mail, nome de usuário (no caso de alunos menores) e senha (armazenada pelo serviço de autenticação, nunca em texto legível pela academia).",
          "Cadastro e matrícula: CPF, data de nascimento, WhatsApp, endereço, contato de emergência (nome, parentesco e telefone), data de início no taekwondo, faixa/graduação e turma.",
          "Dados de saúde (sensíveis): informação se há condição de saúde, detalhes, medicamentos, alergias, lesões e atestado médico.",
          "Documentos e imagem: foto de perfil e atestado médico enviados por você.",
          "Responsáveis e menores: nome e contato do responsável, vínculo entre responsável e aluno menor, e dados do aluno menor.",
          "Contratos: texto do contrato aceito, nome do signatário, imagem da assinatura, data e hora do aceite, impressão digital (hash) do endereço IP e navegador (user agent) usados na assinatura.",
          "Financeiro: cobranças, mensalidades, taxas de exame, pagamentos e comprovantes de pagamento enviados.",
          "Treino: turmas, frequência, exames de faixa e histórico de graduações.",
          "Notificações: preferências de aviso e, se você ativar, a assinatura de notificações push do seu navegador/dispositivo.",
          "Registros de operação: logs de auditoria de ações relevantes no sistema (quem fez, o quê e quando)."
        ]
      }
    ]
  },
  {
    id: "finalidades",
    title: "3. Para que usamos os dados e bases legais (LGPD)",
    blocks: [
      {
        type: "ul",
        items: [
          "Gerir matrícula, turmas, frequência e graduações. Base: execução de contrato ou de procedimentos preliminares a pedido do titular (LGPD, art. 7º, V).",
          "Emitir, coletar assinatura e guardar contratos. Base: execução de contrato e exercício regular de direitos (art. 7º, V e VI).",
          "Emitir cobranças, conferir comprovantes e controlar pagamentos. Base: execução de contrato e cumprimento de obrigação legal ou regulatória, quando aplicável (art. 7º, II e V).",
          "Dados de saúde e atestado médico, para avaliar aptidão e segurança na prática esportiva. Base: consentimento específico e destacado, ou tutela da saúde e proteção da vida e da incolumidade física, conforme o caso (art. 11, I e II, e).",
          "Contato de emergência, para acionar alguém em caso de necessidade. Base: proteção da vida e da incolumidade física (art. 7º, VII) e legítimo interesse (art. 7º, IX).",
          "Enviar avisos sobre aulas, exames, cobranças e contratos, inclusive por push. Base: execução de contrato; para push, consentimento dado ao permitir as notificações no navegador (art. 7º, I).",
          "Segurança, prevenção a fraudes, logs de auditoria e backup. Base: legítimo interesse e exercício regular de direitos (art. 7º, VI e IX)."
        ]
      }
    ]
  },
  {
    id: "criancas",
    title: "4. Crianças e adolescentes",
    blocks: [
      {
        type: "p",
        text: "Dados de crianças e adolescentes são tratados no seu melhor interesse (LGPD, art. 14). O cadastro, a matrícula e a assinatura de contrato de menores são feitos por um responsável legal, que fornece o consentimento específico e em destaque para o tratamento dos dados do menor."
      },
      {
        type: "ul",
        items: [
          "O aluno menor acessa o portal com um nome de usuário criado a partir do vínculo com o responsável.",
          "O responsável visualiza e gerencia somente os dependentes vinculados a ele; se o vínculo for revogado, o acesso aos dados e arquivos do menor é interrompido.",
          "O menor não tem acesso a atestados médicos nem a comprovantes financeiros; sua própria foto continua disponível.",
          "O responsável pode pedir a correção ou a exclusão dos dados do menor pelos canais descritos abaixo."
        ]
      }
    ]
  },
  {
    id: "compartilhamento",
    title: "5. Compartilhamento e operadores",
    blocks: [
      { type: "p", text: "Não vendemos dados pessoais. Compartilhamos dados apenas com prestadores que os tratam em nosso nome (operadores) e quando a lei exigir." },
      {
        type: "ul",
        items: [
          "Appwrite Cloud (hospedagem, autenticação, banco de dados e armazenamento privado de arquivos): região Frankfurt, Alemanha. Há, portanto, transferência internacional de dados.",
          "Google Drive: destino de cópias de segurança (backup) cifradas antes do envio, em conta dedicada da academia. O Google não tem acesso à chave de cifra.",
          "Serviços de notificação push do navegador/sistema (por exemplo, do fabricante do navegador), que entregam os avisos que você ativar.",
          "Autoridades públicas, quando houver obrigação legal ou ordem judicial."
        ]
      },
      {
        type: "p",
        text: "Dentro da academia, o acesso é limitado por perfil: o professor (administrador) acessa os dados necessários à gestão; alunos e responsáveis acessam apenas os próprios dados ou os de seus dependentes vinculados."
      }
    ]
  },
  {
    id: "retencao",
    title: "6. Por quanto tempo guardamos os dados",
    blocks: [
      {
        type: "ul",
        items: [
          "Dados de conta, matrícula e treino: enquanto houver vínculo com a academia.",
          "Contratos, cobranças e comprovantes: pelo prazo necessário para cumprir obrigações legais e fiscais e para exercer direitos em eventual disputa.",
          "Backups: o sistema mantém cópias diárias e semanais por um período limitado e rotativo; dados excluídos podem permanecer nas cópias de segurança até que elas sejam substituídas pela rotação.",
          "Registros de auditoria: pelo tempo necessário à segurança e à prestação de contas."
        ]
      }
    ]
  },
  {
    id: "direitos",
    title: "7. Seus direitos como titular",
    blocks: [
      { type: "p", text: "Nos termos do art. 18 da LGPD, você pode pedir à academia:" },
      {
        type: "ul",
        items: [
          "confirmação de que tratamos seus dados e acesso a eles;",
          "correção de dados incompletos, inexatos ou desatualizados;",
          "anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;",
          "portabilidade, quando regulamentada;",
          "informação sobre com quem os dados foram compartilhados;",
          "informação sobre a possibilidade de não consentir e sobre as consequências;",
          "revogação do consentimento a qualquer momento;",
          "revisão de decisões e oposição a tratamentos feitos sem base legal adequada."
        ]
      },
      {
        type: "p",
        text: "Para pedir correção de dados, fale com a academia pelo canal de contato indicado na seção 1. Para solicitar sua exclusão, use a opção de exclusão de conta disponível em Configurações, depois de entrar no portal."
      },
      {
        type: "p",
        text: "Ao excluir a conta, o acesso é encerrado imediatamente, o e-mail e o nome de usuário do perfil são anonimizados, os vínculos com responsáveis são revogados e os contatos (WhatsApp e telefone de emergência) da ficha do aluno são apagados, passando a ficha a constar como inativa. Alguns registros podem ser mantidos quando houver obrigação legal ou necessidade de exercício regular de direitos, como contratos e dados financeiros."
      },
      {
        type: "p",
        text: "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD)."
      }
    ]
  },
  {
    id: "seguranca",
    title: "8. Segurança",
    blocks: [
      {
        type: "ul",
        items: [
          "Controle de acesso por perfil (administrador, aluno, responsável, aluno menor); a URL por si só não dá acesso a nada.",
          "Arquivos (fotos, atestados, comprovantes e contratos) ficam em armazenamento privado, sem acesso público, com download liberado somente a quem tem permissão e sem cache.",
          "Validação do tipo real de arquivo enviado e limite de tamanho de 5 MB.",
          "Assinaturas de notificação push são armazenadas cifradas.",
          "Backups cifrados com AES-256-GCM antes de sair do sistema.",
          "O endereço IP da assinatura de contrato é guardado apenas como hash (impressão digital), não em texto legível.",
          "Cookie de sessão protegido (HTTP-only, SameSite Lax e Secure em produção).",
          "Registro de auditoria de ações relevantes."
        ]
      },
      {
        type: "p",
        text: "Nenhum sistema é totalmente imune a riscos. Em caso de incidente que possa causar dano relevante, a academia comunicará os titulares afetados e a ANPD, conforme a lei."
      }
    ]
  },
  {
    id: "cookies",
    title: "9. Cookies e armazenamento no navegador",
    blocks: [
      {
        type: "ul",
        items: [
          "Cookie de sessão (ebenertkd-session): estritamente necessário para manter você conectado. Tem validade limitada e é removido ao sair.",
          "Armazenamento local do navegador: usado para lembrar preferências, como o tema claro/escuro.",
          "Service worker (aplicativo instalável/PWA): usado para o funcionamento como aplicativo e para receber notificações push, se você permitir."
        ]
      },
      {
        type: "p",
        text: "Não usamos cookies de publicidade nem de rastreamento de terceiros."
      }
    ]
  },
  {
    id: "alteracoes",
    title: "10. Alterações e vigência",
    blocks: [
      {
        type: "p",
        text: `Esta política vigora a partir de ${PRIVACY_EFFECTIVE_DATE}. Podemos atualizá-la; a versão vigente ficará sempre disponível nesta página, com a data de vigência atualizada.`
      }
    ]
  }
  ];
}

/** Versão com os dados padrão da academia (usada em testes e como referência de seções). */
export const PRIVACY_SECTIONS: PrivacySection[] = buildPrivacySections();
