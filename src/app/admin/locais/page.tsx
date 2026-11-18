import Link from "next/link";
import { MapPin, Plus, Trash2 } from "@/components/ui/icons";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { listLocations } from "@/features/locations/locations-service";
import { deleteLocationAction, saveLocationAction } from "@/app/actions/locations";

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const [admin, query, locations] = await Promise.all([
    requireProfile("admin"),
    searchParams,
    listLocations(),
  ]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminLocations}
      title="Cadastro de Locais"
      subtitle="Gerencie os dojangs, tatames e endereços utilizados nas turmas e exames de faixa."
      breadcrumbs={[
        { label: "Visão geral", href: ROUTES.admin },
        { label: "Locais e Dojangs" },
      ]}
      headerActions={
        <ResponsiveDialog
          size="lg"
          trigger={
            <Button className="min-h-11">
              <Plus className="size-4" aria-hidden="true" />
              Novo local
            </Button>
          }
          title="Cadastrar Novo Local"
          description="Adicione um dojang, tatame ou espaço esportivo para vincular a turmas e exames."
        >
          <form action={saveLocationAction} className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="loc-name">Nome do local</FieldLabel>
              <Input
                id="loc-name"
                name="name"
                placeholder="Ex.: Dojang Principal, Tatame 2, Ginásio Municipal"
                className="h-11 text-sm"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="loc-address">Endereço completo</FieldLabel>
              <Input
                id="loc-address"
                name="address"
                placeholder="Ex.: Rua das Flores, 123 — Centro"
                className="h-11 text-sm"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="loc-complement">Complemento / Espaço</FieldLabel>
              <Input
                id="loc-complement"
                name="complement"
                placeholder="Ex.: Sala 2, Tatame Olímpico, 2º Andar"
                className="h-11 text-sm"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="loc-notes">Observações</FieldLabel>
              <Textarea
                id="loc-notes"
                name="notes"
                placeholder="Ex.: Estacionamento no local, vestiários com chuveiro"
                className="min-h-20 text-sm"
              />
            </Field>

            <div className="pt-2">
              <FormSubmitButton className="min-h-11 w-full" pendingLabel="Salvando local…">
                Salvar local
              </FormSubmitButton>
            </div>
          </form>
        </ResponsiveDialog>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {query.saved ? (
          <OperationToast
            tone="success"
            title="Local salvo com sucesso"
            description="O endereço já está disponível para seleção em turmas e exames."
            clearParams={["saved"]}
          />
        ) : null}
        {query.deleted ? (
          <OperationToast
            tone="success"
            title="Local removido"
            description="O endereço foi desvinculado dos locais ativos."
            clearParams={["deleted"]}
          />
        ) : null}
        {query.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível salvar o local"
            description="Confira se o nome do local foi preenchido corretamente."
            clearParams={["error"]}
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors duration-(--duration-quick) hover:border-border/80"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                      <MapPin className="size-4.5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug">
                        {loc.name}
                      </h3>
                      {loc.is_default ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-text">
                          Padrão do Sistema
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {loc.address ? (
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium">
                    {loc.address}
                  </p>
                ) : null}

                {loc.complement ? (
                  <p className="text-xs text-muted-foreground">{loc.complement}</p>
                ) : null}

                {loc.notes ? (
                  <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground italic">
                    {loc.notes}
                  </p>
                ) : null}
              </div>

              {!loc.is_default ? (
                <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir local &quot;{loc.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este endereço não aparecerá mais como sugestão para novas turmas e exames. Turmas existentes não perderão o histórico.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                        <form action={deleteLocationAction}>
                          <input type="hidden" name="id" value={loc.id} />
                          <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Confirmar exclusão
                          </AlertDialogAction>
                        </form>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
