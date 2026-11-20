import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AcademyConfigProvider, type PublicAcademyConfig } from "@/components/academy-config-provider";
import { DEFAULT_PUBLIC_RANKS } from "@/features/academy/belt-rules";
import { GraduationFields } from "@/features/students/components/graduation-fields";

const config = (ranks = DEFAULT_PUBLIC_RANKS): PublicAcademyConfig => ({
  shortName: "Academia",
  displayName: "Academia",
  dueDayOptions: [5, 10],
  professorLabel: "Mestre",
  ranks,
  formLabel: "Poomsae",
  levelLabel: "Gub"
});

describe("GraduationFields", () => {
  it("asks only for the graduation, showing the configured belt name", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultRankKey="gub-9" />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    const select = screen.getByRole("combobox", { name: "Graduação *" });
    expect(select).toHaveTextContent("Ponta Amarela");
    await user.click(select);
    await user.click(screen.getByRole("option", { name: /^Azul/ }));
    expect(screen.getByRole("combobox", { name: "Graduação *" })).toHaveTextContent("Azul");
    expect(screen.queryByText(/Faixa atual/)).not.toBeInTheDocument();
  });

  it("lists only the enabled graduations: Poom and Dan 4-9 start disabled", async () => {
    const user = userEvent.setup();
    render(<GraduationFields defaultRankKey="gub-10" />);
    await user.click(screen.getByRole("combobox", { name: "Graduação *" }));
    const names = screen.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(names).toHaveLength(13);
    expect(names.some((name) => name.includes("Poom"))).toBe(false);
    expect(names.some((name) => name.includes("4º Dan"))).toBe(false);
    expect(names.some((name) => name.includes("3º Dan"))).toBe(true);
    expect(names[0]).toContain("Branca");
  });

  it("shows graduations the academy enabled and hides the ones it disabled", async () => {
    const user = userEvent.setup();
    const ranks = DEFAULT_PUBLIC_RANKS.map((rank) => {
      if (rank.rank_key === "poom-1") return { ...rank, enabled: true };
      if (rank.rank_key === "gub-5") return { ...rank, enabled: false };
      return rank;
    });
    render(
      <AcademyConfigProvider value={config(ranks)}>
        <GraduationFields defaultRankKey="gub-10" />
      </AcademyConfigProvider>
    );
    await user.click(screen.getByRole("combobox", { name: "Graduação *" }));
    const names = screen.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(names.some((name) => name.includes("1º Poom"))).toBe(true);
    expect(names.some((name) => name.includes("Ponta Azul"))).toBe(false);
  });

  it("keeps the student's current graduation selectable even after the academy disabled it", () => {
    const ranks = DEFAULT_PUBLIC_RANKS.map((rank) => (rank.rank_key === "gub-5" ? { ...rank, enabled: false } : rank));
    render(
      <AcademyConfigProvider value={config(ranks)}>
        <GraduationFields defaultRankKey="gub-5" />
      </AcademyConfigProvider>
    );
    expect(screen.getByRole("combobox", { name: "Graduação *" })).toHaveTextContent("Ponta Azul");
  });
});
