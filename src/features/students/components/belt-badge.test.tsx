import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AcademyConfigProvider, type PublicAcademyConfig } from "@/components/academy-config-provider";
import { DEFAULT_PUBLIC_RANKS } from "@/features/academy/belt-rules";
import { BeltBadge, BeltBadgeView, BeltMini } from "@/features/students/components/belt-badge";

const config = (overrides: Partial<PublicAcademyConfig> = {}): PublicAcademyConfig => ({
  shortName: "Academia",
  displayName: "Academia Teste",
  dueDayOptions: [5, 10],
  professorLabel: "Mestre",
  ranks: DEFAULT_PUBLIC_RANKS,
  formLabel: "Poomsae",
  levelLabel: "Gub",
  ...overrides
});

describe("BeltBadge", () => {
  it("shows the configured name and the graduation level", () => {
    render(<BeltBadge rankKey="gub-8" />);
    expect(screen.getByText("Amarela")).toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Amarela, 8º Gub")).toBeInTheDocument();
  });

  it("renders the white belt, a tip belt and the first Dan from the catalog defaults", () => {
    const { unmount } = render(<BeltBadge rankKey="gub-10" />);
    expect(screen.getByText("Branca")).toBeInTheDocument();
    unmount();
    const second = render(<BeltBadge rankKey="gub-9" />);
    expect(screen.getByText("Ponta Amarela")).toBeInTheDocument();
    second.unmount();
    render(<BeltBadge rankKey="dan-1" />);
    expect(screen.getByText("Preta")).toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
  });

  it("uses the name the academy configured and the federation's level term", () => {
    const ranks = DEFAULT_PUBLIC_RANKS.map((rank) =>
      rank.rank_key === "gub-9" ? { ...rank, display_name: "Laranja", color_primary: "#f97316", color_style: "solid" as const } : rank
    );
    render(
      <AcademyConfigProvider value={config({ ranks, levelLabel: "Gup" })}>
        <BeltBadge rankKey="gub-9" />
      </AcademyConfigProvider>
    );
    expect(screen.getByText("Laranja")).toBeInTheDocument();
    expect(screen.getByText("9º Gup")).toBeInTheDocument();
    expect(screen.queryByText("Ponta Amarela")).not.toBeInTheDocument();
  });

  it("can hide the level and show a historical name without touching the color", () => {
    render(<BeltBadge rankKey="gub-9" showRank={false} nameOverride="Nome da época" />);
    expect(screen.getByText("Nome da época")).toBeInTheDocument();
    expect(screen.queryByText("9º Gub")).not.toBeInTheDocument();
  });

  it("handles unknown or missing graduation gracefully", () => {
    const { unmount } = render(<BeltBadge />);
    expect(screen.getByText("Não informada")).toBeInTheDocument();
    unmount();
    render(<BeltBadge rankKey="faixa-que-nao-existe" />);
    expect(screen.getByText("Não informada")).toBeInTheDocument();
  });
});

describe("BeltBadgeView and BeltMini", () => {
  const base = { name: "Teste", colorPrimary: "#ffffff", colorSecondary: "#fbbf24" };

  it("draws tip, stripe and half belts from the configured colors", () => {
    const gradients = {
      // jsdom normaliza #hex para rgb().
      tip: "linear-gradient(to right, rgb(255, 255, 255) 0 72%, rgb(251, 191, 36) 72% 100%)",
      // "to bottom" é o padrão e o jsdom o omite.
      stripe: "linear-gradient(rgb(255, 255, 255) 0 36%, rgb(251, 191, 36) 36% 64%, rgb(255, 255, 255) 64% 100%)",
      half: "linear-gradient(rgb(255, 255, 255) 0 50%, rgb(251, 191, 36) 50% 100%)"
    } as const;
    for (const [style, expected] of Object.entries(gradients)) {
      const { container, unmount } = render(<BeltMini appearance={{ ...base, colorStyle: style as keyof typeof gradients }} />);
      const mini = container.querySelector("span") as HTMLElement;
      expect(mini.getAttribute("style")).toContain(expected);
      unmount();
    }
  });

  it("draws a solid belt with the primary color only", () => {
    const { container } = render(<BeltMini appearance={{ ...base, colorPrimary: "#2563eb", colorStyle: "solid" }} />);
    expect((container.querySelector("span") as HTMLElement).getAttribute("style")).toContain("background: rgb(37, 99, 235)");
  });

  it("renders the live preview badge with the name and level label", () => {
    render(<BeltBadgeView appearance={{ ...base, colorStyle: "stripe" }} rankLabel="9º Gub" />);
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
  });
});
