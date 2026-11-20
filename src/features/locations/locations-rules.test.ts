import { describe, expect, it } from "vitest";
import { locationInputSchema, toTrainingLocation } from "@/features/locations/locations-rules";

describe("coordenadas do local", () => {
  it("aceita vírgula decimal e deixa vazio como sem coordenadas", () => {
    expect(locationInputSchema.parse({ name: "Dojang", latitude: "-23,55052", longitude: "-46.633308", check_in_radius_m: "200" })).toMatchObject({ latitude: -23.55052, longitude: -46.633308, check_in_radius_m: 200 });
    expect(locationInputSchema.parse({ name: "Dojang", latitude: "", longitude: "" })).toMatchObject({ latitude: undefined, longitude: undefined });
  });

  it("exige latitude e longitude juntas e dentro dos limites", () => {
    expect(locationInputSchema.safeParse({ name: "Dojang", latitude: "-23.5" }).success).toBe(false);
    expect(locationInputSchema.safeParse({ name: "Dojang", latitude: "95", longitude: "0" }).success).toBe(false);
    expect(locationInputSchema.safeParse({ name: "Dojang", latitude: "1", longitude: "2", check_in_radius_m: "5" }).success).toBe(false);
  });

  it("local com coordenadas e sem raio usa 150 m", () => {
    expect(toTrainingLocation({ $id: "l1", name: "Dojang", latitude: 1, longitude: 2 })).toMatchObject({ latitude: 1, longitude: 2, check_in_radius_m: 150 });
    expect(toTrainingLocation({ $id: "l2", name: "Sem mapa" }).check_in_radius_m).toBeUndefined();
  });
});
