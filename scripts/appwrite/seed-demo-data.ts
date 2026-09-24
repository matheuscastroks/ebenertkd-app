import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { AppwriteException, Client, Permission, Query, Role, Storage, TablesDB, Users, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { buildDemoScenario, demoDueDate, demoId, monthOffset } from "./demo-seed-data";

loadEnvConfig(process.cwd());

type ProfileRow = Models.Row & { account_id: string; full_name: string; email: string; username?: string | null; role: string; capabilities: string[] };
type LinkRow = Models.Row & { guardian_profile_id: string; student_profile_id: string; status: string };
type StudentRow = Models.Row & { profile_id: string };
type EnrollmentRow = Models.Row & { student_id: string };
type ClassRow = Models.Row & { name: string };
type SeedRow = Models.Row & Record<string, unknown>;

const contractTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPORTIVOS

A academia Ebenert KD prestará aulas de Taekwondo ao aluno identificado neste contrato durante a vigência indicada. A mensalidade deverá ser paga até o vencimento escolhido e confirmado pela academia.

O aluno ou responsável poderá solicitar saída sem ônus quando comunicar até o dia 20 do mês anterior. Depois desse prazo será devida uma mensalidade. Após mais de seis meses afastado, poderá ser cobrada nova matrícula.

O aluno e seu responsável declaram verdadeiras as informações cadastrais e de saúde apresentadas à academia.`;

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const signatureDataUrl = `data:image/png;base64,${tinyPng.toString("base64")}`;
const dateTime = (date: string) => date.includes("T") ? date : `${date}T12:00:00.000Z`;

async function main() {
  const config = readServerAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const tables = new TablesDB(client);
  const storage = new Storage(client);
  const users = new Users(client);
  const now = new Date().toISOString();

  async function upsertRow(tableId: string, rowId: string, data: Record<string, unknown>, permissions: string[] = []) {
    try {
      await tables.getRow({ databaseId: config.databaseId, tableId, rowId });
      return tables.updateRow<SeedRow>({ databaseId: config.databaseId, tableId, rowId, data, permissions });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      return tables.createRow<SeedRow>({ databaseId: config.databaseId, tableId, rowId, data, permissions });
    }
  }

  async function ensureFile(fileId: string, name: string, permissions: string[]) {
    try {
      return await storage.getFile({ bucketId: config.bucketId, fileId });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      return storage.createFile({ bucketId: config.bucketId, fileId, file: InputFile.fromBuffer(tinyPng, name), permissions });
    }
  }

  let profilesResult = await tables.listRows<ProfileRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.limit(100)] });
  const personas = [
    { oldEmail: "admin.teste@ebenertkd.app", email: "ricardo.almeida@ebenertkd.app", name: "Ricardo Almeida" },
    { oldEmail: "aluno.teste@ebenertkd.app", email: "camila.ferreira@ebenertkd.app", name: "Camila Ferreira" },
    { oldEmail: "responsavel.teste@ebenertkd.app", email: "juliana.mendes@ebenertkd.app", name: "Juliana Mendes" },
    { oldEmail: "menor.teste@minor.ebenertkd.internal", email: "lucas.mendes@minor.ebenertkd.internal", name: "Lucas Mendes", username: "lucas.mendes" },
    { oldEmail: "matheus.junior@minor.ebenertkd.internal", email: "pedro.ferreira@minor.ebenertkd.internal", name: "Pedro Ferreira", username: "pedro.ferreira" }
  ];
  for (const persona of personas) {
    const profile = profilesResult.rows.find((item) => item.email === persona.oldEmail || item.email === persona.email);
    if (!profile) throw new Error(`demo_seed_persona_missing:${persona.oldEmail}`);
    await users.updateName({ userId: profile.account_id, name: persona.name });
    if (profile.email !== persona.email) await users.updateEmail({ userId: profile.account_id, email: persona.email });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: profile.$id, data: { full_name: persona.name, email: persona.email, username: persona.username ?? null, updated_at: now } });
  }
  profilesResult = await tables.listRows<ProfileRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.limit(100)] });
  const profilesByEmail = new Map(profilesResult.rows.map((profile) => [profile.email, profile]));
  const profilesById = new Map(profilesResult.rows.map((profile) => [profile.$id, profile]));
  const admin = profilesResult.rows.find((profile) => profile.role === "admin");
  if (!admin) throw new Error("demo_seed_admin_profile_missing");

  const linksResult = await tables.listRows<LinkRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.guardianStudentLinks, queries: [Query.equal("status", ["active"]), Query.limit(100)] });
  const guardianByStudent = new Map(linksResult.rows.map((link) => [link.student_profile_id, profilesById.get(link.guardian_profile_id)]));

  const classDefinitions = [
    { key: "adult-night", name: "Adulto noite", weekdays: ["Segunda", "Quarta", "Sexta"], start_time: "18:00", end_time: "19:30", capacity: 20 },
    { key: "children-morning", name: "Infantil manhã", weekdays: ["Terça", "Quinta"], start_time: "09:00", end_time: "10:00", capacity: 16 },
    { key: "youth-afternoon", name: "Juvenil tarde", weekdays: ["Terça", "Quinta", "Sábado"], start_time: "16:00", end_time: "17:15", capacity: 18 }
  ] as const;
  const existingClasses = await tables.listRows<ClassRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, queries: [Query.limit(100)] });
  const classes = new Map<string, SeedRow>();
  for (const definition of classDefinitions) {
    const existing = existingClasses.rows.find((item) => item.name === definition.name);
    const rowId = existing?.$id ?? demoId("class", definition.key);
    const row = await upsertRow(APPWRITE_IDS.tables.trainingClasses, rowId, { name: definition.name, weekdays: [...definition.weekdays], start_time: definition.start_time, end_time: definition.end_time, capacity: definition.capacity, status: "active", created_by_account_id: admin.account_id, created_at: existing?.$createdAt ?? now, updated_at: now });
    classes.set(definition.key, row);
  }

  const templateId = demoId("contract-template", "default");
  const versionId = demoId("contract-version", "default-v1");
  const contentHash = createHash("sha256").update(contractTemplate).digest("hex");
  await upsertRow(APPWRITE_IDS.tables.contractVersions, versionId, { template_id: templateId, version: 1, content: contractTemplate, content_hash: contentHash, published_by_account_id: admin.account_id, published_at: now });
  await upsertRow(APPWRITE_IDS.tables.contractTemplates, templateId, { name: "Contrato padrão da academia", draft_content: contractTemplate, published_version_id: versionId, created_by_account_id: admin.account_id, updated_by_account_id: admin.account_id, created_at: now, updated_at: now });

  const settingsRows = await tables.listRows({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.billingSettings, queries: [Query.limit(1)] });
  await upsertRow(APPWRITE_IDS.tables.billingSettings, settingsRows.rows[0]?.$id ?? demoId("billing-settings", "default"), { pix_key: "financeiro@ebenertkd.app", pix_key_type: "email", beneficiary_name: "Ebenert KD", instructions: "Após o pagamento, envie o comprovante por esta tela para conferência da secretaria.", updated_by_account_id: admin.account_id, created_at: settingsRows.rows[0]?.$createdAt ?? now, updated_at: now });

  const scenarios = buildDemoScenario(now);
  let paymentCount = 0;
  let proofCount = 0;
  for (const [index, scenario] of scenarios.entries()) {
    const profile = profilesByEmail.get(scenario.email);
    if (!profile) throw new Error(`demo_seed_profile_missing:${scenario.email}`);
    const guardian = guardianByStudent.get(profile.$id);
    const accountIds = new Set([profile.account_id, guardian?.account_id].filter((value): value is string => Boolean(value)));
    const ownerPermissions = [...accountIds].flatMap((accountId) => [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))]);
    const filePermissions = [...accountIds].map((accountId) => Permission.read(Role.user(accountId)));
    const trainingClass = classes.get(scenario.classKey);
    if (!trainingClass) throw new Error(`demo_seed_class_missing:${scenario.classKey}`);

    const existingStudents = await tables.listRows<StudentRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] });
    const studentId = existingStudents.rows[0]?.$id ?? demoId("student", scenario.key);
    const cpf = `9000000000${index + 1}`;
    const addresses = ["Rua Joaquim Távora, 184 — Vila Mariana, São Paulo/SP", "Rua das Rosas, 72 — Mirandópolis, São Paulo/SP", "Avenida Jabaquara, 1260 — Saúde, São Paulo/SP"];
    const phones = ["11984567231", "11976341852", "11991236478"];
    const emergencyPhones = ["11987654320", "11973452681", "11982345679"];
    const student = await upsertRow(APPWRITE_IDS.tables.students, studentId, { profile_id: profile.$id, full_name: profile.full_name, cpf, birth_date: dateTime(index === 0 ? "1994-04-12" : index === 1 ? "2014-08-03" : "2012-11-19"), whatsapp: phones[index], address: addresses[index], emergency_contact_name: guardian?.full_name ?? "Marcos Ferreira", emergency_contact_relationship: guardian ? "Responsável" : "Irmão", emergency_contact_phone: emergencyPhones[index], started_at_tkd: dateTime(`${2022 + index}-02-01`), current_belt: scenario.belt, training_class_id: trainingClass.$id, training_class: trainingClass.name, gub: scenario.gub, health_condition: index === 1 ? "yes" : "no", health_details: index === 1 ? "Asma leve, com uso de bombinha conforme orientação médica." : null, medications: index === 1 ? "Salbutamol, somente quando necessário." : null, allergies: index === 2 ? "Dipirona." : null, injuries: index === 0 ? "Entorse no tornozelo direito em 2023, sem limitações atuais." : null, guardian_contact: guardian ? `${guardian.full_name} — ${emergencyPhones[index]}` : null, status: "active", created_at: existingStudents.rows[0]?.$createdAt ?? now, updated_at: now }, ownerPermissions);

    const existingEnrollments = await tables.listRows<EnrollmentRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [student.$id]), Query.limit(1)] });
    const enrollmentId = existingEnrollments.rows[0]?.$id ?? demoId("enrollment", scenario.key);
    const contractStart = `${monthOffset(now, -2)}-01T12:00:00.000Z`;
    const contractEnd = `${monthOffset(now, 9)}-28T12:00:00.000Z`;
    const firstDueDate = demoDueDate(monthOffset(now, -1), scenario.dueDay);
    const enrollment = await upsertRow(APPWRITE_IDS.tables.enrollments, enrollmentId, { student_id: student.$id, status: "active", requested_due_day: scenario.dueDay, approved_due_day: scenario.dueDay, monthly_fee_cents: scenario.monthlyFeeCents, discount_cents: scenario.discountCents, first_due_date: firstDueDate, contract_start: contractStart, contract_end: contractEnd, revision: 2, submitted_at: contractStart, created_at: existingEnrollments.rows[0]?.$createdAt ?? now, updated_at: now }, ownerPermissions);

    const contractId = demoId("contract", scenario.key);
    const signer = guardian ?? profile;
    const snapshot = `${contractTemplate}\n\nAluno: ${profile.full_name}. Responsável: ${guardian?.full_name ?? "não se aplica"}. Mensalidade: R$ ${((scenario.monthlyFeeCents - scenario.discountCents) / 100).toFixed(2).replace(".", ",")}. Vencimento: dia ${scenario.dueDay}.`;
    const snapshotHash = createHash("sha256").update(snapshot).digest("hex");
    const signatureId = demoId("contract-signature", scenario.key);
    await upsertRow(APPWRITE_IDS.tables.contractSignatures, signatureId, { contract_id: contractId, signer_profile_id: signer.$id, signer_account_id: signer.account_id, signer_name: signer.full_name, signature_data_url: signatureDataUrl, content_hash: snapshotHash, user_agent: "Ebenert KD demo seed", accepted_at: contractStart, created_at: contractStart });
    await upsertRow(APPWRITE_IDS.tables.contracts, contractId, { enrollment_id: enrollment.$id, student_id: student.$id, version_id: versionId, version_number: 1, status: "signed", content_snapshot: snapshot, content_hash: snapshotHash, student_name: profile.full_name, guardian_name: guardian?.full_name ?? null, monthly_fee_cents: scenario.monthlyFeeCents - scenario.discountCents, starts_at: contractStart, ends_at: contractEnd, signature_id: signatureId, signed_at: contractStart, created_by_account_id: admin.account_id, created_at: contractStart, updated_at: now });

    for (const chargeDefinition of scenario.charges) {
      const chargeId = demoId("charge", `${scenario.key}:${chargeDefinition.competence}:monthly`);
      const amount = scenario.monthlyFeeCents - scenario.discountCents;
      const dueDate = demoDueDate(chargeDefinition.competence, scenario.dueDay);
      await upsertRow(APPWRITE_IDS.tables.charges, chargeId, { enrollment_id: enrollment.$id, student_id: student.$id, contract_id: contractId, charge_type: "monthly_fee", competence: chargeDefinition.competence, origin_id: contractId, amount_cents: amount, due_date: dueDate, status: chargeDefinition.state === "paid" ? "paid" : chargeDefinition.state, description: `Mensalidade ${chargeDefinition.competence}`, created_at: now, updated_at: now });
      if (chargeDefinition.state === "paid") {
        await upsertRow(APPWRITE_IDS.tables.payments, demoId("payment", chargeId), { charge_id: chargeId, method: "manual", amount_cents: amount, paid_at: now, status: "confirmed", recorded_by_account_id: admin.account_id, notes: "Recebimento confirmado pela secretaria.", created_at: now, updated_at: now });
        paymentCount += 1;
      }
      if (chargeDefinition.state === "proof_under_review") {
        const fileId = demoId("proof-file", chargeId);
        const proofName = `comprovante-${profile.full_name.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}.png`;
        await ensureFile(fileId, proofName, filePermissions);
        await upsertRow(APPWRITE_IDS.tables.paymentProofs, demoId("payment-proof", chargeId), { charge_id: chargeId, file_id: fileId, original_name: proofName, mime_type: "image/png", size_bytes: tinyPng.byteLength, version: 1, status: "pending", uploaded_by_account_id: signer.account_id, created_at: now, updated_at: now });
        proofCount += 1;
      }
      if (scenario.key === "minor" && chargeDefinition.state === "overdue") {
        const reversedPaymentId = demoId("reversed-payment", chargeId);
        await upsertRow(APPWRITE_IDS.tables.payments, reversedPaymentId, { charge_id: chargeId, method: "manual", amount_cents: amount, paid_at: dueDate, status: "reversed", recorded_by_account_id: admin.account_id, notes: "Recebimento lançado pela secretaria.", created_at: now, updated_at: now });
        await upsertRow(APPWRITE_IDS.tables.paymentReversals, demoId("payment-reversal", reversedPaymentId), { payment_id: reversedPaymentId, charge_id: chargeId, reason: "Pagamento lançado em duplicidade.", reversed_by_account_id: admin.account_id, reversed_at: now, created_at: now });
      }
    }
  }

  await upsertRow(APPWRITE_IDS.tables.auditEvents, demoId("audit", "demo-seed"), { actor_account_id: admin.account_id, event_type: "demo.seed.completed", entity_type: "project", entity_id: config.projectId.slice(0, 36), metadata: JSON.stringify({ students: scenarios.length, classes: classDefinitions.length, charges: scenarios.reduce((total, item) => total + item.charges.length, 0), payments: paymentCount, proofs: proofCount }), created_at: now });
  console.log(`Demo seed ready: ${scenarios.length} students, ${classDefinitions.length} classes, 3 contracts, 9 charges, ${paymentCount} confirmed payments, ${proofCount} pending proof.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
