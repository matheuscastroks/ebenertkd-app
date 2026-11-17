import { expect, it } from "vitest";
import { operationFailureSummary } from "./operation-failure-summary";

it("resume a causa operacional sem expor mensagens brutas do backend", () => {
  expect(operationFailureSummary('{"error":"permission denied for private-document"}')).toContain("permissões");
  expect(operationFailureSummary("network timeout")).toContain("comunicação");
  expect(operationFailureSummary("quota exceeded")).toContain("limite");
  expect(operationFailureSummary("token invalid: secret-value")).not.toContain("secret-value");
  expect(operationFailureSummary()).toContain("sem uma causa detalhada");
});
