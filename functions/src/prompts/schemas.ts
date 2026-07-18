export function analysisResponseSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      summary: {
        type: 'OBJECT',
        properties: {
          points: { type: 'ARRAY', items: { type: 'STRING' } },
          contractType: { type: 'STRING' },
          missingOrAmbiguousTerms: { type: 'ARRAY', items: { type: 'STRING' } },
          purpose: { type: 'STRING' },
          keyObligations: { type: 'ARRAY', items: { type: 'STRING' } },
          keyRights: { type: 'ARRAY', items: { type: 'STRING' } },
          overview: { type: 'STRING' }
        },
        required: ['points']
      },
      fields: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            status: { type: 'STRING', enum: ['Filled', 'Missing/Needs Input'] },
            value: { type: 'STRING' },
            description: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            type: { type: 'STRING' },
            required: { type: 'BOOLEAN' }
          },
          required: ['name', 'status']
        }
      },
      documentType: { type: 'STRING' },
      riskLevel: { type: 'STRING', enum: ['Low', 'Medium', 'High'] },
      completionScore: { type: 'NUMBER' },
      contractType: { type: 'STRING' },
      purpose: { type: 'STRING' },
      parties: { type: 'ARRAY', items: { type: 'STRING' } },
      keyTerms: { type: 'ARRAY', items: { type: 'STRING' } },
      importantDates: { type: 'OBJECT', additionalProperties: { type: 'STRING' } },
      paymentTerms: { type: 'STRING' },
      terminationClauses: { type: 'ARRAY', items: { type: 'STRING' } },
      concerningPoints: { type: 'ARRAY', items: { type: 'STRING' } },
      riskFactors: { type: 'ARRAY', items: { type: 'STRING' } },
      overallSummary: { type: 'STRING' },
      missingElements: { type: 'ARRAY', items: { type: 'STRING' } },
      ambiguousTerms: { type: 'ARRAY', items: { type: 'STRING' } },
      recommendedAdditions: { type: 'ARRAY', items: { type: 'STRING' } },
      completionExplanation: { type: 'STRING' },
      requiredToComplete: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['summary', 'fields', 'documentType', 'riskLevel', 'completionScore']
  };
}

export function suggestionResponseSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            type: { type: 'STRING', enum: ['improvement', 'risk-mitigation', 'cost-optimization', 'clarity'] },
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            priority: { type: 'STRING', enum: ['high', 'medium', 'low'] },
            impact: { type: 'STRING' }
          },
          required: ['type', 'title', 'description', 'priority', 'impact']
        }
      }
    },
    required: ['suggestions']
  };
}

export function chatResponseSchema(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: { response: { type: 'STRING' } },
    required: ['response']
  };
}
