export function buildAnalysisPrompt(extractedText, fileName, documentTypeHint) {
    return `You are a legal document analyzer. Analyze the document and return only JSON matching the provided schema.

Rules:
- Use plain English.
- riskLevel must be one of Low, Medium, High.
- completionScore must be a decimal between 0 and 1.
- fields must include important missing or completed contract fields.
- Do not include raw document text in the response.

File name: ${fileName}
Document type hint: ${documentTypeHint || 'none'}

Document text:
${extractedText}`;
}
