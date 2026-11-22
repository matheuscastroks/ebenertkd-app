"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { IllustrationName } from "./illustration-catalog";

const contexts = {
  event: "size-20 sm:size-28",
  achievement: "aspect-square w-24 max-w-full",
  recognition: "aspect-square w-16 max-w-full",
  empty: "size-28 sm:size-36",
} as const;

/** Decorative art: the surrounding text always carries the meaning and actions. */
export function AppIllustration({ name, context, subdued = false, className }: {
  name: IllustrationName;
  context: keyof typeof contexts;
  subdued?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center", contexts[context], subdued && "grayscale opacity-60", className)}>
      <Image
        key={name}
        src={`/illustrations/${name}.webp`}
        alt=""
        width={480}
        height={480}
        unoptimized
        loading="lazy"
        className="size-full object-contain"
        onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
      />
    </span>
  );
}
