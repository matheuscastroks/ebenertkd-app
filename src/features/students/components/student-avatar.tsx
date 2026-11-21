import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { studentPhotoUrl } from "@/features/students/photo-url";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-10",
  md: "size-12",
  lg: "size-20"
} as const;

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function StudentAvatar({ name, photoDocumentId, sex, size = "md", className }: {
  name: string;
  photoDocumentId?: string | null;
  sex?: "feminino" | "masculino" | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const fallbackClass = size === "lg" ? "text-lg font-semibold" : size === "md" ? "text-sm font-medium" : "text-xs font-medium";
  return (
    <Avatar className={cn("shrink-0", sizes[size], className)} aria-label={`Foto de ${name}`}>
      {photoDocumentId ? <AvatarImage src={studentPhotoUrl(photoDocumentId)} alt={name} loading="lazy" decoding="async" /> : null}
      <AvatarFallback data-placeholder={sex === "feminino" ? "feminino" : undefined} className={fallbackClass}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
