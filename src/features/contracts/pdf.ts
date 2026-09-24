import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Contract } from "@/features/contracts/types";

const pdfSafe = (value: string) => value
  .replace(/[–—]/g, "-")
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[^\x20-\xFF]/g, "?");

function wrapText(text: string, maxCharacters = 92) {
  const lines: string[] = [];
  for (const paragraph of pdfSafe(text).split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > maxCharacters && line) {
        lines.push(line);
        line = word;
      } else line = `${line} ${word}`.trim();
    }
    if (line) lines.push(line);
    lines.push("");
  }
  return lines;
}

export async function buildSignedContractPdf(contract: Contract, signerName: string, signatureDataUrl: string, signedAt: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signatureBytes = Uint8Array.from(Buffer.from(signatureDataUrl.split(",")[1], "base64"));
  const signature = await pdf.embedPng(signatureBytes);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = 785;

  const footer = () => {
    page.drawText(`Contrato ${contract.$id} - SHA-256 ${contract.content_hash.slice(0, 24)}...`, { x: 48, y: 28, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) });
  };
  const nextPage = () => {
    footer();
    page = pdf.addPage(pageSize);
    y = 790;
  };

  page.drawText("EBENERT KD", { x: 48, y, size: 11, font: bold, color: rgb(0.73, 0.08, 0.08) });
  y -= 28;
  page.drawText("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", { x: 48, y, size: 16, font: bold });
  y -= 34;
  for (const line of wrapText(contract.content_snapshot)) {
    if (y < 90) nextPage();
    if (line) page.drawText(line, { x: 48, y, size: 10.5, font: regular, color: rgb(0.12, 0.12, 0.12) });
    y -= line ? 16 : 8;
  }
  if (y < 230) nextPage();
  y -= 12;
  page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 0.8, color: rgb(0.8, 0.8, 0.8) });
  y -= 24;
  page.drawText("ASSINATURA ELETRÔNICA", { x: 48, y, size: 11, font: bold });
  y -= 22;
  page.drawText(`Assinante: ${pdfSafe(signerName)}`, { x: 48, y, size: 10, font: regular });
  y -= 16;
  page.drawText(`Data: ${new Date(signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, { x: 48, y, size: 10, font: regular });
  y -= 82;
  const scaled = signature.scaleToFit(220, 70);
  page.drawImage(signature, { x: 48, y, width: scaled.width, height: scaled.height });
  footer();
  const pages = pdf.getPages();
  pages.forEach((current, index) => current.drawText(`Página ${index + 1} de ${pages.length}`, { x: 490, y: 28, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) }));
  return pdf.save();
}
