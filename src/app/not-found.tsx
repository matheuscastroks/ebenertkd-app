import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/navigation/routes";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "O endereço solicitado não foi encontrado."
};

export default async function NotFound() {
  const identity = await getAcademyIdentity();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-3 rounded-xl p-2 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Image
              src="/brand-icon.png"
              alt=""
              width={48}
              height={48}
              unoptimized
              priority
              className="size-12 object-contain"
            />
            <span className="text-lg font-semibold tracking-tight">{identity.short_name}</span>
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Erro 404</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O endereço que você tentou acessar não existe, foi alterado ou está temporariamente indisponível.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild size="lg" className="w-full sm:w-auto min-w-44 touch-manipulation">
            <Link href={ROUTES.home}>Voltar para o início</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
