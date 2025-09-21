import React, { useState } from 'react';
import DocumentAIService from '../services/documentAIService';

const DocumentAITest: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const documentService = new DocumentAIService();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const analysisResult = await documentService.analyzeDocument(file);
      setResult(analysisResult);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Document AI Test</h1>
      
      {/* File Upload */}
      <div className="mb-4">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          className="mb-2"
        />
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {loading ? 'Analyzing...' : 'Analyze Document'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Analysis Results</h2>
          <div className="space-y-2">
            <p><strong>Pages:</strong> {result.pages}</p>
            <p><strong>MIME Type:</strong> {result.mimeType}</p>
            
            {/* Text Content */}
            <div className="mt-4">
              <h3 className="font-semibold">Extracted Text:</h3>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-auto max-h-40">
                {result.text}
              </pre>
            </div>

            {/* Entities */}
            {result.entities.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Entities:</h3>
                <ul className="list-disc pl-5 mt-1">
                  {result.entities.map((entity: any, index: number) => (
                    <li key={index}>
                      {entity.type}: {entity.content} (Confidence: {Math.round(entity.confidence * 100)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tables */}
            {result.tables.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Tables:</h3>
                {result.tables.map((table: any, tableIndex: number) => (
                  <div key={tableIndex} className="mt-2 border rounded">
                    <div className="bg-gray-100 p-2">
                      <strong>Headers:</strong> {table.headerRows.join(', ')}
                    </div>
                    <div className="p-2">
                      {table.bodyRows.map((row: string[], rowIndex: number) => (
                        <div key={rowIndex} className="border-t">
                          {row.join(' | ')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAITest;
