export function formatCompetence(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return "—";
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(match[2]) - 1]}/${match[1]}`;
}
