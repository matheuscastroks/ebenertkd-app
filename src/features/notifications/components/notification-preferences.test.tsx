import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/app/actions/notifications", () => ({ setNotificationPreferenceAction: vi.fn() }));
import { NotificationPreferences } from "./notification-preferences";

const initial = { announcements_enabled: true, financial_enabled: true, system_enabled: true };

it("menor não vê a preferência de mensalidades", () => {
  render(<NotificationPreferences initial={initial} showFinancial={false} />);
  expect(screen.queryByText("Mensalidades e pagamentos")).toBeNull();
  expect(screen.getAllByRole("switch")).toHaveLength(2);
});

it("adulto controla as três categorias", () => {
  render(<NotificationPreferences initial={initial} showFinancial />);
  expect(screen.getByRole("switch", { name: /mensalidades e pagamentos/ })).toBeChecked();
  expect(screen.getAllByRole("switch")).toHaveLength(3);
});
