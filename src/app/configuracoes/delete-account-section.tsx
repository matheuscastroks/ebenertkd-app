import { DeleteAccountDialog } from "./DeleteAccountDialog";

export function DeleteAccountSection() {
  return <section aria-labelledby="delete-account-title" className="space-y-3 rounded-xl bg-card p-4">
    <h2 id="delete-account-title" className="text-base font-semibold">Excluir conta</h2>
    <p className="text-sm text-muted-foreground">A exclusão é irreversível e remove seu acesso ao aplicativo.</p>
    <DeleteAccountDialog />
  </section>;
}
