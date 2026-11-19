import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { AppwriteException, Client, ID, Permission, Query, Role, Storage, TablesDB, Users, type Models } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_CONTRACT_POLICY } from "../../src/features/academy/defaults";
import { DEFAULT_RANK_SETTINGS } from "../../src/features/academy/rank-defaults";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { testPersonas } from "./test-personas";
import {
  buildDemoScenario,
  demoDueDate,
  demoExamDefinitions,
  demoId,
  monthOffset,
  type DemoStudentScenario
} from "./demo-seed-data";

loadEnvConfig(process.cwd());

type ProfileRow = Models.Row & {
  account_id: string;
  full_name: string;
  email: string;
  username?: string | null;
  role: string;
  capabilities: string[];
};
type StudentRow = Models.Row & { profile_id: string };
type EnrollmentRow = Models.Row & { student_id: string };
type ClassRow = Models.Row & { name: string };
type SeedRow = Models.Row & Record<string, unknown>;

const contractTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPORTIVOS

A academia Ebener Taekwondo prestará aulas de Taekwondo ao aluno identificado neste contrato durante a vigência indicada. A mensalidade deverá ser paga até o vencimento escolhido e confirmado pela academia.

O aluno ou responsável poderá solicitar saída sem ônus quando comunicar até o dia 20 do mês anterior. Depois desse prazo será devida uma mensalidade de rescisão contratual. Após mais de seis meses afastado, poderá ser cobrada nova taxa de matrícula.

O aluno e seu responsável declaram verdadeiras as informações cadastrais e de saúde apresentadas à academia Ebener Taekwondo.`;

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const signatureDataUrl = `data:image/png;base64,${tinyPng.toString("base64")}`;
const dateTime = (date: string) => (date.includes("T") ? date : `${date}T12:00:00.000Z`);

const parqAnswersNo = JSON.stringify({
  q1: "no", q2: "no", q3: "no", q4: "no", q5: "no",
  q6: "no", q7: "no", q8: "no", q9: "no", q10: "no"
});

const parqAnswersYes = JSON.stringify({
  q1: "no", q2: "no", q3: "no", q4: "no", q5: "no",
  q6: "yes", q7: "no", q8: "yes", q9: "no", q10: "no"
});

async function parallelRun<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const config = readServerAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const tables = new TablesDB(client);
  const storage = new Storage(client);
  const users = new Users(client);
  const now = new Date().toISOString();

  async function upsertRow(
    tableId: string,
    rowId: string,
    data: Record<string, unknown>,
    permissions: string[] = []
  ): Promise<SeedRow> {
    try {
      return (await tables.updateRow<SeedRow>({
        databaseId: config.databaseId,
        tableId,
        rowId,
        data,
        permissions
      })) as unknown as SeedRow;
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        try {
          return (await tables.createRow<SeedRow>({
            databaseId: config.databaseId,
            tableId,
            rowId,
            data,
            permissions
          })) as unknown as SeedRow;
        } catch (createErr) {
          if (createErr instanceof AppwriteException && createErr.code === 409) {
            return (await tables.updateRow<SeedRow>({
              databaseId: config.databaseId,
              tableId,
              rowId,
              data,
              permissions
            })) as unknown as SeedRow;
          }
          throw createErr;
        }
      }
      throw error;
    }
  }

  async function ensureFile(fileId: string, name: string, permissions: string[], buffer = tinyPng) {
    try {
      return await storage.getFile({ bucketId: config.bucketId, fileId });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      return storage.createFile({
        bucketId: config.bucketId,
        fileId,
        file: InputFile.fromBuffer(buffer, name),
        permissions
      });
    }
  }

  async function ensureImageFile(fileId: string, name: string, permissions: string[], url: string) {
    try {
      return await storage.getFile({ bucketId: config.bucketId, fileId });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 404) throw error;
      let buffer = tinyPng;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const arr = await res.arrayBuffer();
          if (arr.byteLength > 100) buffer = Buffer.from(arr);
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

  console.log("🥋 [1/9] Sincronizando contas base e perfis de teste...");
  let profilesResult = await tables.listRows<ProfileRow>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [Query.limit(200)]
  });

  const personas = testPersonas();
  for (const persona of personas) {
    let profile = profilesResult.rows.find((item) => item.email === persona.email);
    let accountId: string;

    const existingUsers = await users.list({ queries: [Query.equal("email", [persona.email]), Query.limit(1)] });
    if (existingUsers.users[0]) {
      accountId = existingUsers.users[0].$id;
      await users.updatePassword({ userId: accountId, password: persona.password });
      await users.updateName({ userId: accountId, name: persona.name });
      await users.updateStatus({ userId: accountId, status: true });
    } else {
      const newUser = await users.create({
        userId: ID.unique(),
        email: persona.email,
        password: persona.password,
        name: persona.name
      });
      accountId = newUser.$id;
    }

    const profileData = {
      account_id: accountId,
      full_name: persona.name,
      email: persona.email,
      username: persona.username ?? null,
      role: persona.role,
      capabilities: persona.capabilities,
      status: "active",
      updated_at: now
    };
    const permissions = [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))];

    if (profile) {
      await tables.updateRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.profiles,
        rowId: profile.$id,
        data: profileData,
        permissions
      });
    } else {
      await tables.createRow({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.profiles,
        rowId: demoId("profile", persona.key),
        data: { ...profileData, created_at: now },
        permissions
      });
    }
  }

  // Obter perfil admin
  profilesResult = await tables.listRows<ProfileRow>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [Query.limit(200)]
  });
  const admin = profilesResult.rows.find((p) => p.role === "admin");
  if (!admin) throw new Error("demo_seed_admin_profile_missing");

  console.log("🥋 [2/9] Configurando Turmas Oficiais de Taekwondo...");
  const classDefinitions = [
    { key: "adult-night", name: "Adulto noite", weekdays: ["Segunda", "Quarta", "Sexta"], start_time: "18:00", end_time: "19:30", location: "Dojang principal", capacity: 25 },
    { key: "children-morning", name: "Infantil manhã", weekdays: ["Terça", "Quinta"], start_time: "09:00", end_time: "10:00", location: "Sala infantil", capacity: 16 },
    { key: "youth-afternoon", name: "Juvenil tarde", weekdays: ["Terça", "Quinta", "Sábado"], start_time: "16:00", end_time: "17:15", location: "Dojang principal", capacity: 20 },
    { key: "competition-team", name: "Equipe de Competição", weekdays: ["Sábado"], start_time: "09:00", end_time: "11:30", location: "Dojang principal", capacity: 15 },
    { key: "masters-morning", name: "Turma Master & Avançados", weekdays: ["Terça", "Quinta"], start_time: "07:00", end_time: "08:15", location: "Dojang principal", capacity: 15 }
  ] as const;

  // Locais de treino de demonstração (tabela training_locations; as turmas guardam só o nome do local).
  const demoLocations = [
    { key: "main", name: "Dojang principal", is_default: true },
    { key: "kids", name: "Sala infantil", is_default: false }
  ];
  for (const location of demoLocations) {
    await upsertRow(APPWRITE_IDS.tables.trainingLocations, demoId("location", location.key), {
      name: location.name,
      is_default: location.is_default,
      status: "active",
      updated_by_account_id: admin.account_id,
      created_at: now,
      updated_at: now
    });
  }

  const existingClasses = await tables.listRows<ClassRow>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.trainingClasses,
    queries: [Query.limit(100)]
  });
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

  console.log("📜 [3/9] Configurando Contrato Padrão e Parâmetros Financeiros...");
  const templateId = demoId("contract-template", "default");
  const versionId = demoId("contract-version", "default-v1");
  const contentHash = createHash("sha256").update(contractTemplate).digest("hex");
  await upsertRow(APPWRITE_IDS.tables.contractVersions, versionId, {
    template_id: templateId,
    version: 1,
    content: contractTemplate,
    content_hash: contentHash,
    published_by_account_id: admin.account_id,
    published_at: now
  });
  await upsertRow(APPWRITE_IDS.tables.contractTemplates, templateId, {
    name: "Contrato padrão da academia",
    draft_content: contractTemplate,
    published_version_id: versionId,
    created_by_account_id: admin.account_id,
    updated_by_account_id: admin.account_id,
    created_at: now,
    updated_at: now
  });

  const settingsRows = await tables.listRows({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.billingSettings,
    queries: [Query.limit(1)]
  });
  await upsertRow(
    APPWRITE_IDS.tables.billingSettings,
    settingsRows.rows[0]?.$id ?? demoId("billing-settings", "default"),
    {
      pix_key: "financeiro@ebenertkd.app",
      pix_key_type: "email",
      beneficiary_name: "Ebener Santos - Ebener Taekwondo",
      instructions: "Após o pagamento via PIX, anexe o comprovante pelo aplicativo para liberação imediata do ciclo.",
      updated_by_account_id: admin.account_id,
      created_at: settingsRows.rows[0]?.$createdAt ?? now,
      updated_at: now
    }
  );

  console.log("🏆 [4/9] Sincronizando Exames de Faixa (2025 - 2026)...");
  const examDefinitions = demoExamDefinitions(now);
  const examMap = new Map<string, SeedRow>();
  for (const def of examDefinitions) {
    const rowId = demoId("exam-event", def.key);
    const row = await upsertRow(APPWRITE_IDS.tables.examEvents, rowId, {
      name: def.name,
      event_date: def.event_date,
      location: def.location,
      default_fee_cents: def.default_fee_cents,
      status: def.status,
      created_by_account_id: admin.account_id,
      created_at: def.created_at,
      updated_at: now
    });
    examMap.set(def.key, row);
  }

  console.log("👥 [5/9] Processando Alunos, Matrículas e Documentos de Saúde...");
  const scenarios = buildDemoScenario(now);
  profilesResult = await tables.listRows<ProfileRow>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [Query.limit(200)]
  });
  const profilesByEmail = new Map(profilesResult.rows.map((p) => [p.email, p]));

  // Cache para mapear estudante e matrícula
  const studentRowsByKey = new Map<string, SeedRow>();
  const enrollmentRowsByKey = new Map<string, SeedRow>();
  const signerByKey = new Map<string, ProfileRow>();

  for (const scenario of scenarios) {
    let profile = profilesByEmail.get(scenario.email);
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
      const newProfile = await upsertRow(
        APPWRITE_IDS.tables.profiles,
        demoId("profile", scenario.key),
        {
          account_id: accountId,
          full_name: scenario.fullName,
          email: scenario.email,
          username: scenario.username ?? null,
          role: scenario.role,
          capabilities: ["student"],
          status: "active",
          created_at: now,
          updated_at: now
        },
        [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))]
      );
      profile = newProfile as unknown as ProfileRow;
      profilesByEmail.set(scenario.email, profile);
    }

    let guardianProfile: ProfileRow | undefined = undefined;
    if (scenario.role === "minor_student" && scenario.guardianEmail) {
      guardianProfile = profilesByEmail.get(scenario.guardianEmail);
      if (!guardianProfile && scenario.guardianName) {
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
        const gProfileRow = await upsertRow(
          APPWRITE_IDS.tables.profiles,
          demoId("profile", `guardian-${scenario.guardianEmail}`),
          {
            account_id: gAccountId,
            full_name: scenario.guardianName,
            email: scenario.guardianEmail,
            role: "guardian",
            capabilities: ["guardian"],
            status: "active",
            created_at: now,
            updated_at: now
          },
          [Permission.read(Role.user(gAccountId)), Permission.update(Role.user(gAccountId))]
        );
        guardianProfile = gProfileRow as unknown as ProfileRow;
        profilesByEmail.set(scenario.guardianEmail, guardianProfile);
      }

      if (guardianProfile) {
        // O seed de usuários de teste já pode ter criado este vínculo com outro ID (índice único guardian+student).
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
          created_at: now,
          updated_at: now
        });
      }
    }

    const signer = guardianProfile ?? profile;
    signerByKey.set(scenario.key, signer);

    const accountIds = new Set([profile.account_id, guardianProfile?.account_id].filter(Boolean));
    const ownerPermissions = [...accountIds].flatMap((id) => [Permission.read(Role.user(id!)), Permission.update(Role.user(id!))]);
    const filePermissions = [...accountIds].map((id) => Permission.read(Role.user(id!)));

    const primaryClass = classes.get(scenario.classKey);
    if (!primaryClass) throw new Error(`demo_seed_class_missing:${scenario.classKey}`);

    const studentStatus =
      scenario.enrollmentStatus === "draft"
        ? "draft"
        : scenario.enrollmentStatus === "submitted" || scenario.enrollmentStatus === "under_review"
          ? "submitted"
          : scenario.enrollmentStatus === "paused" || scenario.enrollmentStatus === "cancelled"
            ? "inactive"
            : "active";

    const studentId = demoId("student", scenario.key);
    const student = await upsertRow(
      APPWRITE_IDS.tables.students,
      studentId,
      {
        profile_id: profile.$id,
        full_name: scenario.fullName,
        cpf: scenario.cpf,
        birth_date: dateTime(scenario.birthDate),
        whatsapp: scenario.phone,
        address: scenario.address,
        emergency_contact_name: scenario.guardianName ?? "Contato Familiar",
        emergency_contact_relationship: scenario.role === "minor_student" ? "Responsável Legal" : "Familiar",
        emergency_contact_phone: scenario.guardianPhone ?? scenario.phone,
        started_at_tkd: dateTime(`${scenario.startMonth ?? "2025-01"}-01`),
        rank_key: scenario.rankKey,
        training_class_id: primaryClass.$id,
        training_class: primaryClass.name,
        health_condition: scenario.healthCondition ?? "no",
        health_details: scenario.healthDetails ?? null,
        medications: scenario.medications ?? null,
        allergies: scenario.allergies ?? null,
        injuries: scenario.injuries ?? null,
        guardian_contact: guardianProfile ? `${guardianProfile.full_name} — ${scenario.guardianPhone ?? scenario.phone}` : null,
        status: studentStatus,
        created_at: dateTime(`${scenario.startMonth ?? "2025-01"}-01`),
        updated_at: now
      },
      ownerPermissions
    );
    studentRowsByKey.set(scenario.key, student);

    // Foto de perfil
    const photoFileId = demoId("photo-file", scenario.key);
    const photoName = `foto-${scenario.key}.jpg`;
    const photoFile = await ensureImageFile(photoFileId, photoName, filePermissions, scenario.photoUrl);
    await upsertRow(APPWRITE_IDS.tables.studentDocuments, demoId("photo-doc", scenario.key), {
      student_id: student.$id,
      document_type: "profile_photo",
      file_id: photoFileId,
      original_name: photoName,
      mime_type: "image/jpeg",
      size_bytes: photoFile.sizeOriginal || 4096,
      status: "approved",
      uploaded_by_account_id: profile.account_id,
      created_at: dateTime(`${scenario.startMonth ?? "2025-01"}-01`),
      updated_at: now
    });

    // Matrícula
    const enrollmentId = demoId("enrollment", scenario.key);
    const contractStart =
      scenario.enrollmentStatus === "awaiting_renewal"
        ? "2025-01-01T12:00:00.000Z"
        : scenario.enrollmentStatus === "cancelled"
          ? "2025-05-01T12:00:00.000Z"
          : `${scenario.startMonth ?? "2025-01"}-01T12:00:00.000Z`;

    const contractEnd =
      scenario.enrollmentStatus === "awaiting_renewal"
        ? "2026-01-01T12:00:00.000Z"
        : scenario.enrollmentStatus === "cancelled"
          ? "2026-04-30T12:00:00.000Z"
          : `${monthOffset(now, 10)}-28T12:00:00.000Z`;

    const enrollment = await upsertRow(
      APPWRITE_IDS.tables.enrollments,
      enrollmentId,
      {
        student_id: student.$id,
        status: scenario.enrollmentStatus,
        requested_due_day: scenario.dueDay,
        approved_due_day: scenario.dueDay,
        monthly_fee_cents: scenario.monthlyFeeCents,
        discount_cents: scenario.discountCents,
        first_due_date: demoDueDate(scenario.startMonth ?? "2025-01", scenario.dueDay),
        contract_start: contractStart,
        contract_end: contractEnd,
        access_override_until: scenario.accessOverrideUntil ?? null,
        revision: 1,
        submitted_at: contractStart,
        created_at: contractStart,
        updated_at: now
      },
      ownerPermissions
    );
    enrollmentRowsByKey.set(scenario.key, enrollment);

    // Enturmação
    if (scenario.enrollmentStatus !== "draft") {
      const activeClassKeys = scenario.classKeys ?? [scenario.classKey];
      for (const classKey of activeClassKeys) {
        const cls = classes.get(classKey);
        if (cls) {
          await upsertRow(APPWRITE_IDS.tables.classEnrollments, demoId("class-enrollment", `${scenario.key}:${classKey}`), {
            training_class_id: cls.$id,
            enrollment_id: enrollment.$id,
            student_id: student.$id,
            status: scenario.enrollmentStatus === "cancelled" ? "ended" : "active",
            started_at: contractStart,
            ended_at: scenario.enrollmentStatus === "cancelled" ? contractEnd : null,
            created_at: contractStart,
            updated_at: now
          });
        }
      }
    }

    // Questionário de Saúde Anual (PAR-Q)
    if (scenario.parqScenario && scenario.parqScenario !== "missing") {
      const parqId = demoId("parq", scenario.key);
      const isExpired = scenario.parqScenario === "expired";
      const isExpiringSoon = scenario.parqScenario === "expiring_soon";
      const isDoctorRequired = scenario.parqScenario === "requires_doctor";

      const signedAt = isExpired
        ? "2025-02-15T12:00:00.000Z"
        : isExpiringSoon
          ? "2025-11-25T12:00:00.000Z"
          : `${monthOffset(now, -3)}-10T12:00:00.000Z`;

      const expiresAt = isExpired
        ? "2026-02-15T12:00:00.000Z"
        : isExpiringSoon
          ? "2026-11-25T12:00:00.000Z"
          : `${monthOffset(now, 9)}-10T12:00:00.000Z`;

      const answersJson = isDoctorRequired ? parqAnswersYes : parqAnswersNo;
      const parqHash = createHash("sha256").update(answersJson).digest("hex");

      await upsertRow(APPWRITE_IDS.tables.parqSubmissions, parqId, {
        student_id: student.$id,
        signer_profile_id: signer.$id,
        signer_account_id: signer.account_id,
        signer_name: signer.full_name,
        signer_role: scenario.role === "minor_student" ? "guardian" : "adult_student",
        answers_json: answersJson,
        has_yes_answer: isDoctorRequired,
        requires_medical_certificate: isDoctorRequired,
        term_accepted: true,
        signature_data_url: signatureDataUrl,
        content_hash: parqHash,
        ip_fingerprint: "demo-seed-ip",
        signed_at: signedAt,
        expires_at: expiresAt,
        created_at: signedAt
      });
    }

    // Atestado Médico (quando aplicável)
    if (scenario.medicalCertScenario && scenario.medicalCertScenario !== "missing") {
      const certFileId = demoId("medcert-file", scenario.key);
      const certName = `atestado-medico-${scenario.key}.pdf`;
      await ensureFile(certFileId, certName, filePermissions);

      const isExpired = scenario.medicalCertScenario === "expired";
      const isPending = scenario.medicalCertScenario === "pending";
      const certCreatedAt = isExpired
        ? "2025-02-20T12:00:00.000Z"
        : isPending
          ? `${monthOffset(now, 0)}-10T12:00:00.000Z`
          : `${monthOffset(now, -4)}-15T12:00:00.000Z`;

      await upsertRow(APPWRITE_IDS.tables.studentDocuments, demoId("medcert-doc", scenario.key), {
        student_id: student.$id,
        document_type: "medical_certificate",
        file_id: certFileId,
        original_name: certName,
        mime_type: "application/pdf",
        size_bytes: tinyPng.byteLength,
        status: isPending ? "pending" : "approved",
        uploaded_by_account_id: signer.account_id,
        created_at: certCreatedAt,
        updated_at: now
      });
    }
  }

  console.log("📝 [6/9] Processando Contratos, Assinaturas e Rescisões...");
  for (const scenario of scenarios) {
    const student = studentRowsByKey.get(scenario.key);
    const enrollment = enrollmentRowsByKey.get(scenario.key);
    const signer = signerByKey.get(scenario.key);
    if (!student || !enrollment || !signer) continue;

    const contractScenario = scenario.contractScenario ?? (scenario.enrollmentStatus === "active" ? "signed" : "none");
    if (contractScenario === "none") continue;

    const contractId = demoId("contract", scenario.key);
    const signatureId = demoId("contract-signature", scenario.key);
    const snapshot = `${contractTemplate}\n\nAluno: ${scenario.fullName}. Responsável: ${signer.full_name}. Mensalidade: R$ ${((scenario.monthlyFeeCents - scenario.discountCents) / 100).toFixed(2).replace(".", ",")}. Vencimento: dia ${scenario.dueDay}. Endereço: ${scenario.address}.`;
    const snapshotHash = createHash("sha256").update(snapshot).digest("hex");

    const contractStart =
      contractScenario === "expired"
        ? "2025-01-01T12:00:00.000Z"
        : contractScenario === "cancelled"
          ? "2025-05-01T12:00:00.000Z"
          : `${scenario.startMonth ?? "2025-01"}-01T12:00:00.000Z`;

    const contractEnd =
      contractScenario === "expired"
        ? "2026-01-01T12:00:00.000Z"
        : contractScenario === "cancelled"
          ? "2026-04-30T12:00:00.000Z"
          : `${monthOffset(now, 10)}-28T12:00:00.000Z`;

    const isPendingSignature = contractScenario === "pending_signature";

    if (!isPendingSignature) {
      await upsertRow(APPWRITE_IDS.tables.contractSignatures, signatureId, {
        contract_id: contractId,
        signer_profile_id: signer.$id,
        signer_account_id: signer.account_id,
        signer_name: signer.full_name,
        signature_data_url: signatureDataUrl,
        content_hash: snapshotHash,
        user_agent: "Ebener TKD demo seed",
        accepted_at: contractStart,
        created_at: contractStart
      });
    }

    await upsertRow(APPWRITE_IDS.tables.contracts, contractId, {
      enrollment_id: enrollment.$id,
      student_id: student.$id,
      version_id: versionId,
      version_number: 1,
      status: contractScenario,
      content_snapshot: snapshot,
      content_hash: snapshotHash,
      policy_snapshot_json: JSON.stringify({ schema_version: 1, cancellation_notice_day: DEFAULT_CONTRACT_POLICY.cancellation_notice_day, exit_fee_mode: DEFAULT_CONTRACT_POLICY.exit_fee_mode, exit_fee_cents: DEFAULT_CONTRACT_POLICY.exit_fee_cents, rematriculation_after_months: DEFAULT_CONTRACT_POLICY.rematriculation_after_months }),
      academy_legal_name: DEFAULT_ACADEMY_IDENTITY.legal_name,
      student_name: scenario.fullName,
      guardian_name: scenario.role === "minor_student" ? signer.full_name : null,
      monthly_fee_cents: scenario.monthlyFeeCents - scenario.discountCents,
      starts_at: contractStart,
      ends_at: contractEnd,
      signature_id: isPendingSignature ? null : signatureId,
      signed_at: isPendingSignature ? null : contractStart,
      created_by_account_id: admin.account_id,
      created_at: contractStart,
      updated_at: now
    });

    // Cancelamento formal
    if (scenario.cancellationDetails) {
      const cancelId = demoId("cancellation", scenario.key);
      await upsertRow(APPWRITE_IDS.tables.cancellationRequests, cancelId, {
        contract_id: contractId,
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        requested_by_profile_id: signer.$id,
        target_exit_month: scenario.cancellationDetails.targetExitMonth,
        notice_date: scenario.cancellationDetails.noticeDate,
        suggested_fee_cents: scenario.cancellationDetails.suggestedFeeCents,
        decided_fee_cents: scenario.cancellationDetails.decidedFeeCents,
        status: "approved",
        reason: scenario.cancellationDetails.reason,
        decision_notes: scenario.cancellationDetails.decisionNotes,
        decided_by_account_id: admin.account_id,
        decided_at: scenario.cancellationDetails.noticeDate,
        created_at: scenario.cancellationDetails.noticeDate,
        updated_at: now
      });

      // Cobrança da taxa de rescisão contratual
      const exitFeeChargeId = demoId("charge", `${scenario.key}:exit-fee`);
      await upsertRow(APPWRITE_IDS.tables.charges, exitFeeChargeId, {
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        contract_id: contractId,
        charge_type: "exit_fee",
        competence: scenario.cancellationDetails.targetExitMonth.slice(0, 7),
        origin_id: cancelId,
        amount_cents: scenario.cancellationDetails.decidedFeeCents,
        due_date: scenario.cancellationDetails.targetExitMonth,
        status: "paid",
        description: "Taxa de rescisão contratual antecipada",
        created_at: scenario.cancellationDetails.noticeDate,
        updated_at: now
      });

      await upsertRow(APPWRITE_IDS.tables.payments, demoId("payment", exitFeeChargeId), {
        charge_id: exitFeeChargeId,
        method: "manual",
        amount_cents: scenario.cancellationDetails.decidedFeeCents,
        paid_at: scenario.cancellationDetails.targetExitMonth,
        status: "confirmed",
        recorded_by_account_id: admin.account_id,
        notes: "Taxa de rescisão quitada via PIX.",
        created_at: scenario.cancellationDetails.targetExitMonth,
        updated_at: now
      });
    }
  }

  console.log("💰 [7/9] Gerando Cobranças Mensais e Histórico de Pagamentos (2025 - 2026)...");
  let totalCharges = 0;
  let totalPayments = 0;

  for (const scenario of scenarios) {
    const student = studentRowsByKey.get(scenario.key);
    const enrollment = enrollmentRowsByKey.get(scenario.key);
    const signer = signerByKey.get(scenario.key);
    if (!student || !enrollment || !signer) continue;

    const contractId = demoId("contract", scenario.key);
    const amount = scenario.monthlyFeeCents - scenario.discountCents;

    for (const chargeDef of scenario.charges) {
      const chargeId = demoId("charge", `${scenario.key}:${chargeDef.competence}:monthly`);
      const dueDate = demoDueDate(chargeDef.competence, scenario.dueDay);

      await upsertRow(APPWRITE_IDS.tables.charges, chargeId, {
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        contract_id: contractId,
        charge_type: "monthly_fee",
        competence: chargeDef.competence,
        origin_id: contractId,
        amount_cents: amount,
        due_date: dueDate,
        status: chargeDef.state === "paid" ? "paid" : chargeDef.state,
        description: `Mensalidade ${chargeDef.competence}`,
        created_at: dueDate,
        updated_at: now
      });
      totalCharges++;

      if (chargeDef.state === "paid") {
        const paymentId = demoId("payment", chargeId);
        await upsertRow(APPWRITE_IDS.tables.payments, paymentId, {
          charge_id: chargeId,
          method: "manual",
          amount_cents: amount,
          paid_at: dueDate,
          status: "confirmed",
          recorded_by_account_id: admin.account_id,
          notes: "Recebimento confirmado via PIX pela secretaria.",
          created_at: dueDate,
          updated_at: now
        });
        totalPayments++;
      }

      if (chargeDef.state === "proof_under_review") {
        const fileId = demoId("proof-file", chargeId);
        const proofName = `comprovante-${scenario.key}.png`;
        await ensureFile(fileId, proofName, [Permission.read(Role.user(signer.account_id))]);

        const proofDocId = demoId("payment-proof", chargeId);
        await upsertRow(APPWRITE_IDS.tables.paymentProofs, proofDocId, {
          charge_id: chargeId,
          file_id: fileId,
          original_name: proofName,
          mime_type: "image/png",
          size_bytes: tinyPng.byteLength,
          version: 1,
          status: "pending",
          uploaded_by_account_id: signer.account_id,
          created_at: now,
          updated_at: now
        });
      }
    }

    // Exames participados
    const participations = scenario.examParticipations ?? (scenario.examParticipation ? [scenario.examParticipation] : []);
    for (const ep of participations) {
      const eventRow = examMap.get(ep.eventIdKey);
      if (!eventRow) continue;

      const participantId = demoId("participant", `${scenario.key}:${ep.eventIdKey}`);
      let examChargeId: string | null = null;

      if (ep.chargeStatus) {
        const examCompetence = (eventRow.event_date as string).slice(0, 7);
        examChargeId = demoId("charge", `${scenario.key}:${ep.eventIdKey}:exam-fee`);

        await upsertRow(APPWRITE_IDS.tables.charges, examChargeId, {
          enrollment_id: enrollment.$id,
          student_id: student.$id,
          contract_id: contractId,
          charge_type: "exam_fee",
          competence: examCompetence,
          origin_id: eventRow.$id,
          amount_cents: ep.feeCents,
          due_date: eventRow.event_date as string,
          status: ep.chargeStatus === "paid" ? "paid" : ep.chargeStatus,
          description: `Taxa do exame de graduação - Faixa ${DEFAULT_RANK_SETTINGS[ep.targetRankKey].display_name}`,
          created_at: eventRow.created_at as string,
          updated_at: now
        });

        if (ep.chargeStatus === "paid") {
          await upsertRow(APPWRITE_IDS.tables.payments, demoId("payment", examChargeId), {
            charge_id: examChargeId,
            method: "manual",
            amount_cents: ep.feeCents,
            paid_at: eventRow.event_date as string,
            status: "confirmed",
            recorded_by_account_id: admin.account_id,
            notes: "Taxa de exame quitada antecipadamente.",
            created_at: eventRow.created_at as string,
            updated_at: now
          });
          totalPayments++;
        }

        if (ep.chargeStatus === "proof_under_review") {
          const fileId = demoId("proof-file", examChargeId);
          await ensureFile(fileId, `comprovante-exame-${scenario.key}.png`, [Permission.read(Role.user(signer.account_id))]);
          await upsertRow(APPWRITE_IDS.tables.paymentProofs, demoId("payment-proof", examChargeId), {
            charge_id: examChargeId,
            file_id: fileId,
            original_name: `comprovante-exame-${scenario.key}.png`,
            mime_type: "image/png",
            size_bytes: tinyPng.byteLength,
            version: 1,
            status: "pending",
            uploaded_by_account_id: signer.account_id,
            created_at: now,
            updated_at: now
          });
        }
      }

      await upsertRow(APPWRITE_IDS.tables.examParticipants, participantId, {
        event_id: eventRow.$id,
        enrollment_id: enrollment.$id,
        student_id: student.$id,
        target_rank_key: ep.targetRankKey,
        fee_cents: ep.feeCents,
        charge_id: examChargeId,
        status: ep.status,
        result_notes: ep.notes ?? null,
        graded_at: ep.gradedAt ?? null,
        created_at: eventRow.created_at as string,
        updated_at: now
      });
    }

    // Histórico de graduação (promoções passadas de faixa)
    const pastRecords = scenario.pastExamRecords ?? (scenario.pastExamRecord ? [{ ...scenario.pastExamRecord, eventIdKey: "exam-2026-1" as const }] : []);
    for (const pr of pastRecords) {
      const eventRow = examMap.get(pr.eventIdKey);
      if (!eventRow) continue;

      const participantId = demoId("participant", `${scenario.key}:${pr.eventIdKey}`);
      const historyId = demoId("belt-history", `${scenario.key}:${pr.eventIdKey}`);

      await upsertRow(APPWRITE_IDS.tables.beltHistory, historyId, {
        student_id: student.$id,
        event_id: eventRow.$id,
        exam_participant_id: participantId,
        previous_rank_key: pr.previousRankKey,
        new_rank_key: pr.newRankKey,
        previous_belt_name: DEFAULT_RANK_SETTINGS[pr.previousRankKey].display_name,
        new_belt_name: DEFAULT_RANK_SETTINGS[pr.newRankKey].display_name,
        achieved_at: pr.achievedAt,
        created_at: pr.achievedAt
      });
    }
  }

  console.log("🥋 [8/9] Gerando Calendário de Aulas e Frequências (2025 - 2026)...");
  // Gerar aulas históricas (1x ao mês de Jan 2025 a Ago 2026) e densas (Set a Nov 2026)
  const historicalDates = [
    "2025-01-15", "2025-02-12", "2025-03-12", "2025-04-16",
    "2025-05-14", "2025-06-11", "2025-07-16", "2025-08-13",
    "2025-09-17", "2025-10-15", "2025-11-12", "2025-12-10",
    "2026-01-14", "2026-02-11", "2026-03-11", "2026-04-15",
    "2026-05-13", "2026-06-10", "2026-07-15", "2026-08-12"
  ];

  // Aulas recentes (Setembro a Novembro de 2026 para alimentar a retenção dos últimos 30-60 dias)
  const recentDates = [
    "2026-09-02", "2026-09-04", "2026-09-09", "2026-09-11", "2026-09-16", "2026-09-18",
    "2026-09-23", "2026-09-25", "2026-09-30", "2026-10-02", "2026-10-07", "2026-10-09",
    "2026-10-14", "2026-10-16", "2026-10-21", "2026-10-23", "2026-10-28", "2026-10-30",
    "2026-11-04", "2026-11-06", "2026-11-11", "2026-11-13"
  ];

  const allLessonDates = [...historicalDates, ...recentDates];
  let attendanceCount = 0;

  for (const [classKey, classRow] of classes.entries()) {
    const classEnrollments = await tables.listRows({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.classEnrollments,
      queries: [
        Query.equal("training_class_id", [classRow.$id]),
        Query.equal("status", ["active"]),
        Query.limit(100)
      ]
    });

    for (const [idx, dateStr] of allLessonDates.entries()) {
      const lessonDateIso = `${dateStr}T12:00:00.000Z`;
      const lessonId = demoId("lesson", `${classKey}:${dateStr}`);

      await upsertRow(APPWRITE_IDS.tables.lessons, lessonId, {
        training_class_id: classRow.$id,
        lesson_date: lessonDateIso,
        start_time: classRow.start_time as string,
        end_time: classRow.end_time as string,
        lesson_type: "regular",
        status: "completed",
        created_by_account_id: admin.account_id,
        created_at: lessonDateIso,
        updated_at: now
      });

      const isRecent = idx >= historicalDates.length;
      const recentIdx = idx - historicalDates.length;

      for (const enr of classEnrollments.rows) {
        const studentScenario = scenarios.find((s) => s.key === enr.student_id.toString().replace("demo-student-", ""));
        const pattern = studentScenario?.attendancePattern ?? "regular";

        let status: "present" | "absent" | "excused" = "present";

        if (pattern === "exemplary") {
          status = idx % 20 === 0 ? "excused" : "present";
        } else if (pattern === "regular") {
          status = idx % 5 === 0 ? "absent" : idx % 12 === 0 ? "excused" : "present";
        } else if (pattern === "warning") {
          // Últimas 2 aulas faltou para dar risco warning
          if (isRecent && recentIdx >= recentDates.length - 2) {
            status = "absent";
          } else {
            status = idx % 3 === 0 ? "absent" : "present";
          }
        } else if (pattern === "dropout_risk") {
          // Faltou nas últimas 4 aulas (mais de 21 dias sem ir ao Dojang)
          if (isRecent && recentIdx >= recentDates.length - 4) {
            status = "absent";
          } else {
            status = idx % 2 === 0 ? "absent" : "present";
          }
        }

        const attendanceId = demoId("attendance", `${lessonId}:${enr.$id}`);
        await upsertRow(APPWRITE_IDS.tables.attendanceRecords, attendanceId, {
          lesson_id: lessonId,
          class_enrollment_id: enr.$id,
          enrollment_id: enr.enrollment_id as string,
          student_id: enr.student_id as string,
          status,
          recorded_by_account_id: admin.account_id,
          created_at: `${dateStr}T19:30:00.000Z`,
          updated_at: now
        });
        attendanceCount++;
      }
    }
  }

  console.log("🔔 [9/9] Sincronizando Notificações Centrais do Sistema...");
  const notificationsToSeed = [
    {
      key: "notif-parq-annual",
      kind: "system" as const,
      title: "Renovação anual do Questionário PAR-Q",
      body: "O Questionário de Prontidão para Atividade Física está disponível para preenchimento. Mantenha seus registros de saúde atualizados.",
      audience: "all" as const,
      action_url: "/aluno/saude/parq",
      dedupe_key: "seed-notif-parq-2026"
    },
    {
      key: "notif-exam-33",
      kind: "announcement" as const,
      title: "Inscrições abertas: 33º Exame de Faixas Ebener TKD",
      body: "O exame de graduação do segundo semestre acontecerá no Dojang Central. Converse com o Mestre Ebener para confirmar seus requisitos técnicos.",
      audience: "all" as const,
      action_url: "/aluno/exames",
      dedupe_key: "seed-notif-exam-33"
    },
    {
      key: "notif-payment-current",
      kind: "payment_reminder" as const,
      title: "Mensalidade do Dojang Ebener TKD",
      body: "Sua mensalidade já se encontra disponível. Após o pagamento via PIX, anexe o comprovante no app para liberação imediata.",
      audience: "profile" as const,
      action_url: "/aluno/mensalidades",
      dedupe_key: `seed-notif-payment-${monthOffset(now, 0)}`
    }
  ];

  const targetProfiles = [
    profilesByEmail.get("camila.ferreira@ebenertkd.app"),
    profilesByEmail.get("juliana.mendes@ebenertkd.app")
  ].filter(Boolean) as ProfileRow[];

  for (const n of notificationsToSeed) {
    const notifId = demoId("notification", n.key);
    await upsertRow(APPWRITE_IDS.tables.notifications, notifId, {
      kind: n.kind,
      title: n.title,
      body: n.body,
      audience: n.audience,
      action_url: n.action_url,
      dedupe_key: n.dedupe_key,
      created_by_account_id: admin.account_id,
      published_at: now,
      created_at: now
    });

    for (const targetProfile of targetProfiles) {
      const recipientId = demoId("notif-recipient", `${n.key}:${targetProfile.$id}`);
      await upsertRow(APPWRITE_IDS.tables.notificationRecipients, recipientId, {
        notification_id: notifId,
        profile_id: targetProfile.$id,
        account_id: targetProfile.account_id,
        read_at: n.key === "notif-exam-33" ? now : null,
        created_at: now,
        updated_at: now
      });
    }
  }

  await upsertRow(APPWRITE_IDS.tables.auditEvents, demoId("audit", "demo-seed-optimized"), {
    actor_account_id: admin.account_id,
    event_type: "demo.seed.optimized.completed",
    entity_type: "project",
    entity_id: config.projectId.slice(0, 36),
    metadata: JSON.stringify({
      students: scenarios.length,
      classes: classDefinitions.length,
      examEvents: examDefinitions.length,
      charges: totalCharges,
      payments: totalPayments,
      attendances: attendanceCount
    }),
    created_at: now
  });

  console.log(`\n======================================================`);
  console.log(`✅ Seed completo e otimizado da Ebener Taekwondo finalizado!`);
  console.log(`🥋 Administrador Mestre: Ebener Santos`);
  console.log(`👥 Alunos cadastrados: ${scenarios.length} (cobrindo TODOS os 8 estágios de matrícula)`);
  console.log(`📋 Questionários PAR-Q: vigentes, vencidos, com atestado exigido e pendentes`);
  console.log(`💰 Histórico financeiro: Jan 2025 a Nov 2026 (${totalCharges} cobranças, ${totalPayments} pagamentos)`);
  console.log(`🔒 Regra de acesso 30d: ativo, bloqueado por inadimplência, carência do mestre e comprovante em análise`);
  console.log(`🏆 Exames de faixa: 3 concluídos (2025/2026) com graduações no histórico + 1 confirmado`);
  console.log(`🥋 Frequências de aula: ${attendanceCount} presenças/ausências registradas (com alertas de evasão)`);
  console.log(`🔔 Notificações no sistema integradas aos perfis de teste`);
  console.log(`======================================================\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? (process.env.SEED_DEBUG ? error.stack : error.message) : error);
  process.exitCode = 1;
});
