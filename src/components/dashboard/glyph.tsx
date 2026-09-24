type GlyphProps = {
  label: string;
  className?: string;
};

export function Glyph({ label, className = "" }: GlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 min-w-5 items-center justify-center text-sm font-bold ${className}`.trim()}
    >
      {label}
    </span>
  );
}
