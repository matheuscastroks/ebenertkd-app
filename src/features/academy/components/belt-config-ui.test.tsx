import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { resolveRankConfigs } from "@/features/academy/belt-rules";
import { DEFAULT_EXAM_POLICY } from "@/features/academy/defaults";
import { findBeltPreset } from "@/features/academy/presets";

const actions = vi.hoisted(() => ({
  saveRanks: vi.fn(),
  previewRanks: vi.fn(),
  applyPreset: vi.fn(),
  saveExam: vi.fn(),
  previewExam: vi.fn(),
  saveBelts: vi.fn()
}));
const refresh = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/app/actions/academy-settings", () => ({
  saveBeltRanksAction: actions.saveRanks,
  previewRankImpactAction: actions.previewRanks,
  applyBeltPresetAction: actions.applyPreset,
  saveExamPolicyAction: actions.saveExam,
  previewExamImpactAction: actions.previewExam,
  saveBeltsPolicyAction: actions.saveBelts
}));

import { BeltColorField } from "@/features/academy/components/belt-color-field";
import { BeltPresetDialog } from "@/features/academy/components/belt-preset-dialog";
import { BeltRanksEditor } from "@/features/academy/components/belt-ranks-editor";
import { ExamPolicyForm } from "@/features/academy/components/exam-policy-form";

const wrap = (node: React.ReactNode) => render(<TooltipProvider>{node}</TooltipProvider>);

beforeEach(() => {
  for (const mock of [...Object.values(actions), refresh, toast.success, toast.error]) mock.mockReset();
  actions.previewRanks.mockResolvedValue({ ok: true, impact: { total: 0, leaving: 0, entering: 0 } });
});

function ColorHost({ onChange }: { onChange: (hex: string) => void }) {
  const [value, setValue] = useState("#ffffff");
  return (
    <BeltColorField
      id="cor"
      label="Cor"
      value={value}
      onChange={(hex) => {
        setValue(hex);
        onChange(hex);
      }}
    />
  );
}

describe("seletor de cor da faixa", () => {
  it("oferece a paleta de cores comuns para pré-seleção", async () => {
    const onChange = vi.fn();
    render(<ColorHost onChange={onChange} />);
    const palette = screen.getByRole("radiogroup", { name: /cores comuns/ });
    const labels = within(palette).getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"));
    expect(labels).toEqual(["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Vermelha", "Preta"]);
    expect(within(palette).getByRole("radio", { name: "Branca" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(within(palette).getByRole("radio", { name: "Roxa" }));
    expect(onChange).toHaveBeenLastCalledWith("#7c3aed");
    expect(within(palette).getByRole("radio", { name: "Roxa" })).toHaveAttribute("aria-checked", "true");
    expect(within(palette).getByRole("radio", { name: "Branca" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText("Cor: código hexadecimal")).toHaveValue("#7c3aed");
  });

  it("aceita uma cor livre pelo seletor (color picker)", () => {
    const onChange = vi.fn();
    render(<ColorHost onChange={onChange} />);
    const picker = screen.getByLabelText("Cor: seletor de cor livre");
    expect(picker).toHaveAttribute("type", "color");
    fireEvent.change(picker, { target: { value: "#ff00aa" } });
    expect(onChange).toHaveBeenLastCalledWith("#ff00aa");
    expect(screen.getByLabelText("Cor: código hexadecimal")).toHaveValue("#ff00aa");
    // Cor livre não pertence à paleta: nenhuma cor comum fica marcada.
    expect(screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("aceita o hex digitado (curto ou longo) e avisa quando o formato é inválido", async () => {
    const onChange = vi.fn();
    render(<ColorHost onChange={onChange} />);
    const hex = screen.getByLabelText("Cor: código hexadecimal");
    // Hex completo vale na hora, maiúsculas ou minúsculas.
    await userEvent.clear(hex);
    await userEvent.type(hex, "#1A2B3C");
    expect(onChange).toHaveBeenLastCalledWith("#1a2b3c");
    expect(hex).toHaveValue("#1a2b3c");
    onChange.mockClear();
    // Hex curto (#abc) é aceito ao sair do campo; enquanto digita nada muda.
    await userEvent.clear(hex);
    await userEvent.type(hex, "#123");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(hex);
    expect(onChange).toHaveBeenLastCalledWith("#112233");
    expect(hex).toHaveValue("#112233");
    // Texto inválido: avisa e restaura a última cor válida ao sair do campo.
    await userEvent.clear(hex);
    await userEvent.type(hex, "zz");
    expect(screen.queryByText("Use o formato #RRGGBB.")).not.toBeInTheDocument();
    fireEvent.blur(hex);
    expect(screen.getByText("Use o formato #RRGGBB.")).toBeVisible();
    expect(hex).toHaveValue("#112233");
  });
});

describe("editor de graduações", () => {
  const ranks = resolveRankConfigs(null);

  it("lista as graduações em grupos, do 10º gub ao Dan, com prévia ao vivo da faixa", () => {
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    expect(screen.getByRole("heading", { name: /Gubs/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Poom" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Dan \(faixa preta\)/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Faixa .*Gub/ })).toHaveLength(10);
    expect(screen.getByText("Nenhuma alteração pendente.")).toBeInTheDocument();
    // Desativada por padrão: Poom e Dan 4-9.
    expect(screen.getAllByText("Desativada")).toHaveLength(10);
  });

  it("renomear e escolher uma cor atualiza a prévia, sem alterar o que não foi tocado", async () => {
    const user = userEvent.setup();
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa Ponta Amarela/ }));
    const name = screen.getByLabelText("Nome na academia");
    await user.clear(name);
    await user.type(name, "Laranja");
    await user.click(screen.getAllByRole("radio", { name: "Laranja" })[0]);
    expect(screen.getAllByText("Laranja").length).toBeGreaterThan(1);
    expect(screen.getByRole("status")).toHaveTextContent("1 graduação alterada");
    expect(screen.getAllByText("Alterada")).toHaveLength(1);
  });

  it("salvar só nome e cor não calcula impacto e envia a revisão que o professor viu", async () => {
    const user = userEvent.setup();
    actions.saveRanks.mockResolvedValue({ ok: true, changed: 1 });
    const revised = resolveRankConfigs([{ rank_key: "gub-9", revision: 4 }]);
    wrap(<BeltRanksEditor ranks={revised} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa Ponta Amarela/ }));
    const name = screen.getByLabelText("Nome na academia");
    await user.clear(name);
    await user.type(name, "Laranja");
    await user.click(screen.getByRole("button", { name: "Salvar graduações" }));
    expect(actions.previewRanks).not.toHaveBeenCalled();
    expect(await screen.findByText(/Alunos, presenças e o histórico de faixas não mudam/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.saveRanks).toHaveBeenCalledTimes(1));
    const [patches] = actions.saveRanks.mock.calls[0];
    expect(patches).toEqual([{ rank_key: "gub-9", revision: 4, data: expect.objectContaining({ display_name: "Laranja", min_days: 90 }) }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Graduações atualizadas"));
    expect(refresh).toHaveBeenCalled();
  });

  it("mudar tempo ou presenças mostra o impacto antes de confirmar", async () => {
    const user = userEvent.setup();
    actions.previewRanks.mockResolvedValue({ ok: true, impact: { total: 40, leaving: 12, entering: 3 } });
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa Branca/ }));
    const days = screen.getByLabelText("Tempo mínimo (dias)");
    await user.clear(days);
    await user.type(days, "200");
    await user.click(screen.getByRole("button", { name: "Salvar graduações" }));
    expect(await screen.findByText(/12 alunos deixam de estar elegíveis e 3 passam a estar/)).toBeVisible();
    expect(actions.previewRanks).toHaveBeenCalledWith([expect.objectContaining({ rank_key: "gub-10", data: expect.objectContaining({ min_days: 200 }) })]);
    expect(actions.saveRanks).not.toHaveBeenCalled();
  });

  it("uma graduação com alunos não pode ser desativada", async () => {
    const user = userEvent.setup();
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{ "gub-5": 2 }} />);
    await user.click(screen.getByRole("button", { name: /Faixa Ponta Azul/ }));
    expect(screen.getByRole("switch", { name: "Usar esta graduação na academia" })).toBeDisabled();
    expect(screen.getByText(/2 alunos nesta graduação: mude a graduação deles/)).toBeVisible();
  });

  it("o servidor também recusa e a tela mostra o motivo na graduação", async () => {
    const user = userEvent.setup();
    actions.saveRanks.mockResolvedValue({ ok: false, error: "rank_in_use", inUse: ["gub-1"] });
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa Ponta Preta/ }));
    await user.click(screen.getByRole("switch", { name: "Usar esta graduação na academia" }));
    await user.click(screen.getByRole("button", { name: "Salvar graduações" }));
    await user.click(await screen.findByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Graduação com alunos não pode ser desativada", expect.anything()));
    expect(await screen.findByText("Há alunos nesta graduação. Mude a graduação deles antes de desativar.")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("habilitar o Poom e descartar as alterações volta ao que está salvo", async () => {
    const user = userEvent.setup();
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa 1º Poom/ }));
    await user.click(screen.getByRole("switch", { name: "Usar esta graduação na academia" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 graduação alterada");
    await user.click(screen.getByRole("button", { name: "Descartar alterações" }));
    expect(screen.getByText("Nenhuma alteração pendente.")).toBeInTheDocument();
  });

  it("mostra erro de validação do servidor na graduação certa", async () => {
    const user = userEvent.setup();
    actions.saveRanks.mockResolvedValue({ ok: false, error: "invalid", fields: { "gub-9.display_name": "Já existe outra graduação com este nome" } });
    wrap(<BeltRanksEditor ranks={ranks} studentsPerRank={{}} />);
    await user.click(screen.getByRole("button", { name: /Faixa Ponta Amarela/ }));
    const name = screen.getByLabelText("Nome na academia");
    await user.clear(name);
    await user.type(name, "Amarela");
    await user.click(screen.getByRole("button", { name: "Salvar graduações" }));
    await user.click(await screen.findByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Já existe outra graduação com este nome")).toBeVisible();
    expect(toast.error).toHaveBeenCalledWith("Confira os campos", expect.objectContaining({ description: "Já existe outra graduação com este nome" }));
  });
});

describe("aplicar modelo de federação", () => {
  const ranks = resolveRankConfigs(null);

  it("mostra a prévia do que muda, avisa o que não muda e marca valores incertos", async () => {
    const user = userEvent.setup();
    wrap(<BeltPresetDialog ranks={ranks} preset={findBeltPreset("itf")!} />);
    await user.click(screen.getByRole("button", { name: "ITF" }));
    expect(await screen.findByText("Aplicar o modelo ITF?")).toBeVisible();
    expect(screen.getByText(/Alunos, tempos, presenças, taxas e quais graduações estão habilitadas não mudam/)).toBeVisible();
    const list = screen.getByRole("list", { name: "Mudanças do modelo" });
    expect(within(list).getByText("Branca listra Amarela")).toBeVisible();
    expect(within(list).getAllByText("Revise: valor sugerido").length).toBeGreaterThan(0);
    expect(screen.getByText("Termo da forma").nextElementSibling).toHaveTextContent("Tul");
    expect(actions.applyPreset).not.toHaveBeenCalled();
  });

  it("só aplica depois da confirmação", async () => {
    const user = userEvent.setup();
    actions.applyPreset.mockResolvedValue({ ok: true, changed: 12 });
    wrap(<BeltPresetDialog ranks={ranks} preset={findBeltPreset("kukkiwon")!} />);
    await user.click(screen.getByRole("button", { name: "Kukkiwon" }));
    await user.click(await screen.findByRole("button", { name: "Aplicar modelo" }));
    await waitFor(() => expect(actions.applyPreset).toHaveBeenCalledWith("kukkiwon"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it("o modelo base já é o padrão: avisa que só os termos podem mudar", async () => {
    const user = userEvent.setup();
    wrap(<BeltPresetDialog ranks={ranks} preset={findBeltPreset("cbtkd")!} />);
    await user.click(screen.getByRole("button", { name: "CBTKD" }));
    expect(await screen.findByText(/já são os deste modelo/)).toBeVisible();
    expect(screen.queryByRole("list", { name: "Mudanças do modelo" })).not.toBeInTheDocument();
  });
});

describe("formulário de regras de exame", () => {
  it("mostra os padrões atuais e o impacto na elegibilidade", async () => {
    actions.previewExam.mockResolvedValue({ ok: true, impact: { total: 20, leaving: 1, entering: 4 } });
    wrap(<ExamPolicyForm policy={DEFAULT_EXAM_POLICY} revision={0} />);
    expect(screen.getByRole("textbox", { name: /Quase pronto/ })).toHaveValue("75");
    expect(screen.getByLabelText("Tempo mínimo padrão (dias)")).toHaveValue("90");
    expect(screen.getByLabelText("Presenças mínimas padrão")).toHaveValue("24");
    expect(screen.getByRole("switch", { name: "Permitir pular graduações" })).toBeChecked();
    fireEvent.change(screen.getByLabelText("Tempo mínimo padrão (dias)"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver o impacto na elegibilidade" }));
    expect(await screen.findByRole("status")).toHaveTextContent("1 aluno deixa de estar elegível e 4 passam a estar.");
    expect((actions.previewExam.mock.calls[0][0] as FormData).get("fallback_min_days")).toBe("60");
  });

  it("confirma com os avisos e envia os valores com a revisão", async () => {
    actions.saveExam.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<ExamPolicyForm policy={DEFAULT_EXAM_POLICY} revision={3} />);
    fireEvent.change(screen.getByLabelText("Taxa padrão da banca"), { target: { value: "180,00" } });
    fireEvent.click(screen.getByRole("switch", { name: "Mensalidade em atraso bloqueia a inscrição" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras de exame" }));
    expect(await screen.findByText(/A inadimplência deixa de bloquear a inscrição/)).toBeVisible();
    expect(screen.getByText(/Novas bancas sugerem a taxa de/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.saveExam).toHaveBeenCalledTimes(1));
    const sent = Object.fromEntries((actions.saveExam.mock.calls[0][0] as FormData).entries());
    expect(sent).toMatchObject({ default_fee: "180,00", revision: "3", almost_ready_pct: "75" });
    expect(sent).not.toHaveProperty("block_on_overdue");
  });
});
