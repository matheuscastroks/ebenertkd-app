import "server-only";

import { unstable_cache } from "next/cache";
import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { contractTemplateSchema } from "@/features/contracts/schemas";
import { CONTRACT_VARIABLES, hashContent, renderContractTemplate } from "@/features/contracts/rules";
import type { ContractTemplate, ContractVersion } from "@/features/contracts/types";
import { writeAuditEvent } from "@/features/auth/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { CACHE_TAGS } from "@/lib/cache/tags";

export const DEFAULT_CONTRACT_CONTENT = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TAEKWONDO

A academia {{ academy.name }} prestará aulas de taekwondo ao aluno {{ student.full_name }}, CPF {{ student.cpf }}, sob responsabilidade de {{ guardian.full_name }} quando aplicável.

A mensalidade é de {{ financial.monthly_fee }}, com vencimento todo dia {{ financial.due_day }}. A vigência inicia em {{ contract.starts_at }} e termina em {{ contract.ends_at }}.

O cancelamento sem ônus deve ser comunicado até o dia 20 do mês anterior à saída. Após esse prazo será devida uma mensalidade. Após mais de seis meses afastado, uma nova matrícula poderá ser exigida.

O aluno ou responsável declara que as informações de saúde fornecidas são verdadeiras e autoriza a participação nas atividades, observadas as orientações médicas apresentadas.`;

const sampleVariables = Object.fromEntries(CONTRACT_VARIABLES.map((key) => [key, "Exemplo"])) as Record<(typeof CONTRACT_VARIABLES)[number], string>;

export const getContractTemplate = unstable_cache(
  async () => {
    const { tables, config } = createAppwriteAdminClient();
    const rows = await tables.listRows<ContractTemplate>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractTemplates, queries: [Query.limit(1)] });
    return rows.rows[0] ?? null;
  },
  ["get-contract-template"],
  { tags: [CACHE_TAGS.contractTemplate], revalidate: 300 }
);

export async function saveContractTemplateDraft(actor: Profile, raw: unknown) {
  const input = contractTemplateSchema.parse(raw);
  renderContractTemplate(input.content, sampleVariables);
  const existing = await getContractTemplate();
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const template = existing
    ? await tables.updateRow<ContractTemplate>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractTemplates, rowId: existing.$id, data: { name: input.name, draft_content: input.content, updated_by_account_id: actor.account_id, updated_at: now } })
    : await tables.createRow<ContractTemplate>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractTemplates, rowId: ID.unique(), data: { name: input.name, draft_content: input.content, created_by_account_id: actor.account_id, updated_by_account_id: actor.account_id, created_at: now, updated_at: now }, permissions: [] });
  await writeAuditEvent("contract.template_saved", actor.account_id, "contract_template", template.$id);
  return template;
}

export async function publishContractTemplate(actor: Profile, raw: unknown) {
  const template = await saveContractTemplateDraft(actor, raw);
  const { tables, config } = createAppwriteAdminClient();
  const previous = await tables.listRows<ContractVersion>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractVersions, queries: [Query.equal("template_id", [template.$id]), Query.orderDesc("version"), Query.limit(1)] });
  const now = new Date().toISOString();
  const version = await tables.createRow<ContractVersion>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.contractVersions,
    rowId: ID.unique(),
    data: { template_id: template.$id, version: (previous.rows[0]?.version ?? 0) + 1, content: template.draft_content, content_hash: hashContent(template.draft_content), published_by_account_id: actor.account_id, published_at: now },
    permissions: []
  });
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractTemplates, rowId: template.$id, data: { published_version_id: version.$id, updated_at: now } });
  await writeAuditEvent("contract.template_published", actor.account_id, "contract_version", version.$id, { version: version.version });
  return version;
}

export async function getPublishedContractVersion() {
  const template = await getContractTemplate();
  if (!template?.published_version_id) throw new Error("published_contract_template_required");
  const { tables, config } = createAppwriteAdminClient();
  return tables.getRow<ContractVersion>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractVersions, rowId: template.published_version_id });
}

export async function listContractVersions(templateId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<ContractVersion>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractVersions, queries: [Query.equal("template_id", [templateId]), Query.orderDesc("version"), Query.limit(20)] });
  return rows.rows;
}
