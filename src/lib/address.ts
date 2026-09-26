export type AddressParts = {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export function cleanCep(cep?: string | null): string {
  return (cep ?? "").replace(/\D/g, "").slice(0, 8);
}

export function formatCep(cep?: string | null): string {
  const digits = cleanCep(cep);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function formatAddress(parts: AddressParts): string {
  const segments: string[] = [];

  // 1. Logradouro + Número + Complemento
  if (parts.street) {
    let main = parts.street.trim();
    if (parts.number?.trim()) {
      main += `, ${parts.number.trim()}`;
    }
    if (parts.complement?.trim()) {
      main += ` - ${parts.complement.trim()}`;
    }
    segments.push(main);
  } else if (parts.number?.trim()) {
    segments.push(`Nº ${parts.number.trim()}`);
  }

  // 2. Bairro
  if (parts.neighborhood?.trim()) {
    segments.push(parts.neighborhood.trim());
  }

  // 3. Cidade - UF
  const cityState = [parts.city?.trim(), parts.state?.trim().toUpperCase()]
    .filter(Boolean)
    .join(" - ");
  if (cityState) {
    segments.push(cityState);
  }

  // 4. CEP
  if (parts.cep) {
    const formatted = formatCep(parts.cep);
    if (formatted) {
      segments.push(`CEP ${formatted}`);
    }
  }

  return segments.join(", ");
}

export function parseAddress(raw?: string | null): AddressParts {
  if (!raw) return {};

  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // not JSON
    }
  }

  const result: AddressParts = {};

  // Extrai CEP (ex: "CEP 21931-580", "21931-580" ou "21931580")
  const cepMatch = trimmed.match(/(?:CEP\s*)?(\d{5}-?\d{3})/i);
  if (cepMatch) {
    result.cep = formatCep(cepMatch[1]);
  }

  // Remove o trecho de CEP para analisar o restante
  let cleaned = trimmed.replace(/,?\s*(?:CEP\s*)?\d{5}-?\d{3}/i, "").trim();

  // Extrai "Cidade - UF" no final (ex: ", Rio de Janeiro - RJ")
  const cityStateMatch = cleaned.match(/,\s*([^,-]+)\s*-\s*([A-Za-z]{2})\s*$/);
  if (cityStateMatch) {
    result.city = cityStateMatch[1].trim();
    result.state = cityStateMatch[2].trim().toUpperCase();
    cleaned = cleaned.slice(0, cityStateMatch.index).trim();
  }

  // Extrai "Logradouro, Número, Complemento" e Bairro
  // Formato típico: "Rua X, 100 - Apto 201, Bairro" ou "Rua X, 100, Bairro" ou "Rua X, 100"
  const streetNumberMatch = cleaned.match(
    /^(.+?),\s*(\d+[^\s,-]*|\bS\/N\b|\bsem número\b)(?:\s*-\s*([^,]+))?(?:,\s*(.+))?$/i
  );
  if (streetNumberMatch) {
    result.street = streetNumberMatch[1].trim();
    result.number = streetNumberMatch[2].trim();
    if (streetNumberMatch[3]) {
      result.complement = streetNumberMatch[3].trim();
    }
    if (streetNumberMatch[4]) {
      result.neighborhood = streetNumberMatch[4].trim();
    }
  } else {
    // Caso simplificado: "Rua X - Bairro" ou texto livre
    const parts = cleaned.split(/\s*-\s*/);
    if (parts.length >= 2) {
      result.street = parts[0]?.trim();
      result.neighborhood = parts[1]?.trim();
    } else {
      result.street = cleaned;
    }
  }

  return result;
}
