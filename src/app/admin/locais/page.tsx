import { MapPin, Pencil, Plus, Trash2 } from "@/components/ui/icons";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { EmptyState } from "@/components/shared/empty-state";
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
import { listLocations } from "@/features/locations/locations-service";
import { deleteLocationAction, saveLocationAction } from "@/app/actions/locations";
import { LocationCoordinatesFields } from "@/features/locations/components/location-coordinates-fields";
import type { TrainingLocation } from "@/features/locations/types";

/** Formulário de local (criação e edição). Inputs sem `text-sm`: 16px no celular evita o zoom do iOS. */
function LocationForm({ location }: { location?: TrainingLocation }) {
  const prefix = location ? `loc-${location.id}` : "loc-new";
  return (
    <form action={saveLocationAction} className="space-y-4 pt-2">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}
      <Field>
        <FieldLabel htmlFor={`${prefix}-name`}>Nome do local</FieldLabel>
        <Input id={`${prefix}-name`} name="name" defaultValue={location?.name} placeholder="Ex.: Dojang Principal, Tatame 2, Ginásio Municipal" className="h-11" required />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-address`}>Endereço completo</FieldLabel>
        <Input id={`${prefix}-address`} name="address" defaultValue={location?.address} placeholder="Ex.: Rua das Flores, 123 — Centro" className="h-11" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-complement`}>Complemento / Espaço</FieldLabel>
        <Input id={`${prefix}-complement`} name="complement" defaultValue={location?.complement} placeholder="Ex.: Sala 2, Tatame Olímpico, 2º Andar" className="h-11" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-notes`}>Observações</FieldLabel>
        <Textarea id={`${prefix}-notes`} name="notes" defaultValue={location?.notes} placeholder="Ex.: Estacionamento no local, vestiários com chuveiro" className="min-h-20" />
      </Field>
      <LocationCoordinatesFields idPrefix={prefix} latitude={location?.latitude} longitude={location?.longitude} radius={location?.check_in_radius_m} />
      <div className="pt-2">
        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Salvando local…">
          Salvar local
        </FormSubmitButton>
      </div>
    </form>
  );
}

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
      title="Turmas"
      subtitle="Locais de treino usados nas turmas e nos exames."
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
          <LocationForm />
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
            description="Confira o nome e as coordenadas (latitude e longitude juntas, raio entre 25 e 2000 m)."
            clearParams={["error"]}
          />
        ) : null}

        {locations.length === 0 ? (
          <EmptyState title="Nenhum local cadastrado" description="Cadastre o dojang ou tatame onde você treina. O primeiro local vira o padrão das turmas e exames." />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-colors duration-(--duration-quick) hover:border-border/80"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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

                <p className="text-xs text-muted-foreground">
                  {loc.latitude !== undefined ? `Check-in num raio de ${loc.check_in_radius_m} m` : "Sem coordenadas: check-in pelo app desativado"}
                </p>

                {loc.notes ? (
                  <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground italic">
                    {loc.notes}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
                <ResponsiveDialog
                  size="lg"
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="min-h-11 text-sm">
                      <Pencil className="mr-1 size-3.5" aria-hidden="true" />
                      Editar
                    </Button>
                  }
                  title={`Editar ${loc.name}`}
                  description="Atualize o endereço e as coordenadas usadas no check-in dos alunos."
                >
                  <LocationForm location={loc} />
                </ResponsiveDialog>
              {!loc.is_default ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-sm text-destructive hover:bg-destructive/10"
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
              ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
