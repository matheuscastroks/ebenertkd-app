import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { AppwriteException, Client, ID, Permission, Query, Role, Storage, TablesDB, Users, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { buildDemoScenario, demoDueDate, demoId, monthOffset, type DemoStudentScenario } from "./demo-seed-data";

loadEnvConfig(process.cwd());

type ProfileRow = Models.Row & { account_id: string; full_name: string; email: string; username?: string | null; role: string; capabilities: string[] };
type LinkRow = Models.Row & { guardian_profile_id: string; student_profile_id: string; status: string };
type StudentRow = Models.Row & { profile_id: string };
type EnrollmentRow = Models.Row & { student_id: string };
type ClassRow = Models.Row & { name: string };
type SeedRow = Models.Row & Record<string, unknown>;

const contractTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPORTIVOS

A academia Ebener TKD prestará aulas de Taekwondo ao aluno identificado neste contrato durante a vigência indicada. A mensalidade deverá ser paga até o vencimento escolhido e confirmado pela academia.

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
      try {
        return await tables.createRow<SeedRow>({ databaseId: config.databaseId, tableId, rowId, data, permissions });
      } catch (createErr) {
        console.error(`Failed createRow in table ${tableId} (rowId: ${rowId}):`, (createErr as Error).message, data);
        throw createErr;
      }
    }
  }

  async function ensureFile(fileId: string, name: string, permissions: string[], buffer = tinyPng) {
    try {
      return await storage.getFile({ bucketId: config.bucketId, fileId });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      return storage.createFile({ bucketId: config.bucketId, fileId, file: InputFile.fromBuffer(buffer, name), permissions });
    }
  }

  async function ensureImageFile(fileId: string, name: string, permissions: string[], url: string) {
    try {
      return await storage.getFile({ bucketId: config.bucketId, fileId });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      let buffer = tinyPng;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const arr = await res.arrayBuffer();
          if (arr.byteLength > 100) {
            buffer = Buffer.from(arr);
          }
        }
      } catch {
        // Fallback buffer
      }
      return storage.createFile({
        bucketId: config.bucketId,
        fileId,
        file: InputFile.fromBuffer(buffer, name),
        permissions
      });
    }
  }

  // 1. Atualizar e garantir as personas base (incluindo Ebener Santos como Admin)
  let profilesResult = await tables.listRows<ProfileRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.limit(100)] });
  const personas = [
    { oldEmail: "admin.teste@ebenertkd.app", email: "ricardo.almeida@ebenertkd.app", name: "Ebener Santos" },
    { oldEmail: "aluno.teste@ebenertkd.app", email: "camila.ferreira@ebenertkd.app", name: "Camila Ferreira" },
    { oldEmail: "responsavel.teste@ebenertkd.app", email: "juliana.mendes@ebenertkd.app", name: "Juliana Mendes" },
    { oldEmail: "menor.teste@minor.ebenertkd.internal", email: "lucas.mendes@minor.ebenertkd.internal", name: "Lucas Mendes", username: "lucas.mendes" },
    { oldEmail: "matheus.junior@minor.ebenertkd.internal", email: "pedro.ferreira@minor.ebenertkd.internal", name: "Pedro Ferreira", username: "pedro.ferreira" }
  ];

  for (const persona of personas) {
    const profile = profilesResult.rows.find((item) => item.email === persona.oldEmail || item.email === persona.email);
    if (profile) {
      await users.updateName({ userId: profile.account_id, name: persona.name });
      if (profile.email !== persona.email) await users.updateEmail({ userId: profile.account_id, email: persona.email });
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: profile.$id, data: { full_name: persona.name, email: persona.email, username: persona.username ?? null, updated_at: now } });
    }
  }

  profilesResult = await tables.listRows<ProfileRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.limit(100)] });
  const admin = profilesResult.rows.find((profile) => profile.role === "admin");
  if (!admin) throw new Error("demo_seed_admin_profile_missing");

  // 2. Turmas Oficiais de Taekwondo (incluindo Equipe de Competição e Turma Master)
  const classDefinitions = [
    { key: "adult-night", name: "Adulto noite", weekdays: ["Segunda", "Quarta", "Sexta"], start_time: "18:00", end_time: "19:30", location: "Dojang principal", capacity: 25 },
    { key: "children-morning", name: "Infantil manhã", weekdays: ["Terça", "Quinta"], start_time: "09:00", end_time: "10:00", location: "Sala infantil", capacity: 16 },
    { key: "youth-afternoon", name: "Juvenil tarde", weekdays: ["Terça", "Quinta", "Sábado"], start_time: "16:00", end_time: "17:15", location: "Dojang principal", capacity: 20 },
    { key: "competition-team", name: "Equipe de Competição", weekdays: ["Sábado"], start_time: "09:00", end_time: "11:30", location: "Dojang principal", capacity: 15 },
    { key: "masters-morning", name: "Turma Master & Avançados", weekdays: ["Terça", "Quinta"], start_time: "07:00", end_time: "08:15", location: "Dojang principal", capacity: 15 }
  ] as const;

  const existingClasses = await tables.listRows<ClassRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, queries: [Query.limit(100)] });
  const classes = new Map<string, SeedRow>();
  for (const definition of classDefinitions) {
    const existing = existingClasses.rows.find((item) => item.name === definition.name);
    const rowId = existing?.$id ?? demoId("class", definition.key);
    const row = await upsertRow(APPWRITE_IDS.tables.trainingClasses, rowId, {
      name: definition.name,
      weekdays: [...definition.weekdays],
      start_time: definition.start_time,
      end_time: definition.end_time,
      location: definition.location,
      capacity: definition.capacity,
      status: "active",
      created_by_account_id: admin.account_id,
      created_at: existing?.$createdAt ?? now,
      updated_at: now
    });
    classes.set(definition.key, row);
  }

  // 3. Contrato Padrão e Versão
  const templateId = demoId("contract-template", "default");
  const versionId = demoId("contract-version", "default-v1");
  const contentHash = createHash("sha256").update(contractTemplate).digest("hex");
  await upsertRow(APPWRITE_IDS.tables.contractVersions, versionId, { template_id: templateId, version: 1, content: contractTemplate, content_hash: contentHash, published_by_account_id: admin.account_id, published_at: now });
  await upsertRow(APPWRITE_IDS.tables.contractTemplates, templateId, { name: "Contrato padrão da academia", draft_content: contractTemplate, published_version_id: versionId, created_by_account_id: admin.account_id, updated_by_account_id: admin.account_id, created_at: now, updated_at: now });

  // 4. Configurações Financeiras (PIX em nome de Ebener Santos / Ebener TKD)
  const settingsRows = await tables.listRows({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.billingSettings, queries: [Query.limit(1)] });
  await upsertRow(APPWRITE_IDS.tables.billingSettings, settingsRows.rows[0]?.$id ?? demoId("billing-settings", "default"), {
    pix_key: "financeiro@ebenertkd.app",
    pix_key_type: "email",
    beneficiary_name: "Ebener Santos - Ebener TKD",
    instructions: "Após o pagamento via PIX, envie o comprovante diretamente pelo app para baixa imediata.",
    updated_by_account_id: admin.account_id,
    created_at: settingsRows.rows[0]?.$createdAt ?? now,
    updated_at: now
  });

  // 5. Exames de Graduação (1 Exame Concluído + 1 Exame Futuro Confirmado)
  const pastExamId = demoId("exam-event", "past-exam");
  const pastExam = await upsertRow(APPWRITE_IDS.tables.examEvents, pastExamId, {
    name: "31º Exame de Faixas — Primeiro Semestre",
    event_date: `${monthOffset(now, -3)}-15T12:00:00.000Z`,
    location: "Dojang Central Ebener TKD",
    default_fee_cents: 15000,
    status: "completed",
    created_by_account_id: admin.account_id,
    created_at: `${monthOffset(now, -4)}-01T12:00:00.000Z`,
    updated_at: now
  });

  const upcomingExamId = demoId("exam-event", "upcoming-exam");
  const upcomingExam = await upsertRow(APPWRITE_IDS.tables.examEvents, upcomingExamId, {
    name: "32º Exame de Faixas — Segundo Semestre",
    event_date: `${monthOffset(now, 1)}-10T12:00:00.000Z`,
    location: "Dojang Central Ebener TKD",
    default_fee_cents: 15000,
    status: "confirmed",
    created_by_account_id: admin.account_id,
    created_at: `${monthOffset(now, 0)}-01T12:00:00.000Z`,
    updated_at: now
  });

  // 6. Criar e Sincronizar todos os 22 Alunos com Ilha do Governador, Fotos e Estados
  const scenarios = buildDemoScenario(now);
  let paymentCount = 0;
  let proofCount = 0;
  let participantCount = 0;
  let beltHistoryCount = 0;

  // Cache de perfis
  profilesResult = await tables.listRows<ProfileRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, queries: [Query.limit(200)] });
  const profilesByEmail = new Map(profilesResult.rows.map((profile) => [profile.email, profile]));

  for (const [index, scenario] of scenarios.entries()) {
    let profile = profilesByEmail.get(scenario.email);

    // Se o perfil ainda não existir, criar usuário Appwrite e perfil
    if (!profile) {
      const existingUser = await users.list({ queries: [Query.equal("email", [scenario.email]), Query.limit(1)] });
      let accountId = existingUser.users[0]?.$id;
      if (!accountId) {
        const newUser = await users.create({
          userId: ID.unique(),
          email: scenario.email,
          password: "Aluno@EbenerTKD2026!",
          name: scenario.fullName
        });
        accountId = newUser.$id;
      }

      const newProfileRow = await upsertRow(APPWRITE_IDS.tables.profiles, demoId("profile", scenario.key), {
        account_id: accountId,
        full_name: scenario.fullName,
        email: scenario.email,
        username: scenario.username ?? null,
        role: scenario.role,
        capabilities: scenario.role === "minor_student" ? ["student"] : ["student"],
        status: "active",
        created_at: now,
        updated_at: now
      }, [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))]);

      profile = newProfileRow as unknown as ProfileRow;
      profilesByEmail.set(scenario.email, profile);
    }

    // Vincular responsável se for menor
    let guardianProfile: ProfileRow | undefined = undefined;
    if (scenario.role === "minor_student" && scenario.guardianEmail) {
      guardianProfile = profilesByEmail.get(scenario.guardianEmail);
      if (!guardianProfile && scenario.guardianName) {
        // Criar responsável
        const guardianUser = await users.list({ queries: [Query.equal("email", [scenario.guardianEmail]), Query.limit(1)] });
        let gAccountId = guardianUser.users[0]?.$id;
        if (!gAccountId) {
          const newGUser = await users.create({
            userId: ID.unique(),
            email: scenario.guardianEmail,
            password: "Aluno@EbenerTKD2026!",
            name: scenario.guardianName
          });
          gAccountId = newGUser.$id;
        }
        const gProfileRow = await upsertRow(APPWRITE_IDS.tables.profiles, demoId("profile", `guardian-${scenario.guardianEmail}`), {
          account_id: gAccountId,
          full_name: scenario.guardianName,
          email: scenario.guardianEmail,
          role: "guardian",
          capabilities: ["guardian"],
          status: "active",
          created_at: now,
          updated_at: now
        }, [Permission.read(Role.user(gAccountId)), Permission.update(Role.user(gAccountId))]);
        guardianProfile = gProfileRow as unknown as ProfileRow;
        profilesByEmail.set(scenario.guardianEmail, guardianProfile);
      }

      if (guardianProfile) {
        const existingLink = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.guardianStudentLinks,
          queries: [
            Query.equal("guardian_profile_id", [guardianProfile.$id]),
            Query.equal("student_profile_id", [profile.$id]),
            Query.limit(1)
          ]
        });
        const linkId = existingLink.rows[0]?.$id ?? demoId("link", `${guardianProfile.$id}:${profile.$id}`);

        await upsertRow(APPWRITE_IDS.tables.guardianStudentLinks, linkId, {
          guardian_profile_id: guardianProfile.$id,
          student_profile_id: profile.$id,
          status: "active",
          created_by_account_id: admin.account_id,
          created_at: existingLink.rows[0]?.$createdAt ?? now,
          updated_at: now
        });
      }
    }

    const accountIds = new Set([profile.account_id, guardianProfile?.account_id].filter((value): value is string => Boolean(value)));
    const ownerPermissions = [...accountIds].flatMap((accountId) => [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))]);
    const filePermissions = [...accountIds].map((accountId) => Permission.read(Role.user(accountId)));

    const primaryClass = classes.get(scenario.classKey);
    if (!primaryClass) throw new Error(`demo_seed_class_missing:${scenario.classKey}`);

    // Upsert Student
    const existingStudents = await tables.listRows<StudentRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] });
    const studentId = existingStudents.rows[0]?.$id ?? demoId("student", scenario.key);
    const studentStatus = scenario.enrollmentStatus === "under_review" ? "submitted" : scenario.enrollmentStatus === "paused" ? "inactive" : "active";

    const student = await upsertRow(APPWRITE_IDS.tables.students, studentId, {
      profile_id: profile.$id,
      full_name: scenario.fullName,
      cpf: scenario.cpf,
      birth_date: dateTime(scenario.birthDate),
      whatsapp: scenario.phone,
      address: scenario.address,
      emergency_contact_name: scenario.guardianName ?? "Contato Familiar",
      emergency_contact_relationship: scenario.role === "minor_student" ? "Responsável" : "Familiar",
      emergency_contact_phone: scenario.guardianPhone ?? scenario.phone,
      started_at_tkd: dateTime(`${2022 + (index % 4)}-02-01`),
      current_belt: scenario.belt,
      training_class_id: primaryClass.$id,
      training_class: primaryClass.name,
      gub: scenario.gub,
      health_condition: scenario.healthCondition ?? "no",
      health_details: scenario.healthDetails ?? null,
      medications: scenario.medications ?? null,
      allergies: scenario.allergies ?? null,
      injuries: scenario.injuries ?? null,
      guardian_contact: guardianProfile ? `${guardianProfile.full_name} — ${scenario.guardianPhone ?? scenario.phone}` : null,
      status: studentStatus,
      created_at: existingStudents.rows[0]?.$createdAt ?? now,
      updated_at: now
    }, ownerPermissions);

    // Upsert Foto de Perfil Real em Appwrite Storage & StudentDocuments
    const photoFileId = demoId("photo-file", scenario.key);
    const photoName = `foto-${scenario.key}.jpg`;
    const photoFile = await ensureImageFile(photoFileId, photoName, filePermissions, scenario.photoUrl);

    const existingDocs = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.studentDocuments,
      queries: [
        Query.equal("student_id", [student.$id]),
        Query.equal("document_type", ["profile_photo"]),
        Query.limit(1)
      ]
    });
    const photoDocId = existingDocs.rows[0]?.$id ?? demoId("photo-doc", scenario.key);

    await upsertRow(APPWRITE_IDS.tables.studentDocuments, photoDocId, {
      student_id: student.$id,
      document_type: "profile_photo",
      file_id: photoFileId,
      original_name: photoName,
      mime_type: "image/jpeg",
      size_bytes: photoFile.sizeOriginal || 4096,
      status: "approved",
      uploaded_by_account_id: profile.account_id,
      created_at: existingDocs.rows[0]?.$createdAt ?? now,
      updated_at: now
    });

    // Upsert Enrollment
    const existingEnrollments = await tables.listRows<EnrollmentRow>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [student.$id]), Query.limit(1)] });
    const enrollmentId = existingEnrollments.rows[0]?.$id ?? demoId("enrollment", scenario.key);
    const contractStart = `${monthOffset(now, -2)}-01T12:00:00.000Z`;
    const contractEnd = `${monthOffset(now, 9)}-28T12:00:00.000Z`;
    const firstDueDate = demoDueDate(monthOffset(now, -1), scenario.dueDay);

    const enrollment = await upsertRow(APPWRITE_IDS.tables.enrollments, enrollmentId, {
      student_id: student.$id,
      status: scenario.enrollmentStatus ?? "active",
      requested_due_day: scenario.dueDay,
      approved_due_day: scenario.dueDay,
      monthly_fee_cents: scenario.monthlyFeeCents,
      discount_cents: scenario.discountCents,
      first_due_date: firstDueDate,
      contract_start: contractStart,
      contract_end: contractEnd,
      revision: 2,
      submitted_at: contractStart,
      created_at: existingEnrollments.rows[0]?.$createdAt ?? now,
      updated_at: now
    }, ownerPermissions);

    // Upsert Class Enrollments (suporte a Multi-Turma!)
    const activeClassKeys = scenario.classKeys ?? [scenario.classKey];
    for (const classKey of activeClassKeys) {
      const cls = classes.get(classKey);
      if (cls) {
        const existingClassEnrollments = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.classEnrollments,
          queries: [
            Query.equal("training_class_id", [cls.$id]),
            Query.equal("enrollment_id", [enrollment.$id]),
            Query.limit(1)
          ]
        });
        const classEnrollmentRowId = existingClassEnrollments.rows[0]?.$id ?? demoId("class-enrollment", `${scenario.key}:${classKey}`);

        await upsertRow(APPWRITE_IDS.tables.classEnrollments, classEnrollmentRowId, {
          training_class_id: cls.$id,
          enrollment_id: enrollment.$id,
          student_id: student.$id,
          status: "active",
          started_at: contractStart,
          created_at: existingClassEnrollments.rows[0]?.$createdAt ?? contractStart,
          updated_at: now
        });
      }
    }

    // Upsert Contrato e Assinatura
    const existingContracts = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.contracts,
      queries: [
        Query.equal("enrollment_id", [enrollment.$id]),
        Query.limit(1)
      ]
    });
    const contractId = existingContracts.rows[0]?.$id ?? demoId("contract", scenario.key);
    const signer = guardianProfile ?? profile;
    const snapshot = `${contractTemplate}\n\nAluno: ${scenario.fullName}. Responsável: ${guardianProfile?.full_name ?? "não se aplica"}. Mensalidade: R$ ${((scenario.monthlyFeeCents - scenario.discountCents) / 100).toFixed(2).replace(".", ",")}. Vencimento: dia ${scenario.dueDay}. Endereço: ${scenario.address}.`;
    const snapshotHash = createHash("sha256").update(snapshot).digest("hex");

    const existingSignatures = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.contractSignatures,
      queries: [
        Query.equal("contract_id", [contractId]),
        Query.limit(1)
      ]
    });
    const signatureId = existingSignatures.rows[0]?.$id ?? demoId("contract-signature", scenario.key);

    await upsertRow(APPWRITE_IDS.tables.contractSignatures, signatureId, {
      contract_id: contractId,
      signer_profile_id: signer.$id,
      signer_account_id: signer.account_id,
      signer_name: signer.full_name,
      signature_data_url: signatureDataUrl,
      content_hash: snapshotHash,
      user_agent: "Ebener TKD demo seed",
      accepted_at: contractStart,
      created_at: existingSignatures.rows[0]?.$createdAt ?? contractStart
    });

    await upsertRow(APPWRITE_IDS.tables.contracts, contractId, {
      enrollment_id: enrollment.$id,
      student_id: student.$id,
      version_id: versionId,
      version_number: 1,
      status: "signed",
      content_snapshot: snapshot,
      content_hash: snapshotHash,
      student_name: scenario.fullName,
      guardian_name: guardianProfile?.full_name ?? null,
      monthly_fee_cents: scenario.monthlyFeeCents - scenario.discountCents,
      starts_at: contractStart,
      ends_at: contractEnd,
      signature_id: signatureId,
      signed_at: contractStart,
      created_by_account_id: admin.account_id,
      created_at: existingContracts.rows[0]?.$createdAt ?? contractStart,
      updated_at: now
    });

    // Upsert Cobranças Mensais & Pagamentos
    for (const chargeDefinition of scenario.charges) {
      const amount = scenario.monthlyFeeCents - scenario.discountCents;
      const dueDate = demoDueDate(chargeDefinition.competence, scenario.dueDay);

      const existingCharges = await tables.listRows({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.charges,
        queries: [
          Query.equal("enrollment_id", [enrollment.$id]),
          Query.equal("charge_type", ["monthly_fee"]),
          Query.equal("competence", [chargeDefinition.competence]),
          Query.equal("origin_id", [contractId]),
          Query.limit(1)
        ]
      });
      const chargeId = existingCharges.rows[0]?.$id ?? demoId("charge", `${scenario.key}:${chargeDefinition.competence}:monthly`);

      await upsertRow(APPWRITE_IDS.tables.charges, chargeId, {
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        contract_id: contractId,
        charge_type: "monthly_fee",
        competence: chargeDefinition.competence,
        origin_id: contractId,
        amount_cents: amount,
        due_date: dueDate,
        status: chargeDefinition.state === "paid" ? "paid" : chargeDefinition.state,
        description: `Mensalidade ${chargeDefinition.competence}`,
        created_at: existingCharges.rows[0]?.$createdAt ?? now,
        updated_at: now
      });

      if (chargeDefinition.state === "paid") {
        const existingPayments = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.payments,
          queries: [Query.equal("charge_id", [chargeId]), Query.limit(1)]
        });
        const paymentId = existingPayments.rows[0]?.$id ?? demoId("payment", chargeId);

        await upsertRow(APPWRITE_IDS.tables.payments, paymentId, {
          charge_id: chargeId,
          method: "manual",
          amount_cents: amount,
          paid_at: now,
          status: "confirmed",
          recorded_by_account_id: admin.account_id,
          notes: "Recebimento confirmado via PIX pela secretaria.",
          created_at: existingPayments.rows[0]?.$createdAt ?? now,
          updated_at: now
        });
        paymentCount += 1;
      }

      if (chargeDefinition.state === "proof_under_review") {
        const fileId = demoId("proof-file", chargeId);
        const proofName = `comprovante-${scenario.key}.png`;
        await ensureFile(fileId, proofName, filePermissions);

        const existingProofs = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.paymentProofs,
          queries: [Query.equal("charge_id", [chargeId]), Query.equal("version", [1]), Query.limit(1)]
        });
        const proofDocId = existingProofs.rows[0]?.$id ?? demoId("payment-proof", chargeId);

        await upsertRow(APPWRITE_IDS.tables.paymentProofs, proofDocId, {
          charge_id: chargeId,
          file_id: fileId,
          original_name: proofName,
          mime_type: "image/png",
          size_bytes: tinyPng.byteLength,
          version: 1,
          status: "pending",
          uploaded_by_account_id: signer.account_id,
          created_at: existingProofs.rows[0]?.$createdAt ?? now,
          updated_at: now
        });
        proofCount += 1;
      }
    }

    // Upsert Participação em Exame de Faixa (se configurado)
    if (scenario.examParticipation) {
      const eventId = scenario.examParticipation.eventIdKey === "past-exam" ? pastExamId : upcomingExamId;
      const existingParticipants = await tables.listRows({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.examParticipants,
        queries: [
          Query.equal("event_id", [eventId]),
          Query.equal("student_id", [student.$id]),
          Query.limit(1)
        ]
      });
      const participantId = existingParticipants.rows[0]?.$id ?? demoId("participant", `${scenario.key}:${scenario.examParticipation.eventIdKey}`);

      let examChargeId: string | null = null;
      if (scenario.examParticipation.chargeStatus) {
        const examCompetence = monthOffset(now, scenario.examParticipation.eventIdKey === "past-exam" ? -3 : 1);
        const examFee = scenario.examParticipation.feeCents;

        const existingExamCharges = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.charges,
          queries: [
            Query.equal("enrollment_id", [enrollment.$id]),
            Query.equal("charge_type", ["exam_fee"]),
            Query.equal("competence", [examCompetence]),
            Query.equal("origin_id", [eventId]),
            Query.limit(1)
          ]
        });
        examChargeId = existingExamCharges.rows[0]?.$id ?? demoId("charge", `${scenario.key}:${scenario.examParticipation.eventIdKey}:exam-fee`);

        await upsertRow(APPWRITE_IDS.tables.charges, examChargeId, {
          enrollment_id: enrollment.$id,
          student_id: student.$id,
          contract_id: contractId,
          charge_type: "exam_fee",
          competence: examCompetence,
          origin_id: eventId,
          amount_cents: examFee,
          due_date: `${examCompetence}-10T12:00:00.000Z`,
          status: scenario.examParticipation.chargeStatus === "paid" ? "paid" : scenario.examParticipation.chargeStatus,
          description: `Taxa individual do exame de graduação - Faixa ${scenario.examParticipation.targetBelt}`,
          created_at: existingExamCharges.rows[0]?.$createdAt ?? now,
          updated_at: now
        });

        if (scenario.examParticipation.chargeStatus === "paid") {
          const existingExamPayments = await tables.listRows({
            databaseId: config.databaseId,
            tableId: APPWRITE_IDS.tables.payments,
            queries: [Query.equal("charge_id", [examChargeId]), Query.limit(1)]
          });
          const paymentId = existingExamPayments.rows[0]?.$id ?? demoId("payment", examChargeId);

          await upsertRow(APPWRITE_IDS.tables.payments, paymentId, {
            charge_id: examChargeId,
            method: "manual",
            amount_cents: examFee,
            paid_at: now,
            status: "confirmed",
            recorded_by_account_id: admin.account_id,
            notes: "Taxa de exame quitada antecipadamente.",
            created_at: existingExamPayments.rows[0]?.$createdAt ?? now,
            updated_at: now
          });
          paymentCount += 1;
        }

        if (scenario.examParticipation.chargeStatus === "proof_under_review") {
          const fileId = demoId("proof-file", examChargeId);
          const proofName = `comprovante-exame-${scenario.key}.png`;
          await ensureFile(fileId, proofName, filePermissions);

          const existingExamProofs = await tables.listRows({
            databaseId: config.databaseId,
            tableId: APPWRITE_IDS.tables.paymentProofs,
            queries: [Query.equal("charge_id", [examChargeId]), Query.equal("version", [1]), Query.limit(1)]
          });
          const proofDocId = existingExamProofs.rows[0]?.$id ?? demoId("payment-proof", examChargeId);

          await upsertRow(APPWRITE_IDS.tables.paymentProofs, proofDocId, {
            charge_id: examChargeId,
            file_id: fileId,
            original_name: proofName,
            mime_type: "image/png",
            size_bytes: tinyPng.byteLength,
            version: 1,
            status: "pending",
            uploaded_by_account_id: signer.account_id,
            created_at: existingExamProofs.rows[0]?.$createdAt ?? now,
            updated_at: now
          });
          proofCount += 1;
        }
      }

      await upsertRow(APPWRITE_IDS.tables.examParticipants, participantId, {
        event_id: eventId,
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        target_belt: scenario.examParticipation.targetBelt,
        target_gub: scenario.examParticipation.targetGub,
        fee_cents: scenario.examParticipation.feeCents,
        charge_id: examChargeId,
        status: scenario.examParticipation.status,
        result_notes: scenario.examParticipation.notes ?? null,
        created_at: existingParticipants.rows[0]?.$createdAt ?? now,
        updated_at: now
      });
      participantCount += 1;

      // Se teve aprovação no passado, gravar no histórico oficial de faixas
      if (scenario.pastExamRecord) {
        const existingBeltHistory = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.beltHistory,
          queries: [Query.equal("exam_participant_id", [participantId]), Query.limit(1)]
        });
        const historyId = existingBeltHistory.rows[0]?.$id ?? demoId("belt-history", `${scenario.key}:past-exam`);

        await upsertRow(APPWRITE_IDS.tables.beltHistory, historyId, {
          student_id: student.$id,
          event_id: pastExamId,
          exam_participant_id: participantId,
          previous_belt: scenario.pastExamRecord.previousBelt,
          previous_gub: scenario.pastExamRecord.previousGub,
          new_belt: scenario.pastExamRecord.newBelt,
          new_gub: scenario.pastExamRecord.newGub,
          achieved_at: scenario.pastExamRecord.achievedAt,
          created_at: existingBeltHistory.rows[0]?.$createdAt ?? now
        });
        beltHistoryCount += 1;
      }
    }
  }

  // 7. Aulas e Presenças Recentes nas Turmas
  const recentDates = [
    { date: "2026-09-21", time: "18:00" },
    { date: "2026-09-23", time: "18:00" },
    { date: "2026-09-25", time: "18:00" }
  ];

  for (const [classKey, classRow] of classes.entries()) {
    const classEnrollments = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.classEnrollments,
      queries: [Query.equal("training_class_id", [classRow.$id]), Query.limit(100)]
    });

    for (const recent of recentDates) {
      const lessonDateIso = `${recent.date}T12:00:00.000Z`;
      const existingLessons = await tables.listRows({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.lessons,
        queries: [
          Query.equal("training_class_id", [classRow.$id]),
          Query.equal("lesson_date", [lessonDateIso]),
          Query.equal("start_time", [classRow.start_time as string]),
          Query.limit(1)
        ]
      });
      const lessonId = existingLessons.rows[0]?.$id ?? demoId("lesson", `${classKey}:${recent.date}`);

      await upsertRow(APPWRITE_IDS.tables.lessons, lessonId, {
        training_class_id: classRow.$id,
        lesson_date: lessonDateIso,
        start_time: classRow.start_time as string,
        end_time: classRow.end_time as string,
        lesson_type: "regular",
        status: "completed",
        created_by_account_id: admin.account_id,
        created_at: existingLessons.rows[0]?.$createdAt ?? lessonDateIso,
        updated_at: now
      });

      for (const enr of classEnrollments.rows) {
        const existingAttendance = await tables.listRows({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.attendanceRecords,
          queries: [
            Query.equal("lesson_id", [lessonId]),
            Query.equal("class_enrollment_id", [enr.$id]),
            Query.limit(1)
          ]
        });
        const attendanceId = existingAttendance.rows[0]?.$id ?? demoId("attendance", `${lessonId}:${enr.$id}`);

        await upsertRow(APPWRITE_IDS.tables.attendanceRecords, attendanceId, {
          lesson_id: lessonId,
          class_enrollment_id: enr.$id,
          enrollment_id: enr.enrollment_id as string,
          student_id: enr.student_id as string,
          status: "present",
          recorded_by_account_id: admin.account_id,
          created_at: existingAttendance.rows[0]?.$createdAt ?? `${recent.date}T19:30:00.000Z`,
          updated_at: now
        });
      }
    }
  }

  await upsertRow(APPWRITE_IDS.tables.auditEvents, demoId("audit", "demo-seed"), {
    actor_account_id: admin.account_id,
    event_type: "demo.seed.completed",
    entity_type: "project",
    entity_id: config.projectId.slice(0, 36),
    metadata: JSON.stringify({
      students: scenarios.length,
      classes: classDefinitions.length,
      participants: participantCount,
      beltHistories: beltHistoryCount,
      payments: paymentCount,
      proofs: proofCount
    }),
    created_at: now
  });

  console.log(`\n======================================================`);
  console.log(`✅ Seed completo da Ebener TKD executado com sucesso!`);
  console.log(`🥋 Administrador Mestre: Ebener Santos`);
  console.log(`👥 Alunos cadastrados: ${scenarios.length} (todos na Ilha do Governador/RJ)`);
  console.log(`📸 Fotos de perfil sincronizadas no Appwrite Storage`);
  console.log(`🥋 Turmas ativas: ${classDefinitions.length} (incluindo Equipe de Competição & Master)`);
  console.log(`🏆 Exames de faixa: 31º Exame (Concluído) & 32º Exame (Confirmado)`);
  console.log(`📋 Candidatos em bancas de exame: ${participantCount}`);
  console.log(`💰 Pagamentos confirmados: ${paymentCount} | Comprovantes em análise: ${proofCount}`);
  console.log(`======================================================\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
