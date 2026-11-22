import type { ReactNode } from "react";
import { Inbox } from "@/components/ui/icons";
import { Card, CardContent } from "@/components/ui/card";
import { AppIllustration } from "./app-illustration";
import type { IllustrationName } from "./illustration-catalog";

export function EmptyState({ title, description, action, icon, illustration }: { title: string; description: string; action?: ReactNode; icon?: ReactNode; illustration?: IllustrationName }) {
  return (
    <Card>
      <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        {illustration ? <AppIllustration name={illustration} context="empty" /> : <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon ?? <Inbox className="size-5" aria-hidden="true" />}
        </div>}
        <div className="t-text-reveal max-w-md space-y-1">
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
