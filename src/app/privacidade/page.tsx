import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAcademyIdentity } from "@/features/academy/config-service";
import { Button } from "@/components/ui/button";
import {
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_EFFECTIVE_DATE_ISO,
  buildPrivacySections,
  type PrivacyBlock
} from "@/features/privacy/privacy-policy-content";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getAcademyIdentity();
  return {
    title: `Política de Privacidade | ${identity.short_name}`,
    description: `Como a ${identity.display_name} coleta, usa, protege e exclui dados pessoais no portal.`
  };
}

function Block({ block }: { block: PrivacyBlock }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed">{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  return null;
}

export default async function PrivacyPolicyPage() {
  const identity = await getAcademyIdentity();
  const sections = buildPrivacySections(identity);
  return (
    <main className="min-h-dvh bg-background px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Image src="/brand-icon.png" alt="" width={40} height={40} unoptimized className="size-10 object-contain" />
            <span className="text-base font-semibold">{identity.short_name}</span>
          </Link>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground">
              Em vigor desde <time dateTime={PRIVACY_EFFECTIVE_DATE_ISO}>{PRIVACY_EFFECTIVE_DATE}</time>
            </p>
          </div>
        </header>

        <nav aria-labelledby="privacy-toc" className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 id="privacy-toc" className="mb-2 text-sm font-medium text-muted-foreground">Nesta página</h2>
          <ol className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline! focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="divide-y divide-border">
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-4 space-y-3 py-6 first:pt-0">
              <h2 id={`${section.id}-title`} className="text-lg font-semibold">{section.title}</h2>
              {section.blocks.map((block, index) => <Block key={index} block={block} />)}
            </section>
          ))}
        </div>

        <div className="pb-4">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </article>
    </main>
  );
}
