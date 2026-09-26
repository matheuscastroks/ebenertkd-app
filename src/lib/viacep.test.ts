import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAddressByCep } from "./viacep";

describe("fetchAddressByCep", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when CEP does not have 8 digits", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const result = await fetchAddressByCep("123");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns address when ViaCEP responds with valid data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cep: "21931-580",
        logradouro: "Rua Abélia",
        complemento: "",
        bairro: "Jardim Guanabara",
        localidade: "Rio de Janeiro",
        uf: "RJ",
      }),
    } as unknown as Response);

    const result = await fetchAddressByCep("21931580");
    expect(result).toEqual({
      cep: "21931-580",
      street: "Rua Abélia",
      neighborhood: "Jardim Guanabara",
      city: "Rio de Janeiro",
      state: "RJ",
    });
  });

  it("returns null when ViaCEP returns erro: true", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        erro: true,
      }),
    } as unknown as Response);

    const result = await fetchAddressByCep("99999999");
    expect(result).toBeNull();
  });

  it("returns null when network request fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failed"));

    const result = await fetchAddressByCep("21931580");
    expect(result).toBeNull();
  });
});
