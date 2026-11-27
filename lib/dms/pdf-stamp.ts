import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import QRCode from "qrcode";

/**
 * Stamps a diagonal semi-transparent watermark across every page of a PDF.
 * Falls back to the original buffer if the PDF is malformed or unmodifiable.
 */
export async function watermarkPdfBuffer(input: Buffer, text: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(input, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const label = text.slice(0, 120);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.max(Math.min(width, height) / 28, 12);
      const stepY = Math.max(height / 4, 140);
      const stepX = Math.max(width / 2.2, 260);
      for (let y = 40; y < height; y += stepY) {
        for (let x = 20; x < width; x += stepX) {
          page.drawText(label, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.15, 0.15, 0.15),
            opacity: 0.16,
            rotate: degrees(-30),
          });
        }
      }
    }

    return Buffer.from(await pdfDoc.save());
  } catch (err) {
    console.warn("[pdf-stamp] PDF watermark fallback:", err);
    return input;
  }
}

/**
 * Stamps a scannable GFC verification QR badge in the bottom-right corner of every page.
 * Falls back to the original buffer if the PDF cannot be parsed.
 */
export async function stampQrOnPdfBuffer(
  input: Buffer,
  verifyUrl: string,
  caption: string
): Promise<Buffer> {
  try {
    const qrPng = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      width: 180,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const pdfDoc = await PDFDocument.load(input, { ignoreEncryption: true });
    const qrImage = await pdfDoc.embedPng(qrPng);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pdfDoc.getPages()) {
      const { width } = page.getSize();
      const qrSize = Math.min(Math.max(width * 0.09, 54), 84);
      const pad = 16;
      const boxW = qrSize + 12;
      const boxH = qrSize + 20;
      const x = Math.max(width - boxW - pad, pad);
      const y = pad;

      page.drawRectangle({
        x,
        y,
        width: boxW,
        height: boxH,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.15, 0.23, 0.35),
        borderWidth: 0.75,
        opacity: 0.94,
      });

      page.drawImage(qrImage, {
        x: x + 6,
        y: y + 14,
        width: qrSize,
        height: qrSize,
      });

      page.drawText(caption.slice(0, 26), {
        x: x + 6,
        y: y + 4,
        size: 6.5,
        font,
        color: rgb(0.08, 0.12, 0.2),
      });
    }

    return Buffer.from(await pdfDoc.save());
  } catch (err) {
    console.warn("[pdf-stamp] GFC QR stamp fallback:", err);
    return input;
  }
}
