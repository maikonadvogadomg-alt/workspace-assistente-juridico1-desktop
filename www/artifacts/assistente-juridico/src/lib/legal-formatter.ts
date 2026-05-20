/**
 * Converts AI-generated plain text (legal documents) to properly formatted HTML
 * following ABNT standards for legal documents.
 *
 * BUG FIX #4 & #5: The original app set plain text directly into TipTap which
 * would make it all one block. This function properly converts each paragraph
 * to HTML with correct formatting before setting it in TipTap.
 *
 * BUG FIX #6: Header alignment was incorrectly set to center for ALL patterns
 * (both branches of ternary returned "text-align: center"). Fixed so that
 * headers/titles use text-align: justify + uppercase + bold as requested.
 */

const TITLE_PATTERNS = [
  /^EXMO(?:S?)\.\s*(?:SR\.|SR[A]\.)\s*DR(?:A?)\./i,
  /^EXCELENT[IÍ]SSIMO/i,
  /^ILLM[OA]\./i,
  /^DOS? FATOS?$/i,
  /^DO DIREITO$/i,
  /^DA JURISPRUD[EÊ]NCIA$/i,
  /^DOS? PEDIDOS?$/i,
  /^DO VALOR DA CAUSA$/i,
  /^DA COMPET[EÊ]NCIA$/i,
  /^DA LEGITIMIDADE$/i,
  /^DA FUNDAMENTA[CÇ][AÃ]O JUR[IÍ]DICA$/i,
  /^CONCLUS[AÃ]O$/i,
  /^REQUER(?:IMENTO)?S?$/i,
  /^PEDIDO[S]?$/i,
  /^NESTES TERMOS/i,
  /^TERMOS EM QUE/i,
  /^DO CABIMENTO$/i,
  /^DA TUTELA/i,
  /^DOS FUNDAMENTOS/i,
  /^DO M[EÉ]RITO$/i,
  /^PRELIMINAR(?:MENTE)?$/i,
];

const CITATION_START_PATTERNS = [
  /^[""]|^«|^\(/,
  /^EMENTA:/i,
  /^RELAT[OÓ]RIO:/i,
];

export function plainTextToLegalHtml(text: string): string {
  if (!text || !text.trim()) return "<p></p>";

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line) {
      if (htmlParts.length > 0 && htmlParts[htmlParts.length - 1] !== "") {
        htmlParts.push("");
      }
      continue;
    }

    const isAllCaps = line === line.toUpperCase() && /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(line) && line.length > 2 && line.length < 120;
    const isTitle = TITLE_PATTERNS.some(p => p.test(line));
    const isCitation = CITATION_START_PATTERNS.some(p => p.test(line));

    const escapedLine = escapeHtml(line);

    if (isTitle || (isAllCaps && !isCitation)) {
      // FIX: Headers/titles use text-align: justify, uppercase, bold, no indent
      // (Previously had bug where both branches of ternary returned "text-align: center")
      htmlParts.push(
        `<p style="text-align: justify; font-weight: bold; text-transform: uppercase; text-indent: 0; margin: 0.4cm 0 0.2cm;">${escapedLine}</p>`
      );
    } else if (isCitation) {
      htmlParts.push(
        `<p style="margin-left: 4cm; margin-right: 4cm; font-size: 10pt; line-height: 1.2; text-align: justify; font-style: italic; text-indent: 0;">${escapedLine}</p>`
      );
    } else if (line.match(/^(?:Nestes termos|Termos em que|Pede deferimento|Aguarda-se|P\. deferimento)/i)) {
      htmlParts.push(
        `<p style="text-align: justify; text-indent: 0; margin-top: 0.5cm;">${escapedLine}</p>`
      );
    } else if (line.match(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-zA-ZÀ-ú\s,]+,\s+\d+\s+de\s+\w+\s+de\s+\d{4}/)) {
      htmlParts.push(
        `<p style="text-align: right; text-indent: 0;">${escapedLine}</p>`
      );
    } else {
      // Normal paragraph: ABNT — justified, first-line indent 4cm, 1.5 line height
      htmlParts.push(
        `<p style="text-align: justify; text-indent: 4cm; line-height: 1.5;">${escapedLine}</p>`
      );
    }
  }

  return htmlParts.filter(p => p !== "").join("\n") || "<p></p>";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Streams incoming plain text chunks and converts complete paragraphs to HTML.
 * Used during AI streaming to progressively build the document.
 */
export class StreamingLegalFormatter {
  private buffer = "";

  processChunk(chunk: string): string {
    this.buffer += chunk;
    return "";
  }

  flush(): string {
    const result = this.buffer;
    this.buffer = "";
    return plainTextToLegalHtml(result);
  }

  reset(): void {
    this.buffer = "";
  }
}
