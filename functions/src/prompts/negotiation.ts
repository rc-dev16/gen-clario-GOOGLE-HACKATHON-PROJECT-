export function buildNegotiationSuggestionsPrompt(input: {
  party: string;
  fileName: string;
  documentType?: string;
  riskLevel?: string;
  keyTerms?: string[];
  paymentTerms?: string;
  concerningPoints?: string[];
  missingOrAmbiguousTerms?: string[];
  parties?: string[];
  extractedText: string;
}): string {
  return `Based on this contract analysis and the full document text, provide specific negotiation suggestions for the ${input.party} side.

Contract metadata:
- File: ${input.fileName}
- Type: ${input.documentType || 'unknown'}
- Risk Level: ${input.riskLevel || 'unknown'}
- Key Terms: ${(input.keyTerms || []).join(', ') || 'none'}
- Payment Terms: ${input.paymentTerms || 'none'}
- Concerning Points: ${(input.concerningPoints || []).join(', ') || 'none'}
- Missing Fields: ${(input.missingOrAmbiguousTerms || []).join(', ') || 'none'}
- Parties Involved: ${(input.parties || []).join(', ') || 'none'}

Document text:
${input.extractedText}

Provide 5-8 specific negotiation suggestions from the ${input.party}'s perspective.
Focus on practical, actionable suggestions that would benefit ${input.party}, improve contract terms, reduce risks, or clarify ambiguous points.
Use the actual document content for specific and relevant suggestions.`;
}

export function buildNegotiationAdvicePrompt(input: {
  party: string;
  question: string;
  fileName: string;
  documentType?: string;
  riskLevel?: string;
  keyTerms?: string[];
  concerningPoints?: string[];
  parties?: string[];
  extractedText: string;
}): string {
  return `You are a contract negotiation expert. Based on this contract analysis and the full document text, provide specific advice for the ${input.party} side.

Question: ${input.question}

Contract metadata:
- File: ${input.fileName}
- Type: ${input.documentType || 'unknown'}
- Risk Level: ${input.riskLevel || 'unknown'}
- Key Terms: ${(input.keyTerms || []).join(', ') || 'none'}
- Concerning Points: ${(input.concerningPoints || []).join(', ') || 'none'}
- Parties Involved: ${(input.parties || []).join(', ') || 'none'}

Document text:
${input.extractedText}

Provide practical, actionable advice from the ${input.party}'s perspective in plain English.`;
}
