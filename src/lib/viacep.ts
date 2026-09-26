import { cleanCep, formatCep } from "@/lib/address";

export type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean | string;
};

export type ViaCepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

/**
 * Busca endereço na API do ViaCEP a partir de um CEP com 8 dígitos.
 * Retorna null se o CEP for inválido, não for encontrado ou se houver falha de rede.
 */
export async function fetchAddressByCep(
  rawCep: string,
  signal?: AbortSignal
): Promise<ViaCepAddress | null> {
  const digits = cleanCep(rawCep);
  if (digits.length !== 8) {
    return null;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      return null;
    }

    const data: ViaCepResponse = await res.json();
    if (data.erro === true || data.erro === "true") {
      return null;
    }

    return {
      cep: formatCep(data.cep || digits),
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: (data.uf || "").toUpperCase(),
    };
  } catch {
    return null;
  }
}
