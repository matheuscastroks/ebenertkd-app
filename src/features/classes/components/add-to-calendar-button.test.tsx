import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddToCalendarButton } from "@/features/classes/components/add-to-calendar-button";

describe("AddToCalendarButton", () => {
  it("abre o menu com links para Google Agenda, Outlook e opção Apple Calendar (.ics)", async () => {
    const user = userEvent.setup();
    render(
      <AddToCalendarButton
        uid="class-weekly-cls1"
        title="Taekwondo · Adulto Noite"
        date="2026-11-18"
        startTime="19:30"
        endTime="20:30"
        location="Dojang principal"
        description="Treino semanal"
        recurrenceWeekdays={["Quarta", "Sexta"]}
        fileName="grade-cls1"
        label="Salvar grade na agenda"
      />
    );

    const trigger = screen.getByRole("button", { name: /salvar grade na agenda/i });
    await user.click(trigger);

    const googleLink = await screen.findByRole("menuitem", { name: /google agenda/i });
    expect(googleLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://calendar.google.com/calendar/render?")
    );
    expect(googleLink).toHaveAttribute("href", expect.stringContaining("RRULE%3AFREQ%3DWEEKLY%3BBYDAY%3DWE%2CFR"));
    expect(googleLink).toHaveAttribute("target", "_blank");

    const outlookLink = screen.getByRole("menuitem", { name: /outlook/i });
    expect(outlookLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://outlook.live.com/calendar/0/action/compose?")
    );

    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ics-test");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const appleItem = screen.getByRole("menuitem", { name: /apple calendar/i });
    await user.click(appleItem);

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:ics-test");
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
  });
});
