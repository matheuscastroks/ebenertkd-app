import { describe, expect, it } from "vitest";
import {
  MESSAGE_TEMPLATES,
  MESSAGE_VARIABLES,
  buildGenericNotice,
  buildMessageVariables,
  buildWhatsappMessageLink,
  encodeWhatsappText,
  findUnknownVariables,
  getMessageTemplate,
  interpolateMessage,
  isLongForWhatsappLink
} from "./adjustment-message";

const variables = {
  nome: "Ana",
  nome_aluno: "Pedro",
  valor_atual: "R$ 150,00",
  valor_novo: "R$ 157,00",
  diferenca: "R$ 7,00",
  vigencia: "01/01/2027",
  indice: "IPCA 12 meses: 4,5%",
  academia: "Ebener TKD",
  professor: "Mestre João"
};

describe("adjustment message", () => {
  it("oferece os 4 modelos e todos usam apenas variáveis suportadas", () => {
    expect(MESSAGE_TEMPLATES.map((template) => template.id)).toEqual(["cordial", "curto", "transparencia", "responsaveis"]);
    for (const template of MESSAGE_TEMPLATES) {
      expect(findUnknownVariables(template.body)).toEqual([]);
      expect(template.body).toContain("{valor_novo}");
      expect(template.body).toContain("{vigencia}");
    }
    expect(MESSAGE_VARIABLES).toContain("professor");
  });

  it("interpola todas as variáveis do modelo cordial", () => {
    const text = interpolateMessage(getMessageTemplate("cordial").body, variables);
    expect(text).toContain("Olá, Ana!");
    expect(text).toContain("parte da Ebener TKD");
    expect(text).toContain("evolução de Pedro");
    expect(text).toContain("passará de R$ 150,00 para R$ 157,00");
    expect(text).toContain("(IPCA 12 meses: 4,5%)");
    expect(text).toContain("01/01/2027");
    expect(text.endsWith("Mestre João")).toBe(true);
    expect(text).not.toMatch(/\{[a-z_]+\}/);
  });

  it("remove o parêntese vazio quando não há índice de referência", () => {
    const text = interpolateMessage(getMessageTemplate("cordial").body, { ...variables, indice: "" });
    expect(text).toContain("inflação do período e os custos");
    expect(text).not.toContain("()");
  });

  it("mantém variáveis desconhecidas e aceita valores ausentes", () => {
    expect(interpolateMessage("Oi {nome} {foo}", { nome: "Ana" })).toBe("Oi Ana {foo}");
    expect(interpolateMessage("Oi {nome}!", {})).toBe("Oi !");
    expect(findUnknownVariables("Oi {nome} {foo} {bar}")).toEqual(["foo", "bar"]);
  });

  it("codifica quebras de linha, emojis, & e # para o ?text= do wa.me", () => {
    const text = "Olá! 🥋\nR$ 150 & #1 é 100%";
    const encoded = encodeWhatsappText(text);
    expect(encoded).not.toMatch(/[\s&#]/);
    expect(encoded).toContain("%0A");
    expect(encoded).toContain("%26");
    expect(encoded).toContain("%23");
    expect(encoded).toContain("%25");
    expect(decodeURIComponent(encoded)).toBe(text);
    const link = buildWhatsappMessageLink("https://wa.me/5511999998888", text);
    expect(link).toBe(`https://wa.me/5511999998888?text=${encoded}`);
    expect(new URL(link as string).searchParams.get("text")).toBe(text);
  });

  it("não gera link sem número válido", () => {
    expect(buildWhatsappMessageLink(null, "oi")).toBeNull();
  });

  it("sinaliza mensagens longas demais para o link", () => {
    expect(isLongForWhatsappLink("curta")).toBe(false);
    expect(isLongForWhatsappLink("ação ".repeat(400))).toBe(true);
  });

  it("monta o aviso geral sem valores individuais", () => {
    const notice = buildGenericNotice({ academy: "Ebener TKD", effectiveFromLabel: "01/01/2027", indexLabel: "IPCA 4,5%" });
    expect(notice.title).toBe("Reajuste de mensalidade");
    expect(notice.body).toContain("01/01/2027");
    expect(notice.body).toContain("IPCA 4,5%");
    expect(notice.body).not.toMatch(/R\$/);
  });

  it("monta as variáveis de um pagador usando o primeiro nome e o valor líquido do desconto", () => {
    const vars = buildMessageVariables({
      payerName: "Ana Souza",
      studentName: "Pedro Souza",
      previousFeeCents: 15_000,
      newFeeCents: 16_000,
      discountCents: 2_000,
      effectiveFrom: "2027-01-01",
      indexLabel: " IPCA 4,5% ",
      professor: "Mestre João"
    });
    expect(vars).toMatchObject({ nome: "Ana", nome_aluno: "Pedro", diferenca: expect.stringContaining("10,00"), indice: "IPCA 4,5%", vigencia: "01/01/2027", academia: "Ebener TKD" });
    expect(vars.valor_atual).toContain("130,00");
    expect(vars.valor_novo).toContain("140,00");
  });
});
