import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildSignedContractPdf } from "@/features/contracts/pdf";
import type { Contract } from "@/features/contracts/types";

const transparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("signed contract PDF", () => {
  it("creates a readable PDF with verification metadata", async () => {
    const contract = { $id: "contract-1", content_snapshot: "Contrato de prestação de serviços\n\nCláusula de vigência.", content_hash: "a".repeat(64), student_name: "Ana", version_number: 1, ends_at: "2027-01-01T12:00:00.000Z" } as Contract;
    const bytes = await buildSignedContractPdf(contract, "Ana Silva", transparentPng, "2026-09-24T12:00:00.000Z");
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(0);
  });
});
