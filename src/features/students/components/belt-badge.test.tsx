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
  it("shows only the belt mini and the graduation level by default", () => {
    render(<BeltBadge rankKey="gub-8" />);
    expect(screen.queryByText("Amarela")).not.toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Amarela, 8º Gub")).toBeInTheDocument();
  });

  it("renders the white belt, a tip belt and the first Dan from the catalog defaults", () => {
    const { unmount } = render(<BeltBadge rankKey="gub-10" />);
    expect(screen.getByText("10º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Branca, 10º Gub")).toBeInTheDocument();
    unmount();
    const second = render(<BeltBadge rankKey="gub-9" />);
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Ponta Amarela, 9º Gub")).toBeInTheDocument();
    second.unmount();
    render(<BeltBadge rankKey="dan-1" />);
    expect(screen.queryByText("Preta")).not.toBeInTheDocument();
    expect(screen.getByText("1º Dan")).toBeInTheDocument();
  });

  it("uses the name the academy configured in accessibility labels and the federation's level term", () => {
    const ranks = DEFAULT_PUBLIC_RANKS.map((rank) =>
      rank.rank_key === "gub-9" ? { ...rank, display_name: "Laranja", color_primary: "#f97316", color_style: "solid" as const } : rank
    );
    render(
      <AcademyConfigProvider value={config({ ranks, levelLabel: "Gup" })}>
        <BeltBadge rankKey="gub-9" />
      </AcademyConfigProvider>
    );
    expect(screen.getByText("9º Gup")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Laranja, 9º Gup")).toBeInTheDocument();
    expect(screen.queryByText("Ponta Amarela")).not.toBeInTheDocument();
  });

  it("hides the belt name visually even for a historical snapshot when showRank is true", () => {
    const { unmount } = render(<BeltBadge rankKey="gub-8" showName />);
    expect(screen.getByText("Amarela")).toBeInTheDocument();
    expect(screen.getByText("8º Gub")).toBeInTheDocument();
    unmount();

    const snapshot = render(<BeltBadge rankKey="gub-9" nameOverride="Nome da época" />);
    expect(screen.queryByText("Nome da época")).not.toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Nome da época, 9º Gub")).toBeInTheDocument();
    snapshot.unmount();

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

  it("renders Dan belts with vertical gold bars near the tip instead of a solid right block", () => {
    const firstDan = render(<BeltBadge rankKey="dan-1" />);
    const firstStyle = (firstDan.container.querySelector("span[aria-hidden='true']") as HTMLElement).getAttribute("style") ?? "";
    expect(firstStyle).toContain("74%");
    expect(firstStyle).toContain("84%");
    firstDan.unmount();

    const thirdDan = render(<BeltBadge rankKey="dan-3" />);
    const thirdStyle = (thirdDan.container.querySelector("span[aria-hidden='true']") as HTMLElement).getAttribute("style") ?? "";
    expect(thirdStyle).toContain("54%");
    expect(thirdStyle).toContain("87%");
  });

  it("renders the live preview badge with the level label by default and name when requested", () => {
    const { unmount } = render(<BeltBadgeView appearance={{ ...base, colorStyle: "stripe" }} rankLabel="9º Gub" />);
    expect(screen.queryByText("Teste")).not.toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
    expect(screen.getByLabelText("Faixa Teste, 9º Gub")).toBeInTheDocument();
    unmount();

    render(<BeltBadgeView appearance={{ ...base, colorStyle: "stripe" }} rankLabel="9º Gub" showName />);
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("9º Gub")).toBeInTheDocument();
  });
});
