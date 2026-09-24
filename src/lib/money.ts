const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export function formatBrl(cents: number) {
  return BRL_FORMATTER.format(cents / 100);
}

export function centsToReaisInput(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function reaisToCents(value: FormDataEntryValue | number | null | undefined) {
  if (value == null) throw new Error("money_required");

  const raw = String(value).trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("money_invalid");

  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("money_invalid");
  return cents;
}
