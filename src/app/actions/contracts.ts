"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { publishContractTemplate, saveContractTemplateDraft } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function saveContractTemplateAction(formData: FormData) {
  const admin = await requireProfile("admin");
  const input = { name: formData.get("name"), content: formData.get("content") };
  const publishing = formData.get("intent") === "publish";
  try {
    if (publishing) await publishContractTemplate(admin, input);
    else await saveContractTemplateDraft(admin, input);
  } catch {
    redirect(`${ROUTES.adminContractTemplate}?error=invalid`);
  }
  updateTag(CACHE_TAGS.contractTemplate);
  revalidatePath(ROUTES.adminContractTemplate);
  redirect(`${ROUTES.adminContractTemplate}?${publishing ? "published" : "saved"}=1`);
}
