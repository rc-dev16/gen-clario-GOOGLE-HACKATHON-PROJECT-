/** Keep prompt size bounded so there is room for a complete JSON response. */
const MAX_DOCUMENT_CHARS = 100_000;

export function buildAnalysisPrompt(
  extractedText: string,
  fileName: string,
  documentTypeHint?: string
): string {
  const truncated =
    extractedText.length > MAX_DOCUMENT_CHARS
      ? `${extractedText.slice(0, MAX_DOCUMENT_CHARS)}\n\n[Document truncated for analysis.]`
      : extractedText;

  return `You are a legal document analyzer. Analyze the document and return only JSON matching the provided schema.

Rules:
- Use plain English and keep every string concise (1-2 sentences max).
- riskLevel must be one of Low, Medium, High.
- completionScore must be a number between 0 and 1 with at most 2 decimal places (e.g. 0.75). Never leave a trailing decimal point.
- fields: include at most 12 important fields.
- Keep arrays short (at most 8 items each).
- Do not include raw document text in the response.
- Return complete, valid JSON only.

File name: ${fileName}
Document type hint: ${documentTypeHint || 'none'}

Document text:
${truncated}`;
}
