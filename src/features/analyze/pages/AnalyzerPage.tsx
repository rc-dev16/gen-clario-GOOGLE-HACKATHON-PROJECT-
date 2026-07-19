import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserQuota } from '@/features/dashboard/hooks/useUserQuota';
import { useAnalyzeDocument } from '@/features/analyze/hooks/useAnalyzeDocument';
import { getAnalysisErrorMessage } from '@/features/analyze/api/analysisApi';
import { AnalyzerView } from '@/features/analyze/components/AnalyzerView';

const AnalyzerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: quota } = useUserQuota(user?.id);
  const analyzeMutation = useAnalyzeDocument(user?.id);

  const contractsAnalyzed = quota?.contractsAnalyzed ?? 0;
  const maxContracts = quota?.maxContracts ?? user?.maxContracts ?? 5;
  const remainingAnalyses = Math.max(0, maxContracts - contractsAnalyzed);

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    if (contractsAnalyzed >= maxContracts) {
      setError('You have reached the maximum number of analyses for your plan.');
      return;
    }

    setUploadedFile(file);
    setError(null);

    try {
      const result = await analyzeMutation.mutateAsync(file);
      navigate(`/results/${result.id}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(getAnalysisErrorMessage(err));
      setUploadedFile(null);
    }
  };

  return (
    <AnalyzerView
      userPlan={user?.plan}
      remainingAnalyses={remainingAnalyses}
      maxContracts={maxContracts}
      uploadedFile={uploadedFile}
      isAnalyzing={analyzeMutation.isPending}
      error={error}
      onFileUpload={handleFileUpload}
      onRemoveFile={() => {
        setUploadedFile(null);
        setError(null);
      }}
    />
  );
};

export default AnalyzerPage;
