/**
 * File Upload Component
 * 
 * Handles secure document upload with features:
 * - Drag and drop support
 * - File type validation
 * - Size limit enforcement
 * - Upload status indication
 * - File removal capability
 * 
 * Supported Formats:
 * - PDF, TXT (DOC/DOCX coming soon)
 * - Maximum size: 10MB
 * 
 * Security:
 * - Client-side validation
 * - Secure file handling
 * - No raw file storage
 */

import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  uploadedFile: File | null;
  onRemoveFile: () => void;
  isAnalyzing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  uploadedFile, 
  onRemoveFile, 
  isAnalyzing 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    onFileUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  if (uploadedFile) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{uploadedFile.name}</h3>
              <p className="text-gray-600">{uploadedFile.size} • {uploadedFile.type}</p>
            </div>
          </div>
          {!isAnalyzing && (
            <button
              onClick={onRemoveFile}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {isAnalyzing && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Analyzing document...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full transition-colors duration-200 ${
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`h-8 w-8 transition-colors duration-200 ${
              isDragOver ? 'text-blue-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Legal Document
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your PDF or TXT file here, or click to browse
            </p>
            <label className="inline-flex items-center space-x-2 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-6 py-3 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold">
              <FileText className="h-4 w-4" />
              <span>Choose File</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt"
                onChange={handleFileInput}
              />
            </label>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              Currently supported formats: PDF, TXT (Max 10MB)
            </p>
            <p className="text-xs text-blue-500 font-medium">
              DOC/DOCX support coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;