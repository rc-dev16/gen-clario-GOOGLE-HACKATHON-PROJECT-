import React from 'react';
import { FileText, Calendar, Users, DollarSign, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Lightbulb } from 'lucide-react';
import { ContractSummary as SummaryType } from '../types';

interface ContractSummaryProps {
  summary: SummaryType;
  documentType: string;
  riskLevel: string;
  parties?: string[];
  importantDates?: Record<string, string>;
  paymentTerms?: string;
  overallSummary?: string;
  keyTerms?: string[];
  terminationClauses?: string[];
  concerningPoints?: string[];
  fields?: import('../types').ContractField[];
  setShowNegotiationSuggestions?: (open: boolean) => void;
}

const ContractSummary: React.FC<ContractSummaryProps> = ({
  summary,
  documentType,
  riskLevel,
  parties,
  importantDates,
  paymentTerms,
  overallSummary,
  keyTerms,
  terminationClauses,
  concerningPoints,
  setShowNegotiationSuggestions
}) => {
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return AlertTriangle;
      case 'Medium': return TrendingUp;
      case 'Low': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-amber-600 bg-amber-100';
      case 'Low': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDocumentTypeColor = (documentType: string) => {
    const type = (documentType || '').toLowerCase();
    switch (type) {
      case 'nda':
      case 'non-disclosure agreement':
      case 'confidentiality agreement':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employment agreement':
      case 'employment':
      case 'employment contract':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'student agreement':
      case 'student':
      case 'student contract':
      case 'occupancy arrangement':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lease agreement':
      case 'rental agreement':
      case 'lease':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'service agreement':
      case 'service contract':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'partnership agreement':
      case 'partnership':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'sales agreement':
      case 'purchase agreement':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Contract Summary</h2>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getDocumentTypeColor(documentType)}`}>
              {documentType}
            </span>
          </div>
        </div>
        {setShowNegotiationSuggestions && (
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={() => setShowNegotiationSuggestions(true)}
          >
            <Lightbulb className="h-4 w-4" />
            Negotiation Suggestions
          </button>
        )}
      </div>

      {/* Document Summary - Full Width, First */}
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Document Summary</h3>
        </div>
        <div className="text-gray-700 text-sm leading-relaxed">
          {overallSummary ? (
            overallSummary
          ) : (
            <span className="text-gray-400">No summary available for this contract.</span>
          )}
        </div>
      </div>

      {/* Three Sections Side by Side - Same Width */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Parties */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Parties</h3>
          </div>
          <ul className="space-y-2">
            {parties && parties.length > 0 ? parties.map((party, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm">{party}</span>
              </li>
            )) : (
              <li className="text-gray-400 text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                Not specified
              </li>
            )}
          </ul>
        </div>

        {/* Important Dates */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Important Dates</h3>
          </div>
          <ul className="space-y-2">
            {importantDates && Object.keys(importantDates).length > 0 ? (
              Object.entries(importantDates).map(([key, value], i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>: {value}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-400 text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                Not specified
              </li>
            )}
          </ul>
        </div>

        {/* Payment Terms */}
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Payment Terms</h3>
          </div>
          <div className="text-gray-700 text-sm">
            {paymentTerms ? (
              <div className="space-y-2">
                {paymentTerms.split(' || ').map((term, index) => {
                  // Check if the term has a heading:description format
                  const colonIndex = term.indexOf(':');
                  if (colonIndex !== -1) {
                    const heading = term.substring(0, colonIndex).trim();
                    const description = term.substring(colonIndex + 1).trim();
                    return (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">
                          <span className="font-semibold text-gray-900">{heading}:</span>{' '}
                          <span className="text-gray-700">{description}</span>
                        </span>
                      </div>
                    );
                  } else {
                    // Fallback for terms without heading:description format
                    return (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">{term}</span>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <span>Not specified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Missing Fields - Full Width, Same as Important Clauses */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-amber-800">Missing Fields</h3>
        </div>
        {Array.isArray(summary.missingOrAmbiguousTerms) && summary.missingOrAmbiguousTerms.length > 0 ? (
          <ul className="space-y-2">
            {summary.missingOrAmbiguousTerms.map((term, idx) => {
              const colonIndex = term.indexOf(':');
              if (colonIndex !== -1) {
                const heading = term.substring(0, colonIndex).trim();
                const description = term.substring(colonIndex + 1).trim();
                return (
                  <li key={idx} className="flex items-start gap-2 text-amber-800 font-medium text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed break-words">
                      <span className="font-semibold text-amber-900">{heading}:</span>{' '}
                      <span className="text-amber-800">{description}</span>
                    </span>
                  </li>
                );
              } else {
                return (
                  <li key={idx} className="flex items-start gap-2 text-amber-800 font-medium text-sm">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="leading-relaxed break-words">{term}</span>
                  </li>
                );
              }
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">All required fields are filled!</span>
          </div>
        )}
      </div>

      {/* Important Clauses Section - Full Width, Last */}
      <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Important Clauses</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {keyTerms && keyTerms.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Key Terms
              </h4>
              <ul className="space-y-2">
                {keyTerms.map((term, i) => {
                  const colonIndex = term.indexOf(':');
                  if (colonIndex !== -1) {
                    const heading = term.substring(0, colonIndex).trim();
                    const description = term.substring(colonIndex + 1).trim();
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">
                          <span className="font-semibold text-gray-900">{heading}:</span>{' '}
                          <span className="text-gray-700">{description}</span>
                        </span>
                      </li>
                    );
                  } else {
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">{term}</span>
                      </li>
                    );
                  }
                })}
              </ul>
            </div>
          )}
          
          {terminationClauses && terminationClauses.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                Termination Clauses
              </h4>
              <ul className="space-y-2">
                {terminationClauses.map((clause, i) => {
                  const colonIndex = clause.indexOf(':');
                  if (colonIndex !== -1) {
                    const heading = clause.substring(0, colonIndex).trim();
                    const description = clause.substring(colonIndex + 1).trim();
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">
                          <span className="font-semibold text-gray-900">{heading}:</span>{' '}
                          <span className="text-gray-700">{description}</span>
                        </span>
                      </li>
                    );
                  } else {
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">{clause}</span>
                      </li>
                    );
                  }
                })}
              </ul>
            </div>
          )}
          
          {concerningPoints && concerningPoints.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Points of Concern
              </h4>
              <ul className="space-y-2">
                {concerningPoints.map((point, i) => {
                  const colonIndex = point.indexOf(':');
                  if (colonIndex !== -1) {
                    const heading = point.substring(0, colonIndex).trim();
                    const description = point.substring(colonIndex + 1).trim();
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">
                          <span className="font-semibold text-gray-900">{heading}:</span>{' '}
                          <span className="text-gray-700">{description}</span>
                        </span>
                      </li>
                    );
                  } else {
                    return (
                      <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">{point}</span>
                      </li>
                    );
                  }
                })}
              </ul>
            </div>
          )}
        </div>
        
        {(!keyTerms || keyTerms.length === 0) && (!terminationClauses || terminationClauses.length === 0) && (!concerningPoints || concerningPoints.length === 0) && (
          <div className="text-center py-8 text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No important clauses found for this contract.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractSummary;