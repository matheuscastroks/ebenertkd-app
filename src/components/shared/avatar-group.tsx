"use client";

import { useState, type CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AvatarGroupPerson = { name: string; imageUrl?: string | null };

/** Fração do deslocamento que cada vizinho herda por posição de distância (token `--avatar-falloff`). */
export const AVATAR_FALLOFF = 0.45;

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

/**
 * Deslocamento e escala de um item enquanto o ponteiro está sobre `active`.
 * O item ativo sobe por inteiro e cresce; os vizinhos sobem `lift * falloff^distância`, sem escala.
 */
export function avatarLift(index: number, active: number | null): CSSProperties {
  if (active === null) return {};
  if (index === active) {
    return { "--shift": "var(--avatar-lift)", "--scale-active": "var(--avatar-scale)" } as CSSProperties;
  }
  const factor = Number((AVATAR_FALLOFF ** Math.abs(index - active)).toFixed(4));
  return { "--shift": `calc(var(--avatar-lift) * ${factor})` } as CSSProperties;
}

/** Avatar único de uma pessoa (foto autorizada ou iniciais). */
export function PersonAvatar({ name, imageUrl, size = "default", className }: AvatarGroupPerson & { size?: "sm" | "default" | "lg"; className?: string }) {
  return (
    <Avatar size={size} role="img" aria-label={name} className={cn("after:hidden", className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt="" loading="lazy" decoding="async" /> : null}
      <AvatarFallback className="bg-muted font-medium">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

const chipSizes = { sm: "size-6 text-xs", default: "size-8 text-xs", lg: "size-10 text-sm" } as const;
/** Sobreposição de ~25% do diâmetro do avatar. */
const overlaps = { sm: "-ml-1.5", default: "-ml-2", lg: "-ml-2.5" } as const;

/**
 * Avatares sobrepostos com chip "+N". Ao passar o ponteiro, o avatar sobe e os vizinhos acompanham
 * com intensidade decrescente; ao sair do grupo, tudo volta com um retorno elástico.
 * `total` informa o número real de pessoas quando `people` é só uma amostra.
 */
export function AvatarGroup({
  people,
  max = 4,
  size = "default",
  total,
  label,
  surface = "background",
  className
}: {
  people: readonly AvatarGroupPerson[];
  max?: number;
  size?: "sm" | "default" | "lg";
  total?: number;
  label?: string;
  /** Cor da superfície atrás do grupo; o anel usa a mesma cor para parecer só um vão entre os avatares. */
  surface?: "background" | "card";
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  const count = Math.max(total ?? 0, people.length);
  if (count === 0) return null;

  const shown = people.slice(0, Math.max(0, max));
  const remaining = count - shown.length;
  const hidden = people.slice(shown.length).map((person) => person.name);
  const chipName =
    remaining > 0
      ? `Mais ${remaining} ${remaining === 1 ? "pessoa" : "pessoas"}${hidden.length ? `: ${hidden.join(", ")}${hidden.length < remaining ? " e outras" : ""}` : ""}`
      : "";

  function enter(index: number) {
    setLeaving(false);
    setActive(index);
  }

  return (
    <ul
      role="list"
      aria-label={label ?? `${count} ${count === 1 ? "pessoa" : "pessoas"}`}
      data-slot="avatar-group"
      data-surface={surface}
      data-leaving={leaving ? "" : undefined}
      onPointerLeave={() => {
        setActive(null);
        setLeaving(true);
      }}
      className={cn("t-avatar-group flex items-center", className)}
    >
      {shown.map((person, index) => (
        <li
          key={`${person.name}-${index}`}
          className={cn("t-avatar", index > 0 && overlaps[size])}
          style={avatarLift(index, active)}
          onPointerEnter={() => enter(index)}
          title={person.name}
        >
          <PersonAvatar name={person.name} imageUrl={person.imageUrl} size={size} />
        </li>
      ))}
      {remaining > 0 ? (
        <li
          className={cn("t-avatar", shown.length > 0 && overlaps[size])}
          style={avatarLift(shown.length, active)}
          onPointerEnter={() => enter(shown.length)}
          title={chipName}
        >
          <span
            role="img"
            aria-label={chipName}
            className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted font-medium tabular-nums text-muted-foreground", chipSizes[size])}
          >
            +{remaining}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
