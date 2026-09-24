import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-16"
} as const;

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function StudentAvatar({ name, photoDocumentId, size = "md", className }: {
  name: string;
  photoDocumentId?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Avatar className={cn(sizes[size], className)} aria-label={`Foto de ${name}`}>
      {photoDocumentId ? <AvatarImage src={`/api/student-documents/${photoDocumentId}`} alt={name} /> : null}
      <AvatarFallback className={size === "lg" ? "text-base font-semibold" : "font-medium"}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
