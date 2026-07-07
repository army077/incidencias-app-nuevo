/**
 * Script: generar_acta_aldama.mjs
 * Uso:  node scripts/generar_acta_aldama.mjs
 *
 * Copia acta_jm.pdf, cubre la dirección del cuerpo y del pie de página
 * con rectángulos blancos y escribe la dirección de Aldama.
 *
 * Si algún texto no queda en la posición correcta, ajusta los valores
 * de `bodyY` o `footerY` y vuelve a ejecutar el script.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir  = resolve(__dirname, '../public');

const inputPath  = resolve(publicDir, 'acta_jm.pdf');
const outputPath = resolve(publicDir, 'acta_aldama.pdf');

// ── Textos nuevos ────────────────────────────────────────────────────────────
const nuevaLineaCuerpo =
  'AR TECNOLOGÍA SA DE CV en C. Aldama 679, El Mante, Tlaquepaque y estando';

const nuevoPie =
  'AR TECNOLOGIA SA DE CV, ATE081208V21, C. Aldama 679, El Mante CP: 45235 Zapopan Jalisco Tel (33) 3144-1243';

// ── Coordenadas (ajusta si el texto no queda exacto) ─────────────────────────
const bodyY   = 596;   // Y (desde abajo) de la línea del cuerpo con la dirección
const footerY = 18;    // Y (desde abajo) del pie de página

async function main() {
  const pdfBytes = readFileSync(inputPath);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page     = pdfDoc.getPages()[0];
  const { width } = page.getSize();

  // ── 1. Cubrir línea del CUERPO ───────────────────────────────────────────
  page.drawRectangle({ x: 0, y: bodyY,   width, height: 13, color: rgb(1, 1, 1) });
  page.drawText(nuevaLineaCuerpo, {
    x: 57, y: bodyY + 2,
    size: 10, font, color: rgb(0, 0, 0),
  });

  // ── 2. Cubrir PIE DE PÁGINA ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: footerY, width, height: 14, color: rgb(1, 1, 1) });
  const footerFontSize = 7;
  const footerTextW    = font.widthOfTextAtSize(nuevoPie, footerFontSize);
  page.drawText(nuevoPie, {
    x: (width - footerTextW) / 2, y: footerY + 3,
    size: footerFontSize, font, color: rgb(0.2, 0.2, 0.6),
  });

  writeFileSync(outputPath, await pdfDoc.save());
  console.log(`✅ Guardado en: ${outputPath}`);
  console.log(`   Si el texto del cuerpo no queda bien, ajusta bodyY (actual: ${bodyY})`);
  console.log(`   Si el pie no queda bien, ajusta footerY (actual: ${footerY})`);
}

main().catch((err) => { console.error('❌ Error:', err); process.exit(1); });
