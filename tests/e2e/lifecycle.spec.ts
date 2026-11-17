import { expect, test, type Locator, type Page } from "@playwright/test";
import { assertIsolatedEnvironment, businessToday, chooseDate, chooseOption, dismissOnboarding, guardBrowserContext, login, missingEnvironment, persona, syntheticCpf, syntheticImage } from "./lifecycle-helpers";

async function submit(page: Page, button: Locator, destination: RegExp) {
  await Promise.all([page.waitForURL(destination), button.click()]);
  await expect(page).not.toHaveURL(/[?&]error=/);
}

function skipWithout(names: string[]) {
  const missing = missingEnvironment(names);
  test.skip(missing.length > 0, `Authenticated lifecycle not executed: configure ${missing.join(", ")} for the isolated application.`);
}

async function createClass(page: Page, name: string) {
  await page.goto("/admin/turmas");
  await page.getByRole("button", { name: "Nova turma", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da turma").fill(name);
  await dialog.getByLabel("Dojang / Local de treino").fill("Sala de teste isolada");
  for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.check();
  await dialog.getByLabel("Horário de início").fill("18:00");
  await dialog.getByLabel("Horário de término").fill("19:00");
  await submit(page, dialog.getByRole("button", { name: "Salvar nova turma" }), /[?&]created=1/);
  await page.goto("/admin/turmas");
  const card = page.locator("[data-slot=card]").filter({ has: page.getByText(name, { exact: true }) });
  await card.getByRole("link", { name: "Fazer chamada" }).click();
  await expect(page).toHaveURL(/\/admin\/turmas\/[^/?]+/);
  return new URL(page.url()).pathname;
}

async function completeEnrollment(page: Page, className: string, cpf: string) {
  await page.goto("/aluno/matricula");
  await expect(page.getByText("Passo 1 de 4 · Dados pessoais")).toBeVisible();
  await page.getByLabel(/^CPF/).fill(cpf);
  await chooseDate(page, "enrollment-birth-date", "1990-01-15");
  await page.getByLabel(/^WhatsApp/).fill("21999999999");
  await page.getByLabel(/^CEP/).fill("00000-000");
  await page.getByLabel(/^Rua \/ Logradouro/).fill("Rua de Teste");
  await page.getByLabel(/^Número/).fill("100");
  await page.getByLabel(/^Bairro/).fill("Centro");
  await page.getByLabel(/^Cidade/).fill("Rio de Janeiro");
  await chooseOption(page, /^Estado/, "RJ");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(page.getByText("Passo 2 de 4 · Saúde")).toBeVisible();
  await page.getByLabel(/^Nome do contato/).fill("Contato de Teste");
  await page.getByLabel(/^Parentesco/).fill("Familiar");
  await page.getByLabel(/^Telefone de emergência/).fill("21988888888");
  await chooseOption(page, /^Possui condição de saúde/, "Não");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(page.getByText("Passo 3 de 4 · Treino")).toBeVisible();
  await chooseDate(page, "enrollment-tkd-start", businessToday());
  await chooseOption(page, /^Turma desejada/, new RegExp(className));
  await chooseOption(page, /^Faixa atual/, /Branca/);
  await chooseOption(page, /^Dia de vencimento preferido/, "Dia 10 de cada mês");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(page.getByText("Passo 4 de 4 · Documentos")).toBeVisible();
  await page.locator('input[type=file][name="profile_photo"]').setInputFiles(syntheticImage);
  await page.locator('input[type=file][name="medical_certificate"]').setInputFiles(syntheticImage);
  await submit(page, page.getByRole("button", { name: "Enviar para análise" }), /[?&]submitted=1/);
}

test.describe("@authenticated @lifecycle Onda 3", () => {
  test.skip(!process.env.E2E_APPWRITE_PROJECT_ID, "Not executed: E2E_APPWRITE_PROJECT_ID is missing. Production is forbidden.");
  test.beforeEach(async ({ context, baseURL }) => {
    assertIsolatedEnvironment();
    await guardBrowserContext(context, baseURL!);
  });

  test("cadastro → aprovação → contrato → cobrança → comprovante aprovado; turma → chamada → exame", async ({ page: admin, browser, baseURL }, info) => {
    // Publishing the singleton template is deliberately serialized to one browser project.
    test.skip(info.project.name !== "desktop-chromium", "The stateful lifecycle runs once on desktop; separate tests cover mobile roles and dependent switching.");
    skipWithout(["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD", "E2E_ADULT_EMAIL", "E2E_ADULT_PASSWORD"]);
    test.setTimeout(420_000);
    const run = `${Date.now()}${info.retry}`;
    const name = `Aluno E2E ${run}`;
    const className = `Turma E2E ${run}`;
    const examName = `Exame E2E ${run}`;
    const account = persona("ADULT");
    const [local, domain] = account.email.split("@");
    const email = `${local.split("+")[0]}+${run}@${domain}`;
    const studentContext = await browser.newContext({ baseURL });
    await guardBrowserContext(studentContext, baseURL!);
    const student = await studentContext.newPage();
    try {
      await login(admin, persona("ADMIN"));
      const classPath = await createClass(admin, className);
      await admin.goto("/admin/contratos/modelo");
      await admin.getByLabel("Identificação do modelo").fill(`Modelo isolado ${run}`);
      await admin.getByLabel("Conteúdo e cláusulas").fill("CONTRATO DE TESTE ISOLADO. Aluno: {{ student.full_name }}. Mensalidade: {{ financial.monthly_fee }}. Este documento sintético serve apenas para verificar assinatura, PDF, cobrança e auditoria no projeto descartável de homologação.");
      await admin.getByRole("button", { name: "Publicar nova versão" }).click();
      await submit(admin, admin.getByRole("alertdialog").getByRole("button", { name: "Publicar versão", exact: true }), /[?&]published=1/);

      await student.goto("/");
      await student.getByRole("tab", { name: "Criar conta", exact: true }).click();
      await student.getByLabel("Nome completo", { exact: true }).fill(name);
      await student.getByLabel("E-mail", { exact: true }).fill(email);
      await student.getByLabel("Senha de acesso", { exact: true }).fill(account.password);
      await student.getByLabel("Confirmar senha", { exact: true }).fill(account.password);
      await submit(student, student.getByRole("button", { name: "Criar conta", exact: true }), /[?&]registered=1/);
      await login(student, { email, password: account.password });
      await completeEnrollment(student, className, syntheticCpf(run));

      await admin.goto(`/admin/matriculas?q=${encodeURIComponent(name)}`);
      await admin.getByRole("link", { name: "Analisar", exact: true }).click();
      await expect(admin.getByRole("heading", { name, exact: true })).toBeVisible();
      await submit(admin, admin.getByRole("button", { name: "Aprovar atestado", exact: true }), /[?&]updated=document/);
      await admin.getByLabel("Mensalidade acordada (R$)").fill("150");
      await submit(admin, admin.getByRole("button", { name: "Salvar condições contratuais" }), /[?&]updated=financial/);
      await submit(admin, admin.getByRole("button", { name: "Liberar para assinatura digital" }), /[?&]updated=signature/);

      await student.goto("/aluno/contratos");
      await student.getByRole("link", { name: /Assinar|Ver contrato/ }).first().click();
      const reading = student.locator("div.h-80.overflow-y-auto");
      await reading.hover();
      await student.mouse.wheel(0, 10_000);
      await student.getByLabel("Ou assine digitando seu nome completo").fill(name);
      await student.locator('input[name="accepted"]').check();
      const sign = student.getByRole("button", { name: "Assinar contrato agora" });
      await expect(sign).toBeEnabled();
      await sign.click();
      await expect(sign).toHaveCount(0);
      await expect(student.getByText("Assinado", { exact: true })).toBeVisible();

      await student.goto("/aluno/financeiro");
      await student.getByRole("button", { name: "Pagar mensalidade", exact: true }).first().click();
      await student.getByRole("dialog").locator('input[type=file][name="proof"]').setInputFiles(syntheticImage);
      await submit(student, student.getByRole("dialog").getByRole("button", { name: "Enviar comprovante" }), /[?&]updated=proof/);
      await student.goto("/aluno/financeiro");
      await student.getByRole("button", { name: "Em análise", exact: true }).click();
      await expect(student.getByRole("button", { name: "Ver envio" }).first()).toBeVisible();

      await admin.goto(`/admin/financeiro?status=proof_under_review&student=${encodeURIComponent(name)}`);
      await admin.getByRole("button", { name: "Revisar comprovante" }).first().click();
      await admin.getByRole("dialog").getByRole("button", { name: "Aprovar comprovante", exact: true }).click();
      await expect(admin.getByRole("alertdialog")).toContainText(name);
      await submit(admin, admin.getByRole("alertdialog").getByRole("button", { name: "Aprovar comprovante", exact: true }), /[?&]updated=review/);
      await student.goto("/aluno/financeiro");
      await student.getByRole("button", { name: "Pagos", exact: true }).click();
      await expect(student.getByText("Pago", { exact: true }).first()).toBeVisible();

      await admin.goto(classPath);
      await submit(admin, admin.getByRole("button", { name: "Criar aula de hoje", exact: true }), /\/admin\/turmas\/[^/]+\/aulas\/[^/?]+/);
      await expect(admin.getByText(name, { exact: true })).toBeVisible();
      await admin.getByRole("button", { name: "Marcar restantes como presentes" }).click();
      await submit(admin, admin.getByRole("button", { name: "Concluir chamada", exact: true }), /[?&]saved=1/);
      await student.goto("/aluno/frequencia");
      await expect(student.getByText(/100%/).first()).toBeVisible();

      await admin.goto("/admin/exames");
      await admin.getByRole("button", { name: "Novo exame", exact: true }).click();
      await admin.getByRole("dialog").getByLabel("Nome do evento").fill(examName);
      await chooseDate(admin, "exam-date", businessToday());
      await admin.getByRole("dialog").getByLabel("Taxa padrão por aluno (R$)").fill("0");
      await admin.getByRole("dialog").getByLabel("Local da avaliação").fill("Sala isolada E2E");
      await submit(admin, admin.getByRole("dialog").getByRole("button", { name: "Cadastrar exame de faixa" }), /\/admin\/exames\/[^/?]+/);
      const candidate = admin.locator("div.flex.items-center.justify-between").filter({ has: admin.getByText(name, { exact: true }) }).filter({ has: admin.getByRole("button", { name: "Inscrever", exact: true }) }).last();
      await candidate.getByRole("button", { name: "Inscrever", exact: true }).click();
      await submit(admin, admin.getByRole("dialog", { name: `Inscrever ${name}` }).getByRole("button", { name: "Confirmar inscrição no exame" }), /[?&]added=1/);
      await admin.getByRole("button", { name: "Aprovar", exact: true }).click();
      await expect(admin.getByRole("alertdialog")).toContainText(name);
      await submit(admin, admin.getByRole("alertdialog").getByRole("button", { name: "Confirmar: aprovar" }), /[?&]graded=1/);
      await expect(admin.getByText("Graduação Homologada", { exact: true })).toBeVisible();
      await student.goto("/aluno/exames");
      await expect(student.getByText(examName, { exact: true })).toBeVisible();
      await expect(student.getByText("Aprovado", { exact: true }).first()).toBeVisible();
    } finally {
      await studentContext.close();
    }
  });

  test("responsável mantém contexto ao editar dois filhos; menor não recebe financeiro", async ({ page, browser, baseURL }, info) => {
    skipWithout(["E2E_GUARDIAN_EMAIL", "E2E_GUARDIAN_PASSWORD", "E2E_MINOR_PASSWORD"]);
    test.setTimeout(180_000);
    const suffix = `${Date.now()}${info.project.name.startsWith("mobile") ? "m" : "d"}`;
    const names = [`Filho Ana ${suffix}`, `Filho Bia ${suffix}`];
    const usernames = [`ana.e2e.${suffix}`, `bia.e2e.${suffix}`];
    const childPassword = process.env.E2E_MINOR_PASSWORD!;
    await login(page, persona("GUARDIAN"));
    for (let i = 0; i < names.length; i++) {
      await page.goto("/responsavel/dependentes");
      await page.getByRole("button", { name: /Cadastrar primeiro dependente|Novo dependente|Adicionar dependente/ }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.locator('input[name="full_name"]').fill(names[i]);
      await dialog.locator('input[name="username"]').fill(usernames[i]);
      await dialog.locator('input[name="password"]').fill(childPassword);
      await submit(page, dialog.getByRole("button", { name: /^(Criar dependente|Criar acesso do dependente)$/ }), /[?&]created=1/);
      await page.goto("/responsavel/dependentes");
      const childCard = page.locator("[data-slot=card]").filter({ has: page.getByText(names[i], { exact: true }) });
      await childCard.locator('a[href$="/matricula"]').click();
      await expect(page).toHaveURL(/\/responsavel\/dependentes\/[^/]+\/matricula/);
      await expect(page.getByRole("heading", { name: `Matrícula · ${names[i]}` }).first()).toBeVisible();
    }
    const selector = page.getByLabel("Trocar dependente");
    await expect(selector.locator("option").filter({ hasText: names[0] })).toHaveCount(1);
    await selector.selectOption({ label: names[0] });
    await expect(page.getByRole("heading", { name: `Matrícula · ${names[0]}` }).first()).toBeVisible();
    await page.getByLabel(/^Nome completo/).fill(`${names[0]} Editado`);
    await submit(page, page.getByRole("button", { name: "Salvar rascunho", exact: true }), /[?&]saved=1/);
    await page.getByLabel("Trocar dependente").selectOption({ label: names[1] });
    await expect(page.getByLabel(/^Nome completo/)).toHaveValue(names[1]);
    await page.getByLabel("Trocar dependente").selectOption({ label: names[0] });
    await expect(page.getByLabel(/^Nome completo/)).toHaveValue(`${names[0]} Editado`);

    const minorContext = await browser.newContext({ baseURL });
    await guardBrowserContext(minorContext, baseURL!);
    try {
      const minor = await minorContext.newPage();
      await minor.goto("/");
      await minor.getByRole("button", { name: "Sou aluno menor de idade" }).click();
      await minor.getByLabel("Nome de usuário").fill(usernames[0]);
      await minor.getByLabel("Senha", { exact: true }).fill(childPassword);
      await minor.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(minor).toHaveURL(/\/aluno(?:\?|$)/);
      await dismissOnboarding(minor);
      await expect(minor.getByText(/R\$\s*\d/)).toHaveCount(0);
      await expect(minor.getByRole("link", { name: /Financeiro|Pagar mensalidade/ })).toHaveCount(0);
      await minor.goto("/aluno/financeiro");
      await expect(minor).not.toHaveURL(/\/aluno\/financeiro/);
      await expect(minor.getByText(/R\$\s*\d/)).toHaveCount(0);
    } finally {
      await minorContext.close();
    }
  });
});
