import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_EFFECTIVE_DATE_ISO,
  PRIVACY_SECTIONS,
  type PrivacyBlock
} from "@/features/privacy/privacy-policy-content";

export const metadata: Metadata = {
  title: "Política de Privacidade | Ebener TKD",
  description: "Como a Ebener Taekwondo coleta, usa, protege e exclui dados pessoais no portal."
};

function Block({ block }: { block: PrivacyBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary/60">
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  return (
    <Alert role="note" data-testid="privacy-pending" className="border-border bg-warning-soft text-foreground">
      <TriangleAlert className="text-warning-foreground dark:text-warning-foreground" aria-hidden="true" />
      <AlertTitle>Pendente de definição</AlertTitle>
      <AlertDescription>{block.text}</AlertDescription>
    </Alert>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-3 text-center">
          <Link href="/" aria-label="Voltar ao início">
            <Image src="/brand-icon.png" alt="Ebener TKD" width={56} height={56} unoptimized className="mx-auto size-14 object-contain" />
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ebener Taekwondo</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Em vigor desde <time dateTime={PRIVACY_EFFECTIVE_DATE_ISO}>{PRIVACY_EFFECTIVE_DATE}</time>
          </p>
        </header>

        <Alert role="note" className="border-border bg-warning-soft text-foreground">
          <TriangleAlert className="text-warning-foreground dark:text-warning-foreground" aria-hidden="true" />
          <AlertTitle>Versão em revisão</AlertTitle>
          <AlertDescription>
            Os campos marcados como pendentes serão preenchidos pela academia. Este texto ainda passará por revisão jurídica.
          </AlertDescription>
        </Alert>

        <nav aria-label="Seções da política" className="rounded-xl border border-border/40 bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nesta página</p>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {PRIVACY_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary underline-offset-4 hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {PRIVACY_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id} className="scroll-mt-4">
            <CardHeader>
              <h2 className="text-base font-semibold sm:text-lg">{section.title}</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.blocks.map((block, index) => <Block key={index} block={block} />)}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center pb-4">
          <Button asChild variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
