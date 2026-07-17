import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContractsAnalyzed } from '@/features/dashboard/hooks/useContractsAnalyzed';
import { useAnalyzeDocument } from '@/features/analyze/hooks/useAnalyzeDocument';
import { AnalyzerView } from '@/features/analyze/components/AnalyzerView';

const AnalyzerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: contractsAnalyzed = 0 } = useContractsAnalyzed(user?.id);
  const analyzeMutation = useAnalyzeDocument(user?.id);

  const remainingAnalyses = user ? Math.max(0, user.maxContracts - contractsAnalyzed) : 0;

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    if (user.plan === 'free' && contractsAnalyzed >= user.maxContracts) {
      setError('You have reached the maximum number of uploads for the free plan.');
      return;
    }

    setUploadedFile(file);
    setError(null);

    try {
      const result = await analyzeMutation.mutateAsync(file);
      navigate(`/results/${result.id}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Analysis failed. Please try again or contact support.');
      setUploadedFile(null);
    }
  };

  return (
    <AnalyzerView
      userPlan={user?.plan}
      remainingAnalyses={remainingAnalyses}
      maxContracts={user?.maxContracts ?? 0}
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
