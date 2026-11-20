import { describe, expect, it } from "vitest";
import {
  canCheckIn,
  canJustify,
  checkInPhase,
  checkInWindow,
  DEFAULT_CHECK_IN_RADIUS_M,
  effectiveRadius,
  evaluateCheckIn,
  haversineMeters,
  lessonInstant,
  normalizeJustification,
  resolveCheckInPlace
} from "@/features/classes/check-in-rules";

const dojang = { latitude: -23.55052, longitude: -46.633308 };
const slot = { date: "2026-11-20", startTime: "19:00", endTime: "20:30" };
const at = (time: string) => new Date(`2026-11-20T${time}:00-03:00`);

describe("distância (Haversine)", () => {
  it("é zero no mesmo ponto e ~111 m em 0,001° de latitude", () => {
    expect(haversineMeters(dojang, dojang)).toBe(0);
    expect(haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0.001, longitude: 0 })).toBeCloseTo(111.19, 1);
  });

  it("confere distância conhecida entre dois pontos de São Paulo (~2,5 km)", () => {
    const masp = { latitude: -23.561414, longitude: -46.655881 };
    expect(haversineMeters(dojang, masp)).toBeGreaterThan(2400);
    expect(haversineMeters(dojang, masp)).toBeLessThan(2700);
  });

  it("aceita dentro do raio, recusa fora e devolve só a distância arredondada", () => {
    const near = { latitude: dojang.latitude + 0.0009, longitude: dojang.longitude }; // ~100 m
    const far = { latitude: dojang.latitude + 0.0018, longitude: dojang.longitude }; // ~200 m
    expect(evaluateCheckIn(near, dojang)).toEqual({ inside: true, distanceM: 100, radiusM: DEFAULT_CHECK_IN_RADIUS_M });
    expect(evaluateCheckIn(far, dojang)).toEqual({ inside: false, distanceM: 200, radiusM: 150 });
    expect(evaluateCheckIn(far, { ...dojang, radiusM: 250 }).inside).toBe(true);
  });

  it("rejeita posição inválida", () => {
    expect(() => evaluateCheckIn({ latitude: 91, longitude: 0 }, dojang)).toThrow("check_in_invalid_position");
    expect(() => evaluateCheckIn({ latitude: Number.NaN, longitude: 0 }, dojang)).toThrow("check_in_invalid_position");
  });

  it("limita o raio entre 25 m e 2 km, com 150 m de padrão", () => {
    expect(effectiveRadius(undefined)).toBe(150);
    expect(effectiveRadius(5)).toBe(25);
    expect(effectiveRadius(99999)).toBe(2000);
  });
});

describe("janela de check-in", () => {
  it("usa o horário de Brasília (UTC−3)", () => {
    expect(lessonInstant("2026-11-20", "19:00").toISOString()).toBe("2026-11-20T22:00:00.000Z");
  });

  it("abre 15 min antes e fecha 30 min depois do início", () => {
    const window = checkInWindow(slot);
    expect(window.opensAt.toISOString()).toBe(at("18:45").toISOString());
    expect(window.closesAt.toISOString()).toBe(at("19:30").toISOString());
    expect(window.endsAt.toISOString()).toBe(at("20:30").toISOString());
  });

  it.each([
    ["18:44", "upcoming"],
    ["18:45", "open"],
    ["19:30", "open"],
    ["19:31", "late"],
    ["20:30", "ended"]
  ] as const)("às %s a fase é %s", (time, phase) => {
    expect(checkInPhase(slot, at(time))).toBe(phase);
  });

  it("check-in só na janela; justificativa até o fim da aula", () => {
    expect([canCheckIn("upcoming"), canCheckIn("open"), canCheckIn("late"), canCheckIn("ended")]).toEqual([false, true, false, false]);
    expect([canJustify("upcoming"), canJustify("open"), canJustify("late"), canJustify("ended")]).toEqual([true, true, true, false]);
  });

  it("encerra as ações ao fim de uma aula com menos de 30 minutos", () => {
    const shortSlot = { ...slot, endTime: "19:20" };
    expect(checkInWindow(shortSlot).closesAt).toEqual(at("19:20"));
    expect(checkInPhase(shortSlot, at("19:19"))).toBe("open");
    expect(checkInPhase(shortSlot, at("19:20"))).toBe("ended");
  });
});

describe("justificativa e local", () => {
  it("normaliza o texto e exige de 3 a 280 caracteres", () => {
    expect(normalizeJustification("  consulta   médica ")).toBe("consulta médica");
    expect(normalizeJustification("ok")).toBeNull();
    expect(normalizeJustification("x".repeat(281))).toBeNull();
    expect(normalizeJustification(42)).toBeNull();
  });

  it("acha o local pelo nome da turma, cai no padrão e ignora local sem coordenadas", () => {
    const locations = [
      { name: "Dojang Centro", is_default: true, latitude: 1, longitude: 2, check_in_radius_m: 200 },
      { name: "Ginásio", latitude: 3, longitude: 4 },
      { name: "Sem mapa" }
    ];
    expect(resolveCheckInPlace(" ginásio ", locations)).toEqual({ latitude: 3, longitude: 4, radiusM: null });
    expect(resolveCheckInPlace("Outro", locations)).toEqual({ latitude: 1, longitude: 2, radiusM: 200 });
    expect(resolveCheckInPlace("Sem mapa", locations)).toBeNull();
    expect(resolveCheckInPlace(null, [{ name: "X" }])).toBeNull();
  });
});
