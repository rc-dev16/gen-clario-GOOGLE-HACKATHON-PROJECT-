import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserAnalyses } from '@/features/dashboard/hooks/useUserAnalyses';
import { useUserQuota } from '@/features/dashboard/hooks/useUserQuota';
import { useDeleteAnalysis } from '@/features/dashboard/hooks/useDeleteAnalysis';
import { ApiClientError } from '@/lib/apiClient';
import { DashboardView } from '@/features/dashboard/components/DashboardView';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'high-risk' | 'medium-risk' | 'low-risk'
  >('all');
  const { data: analyses = [] } = useUserAnalyses(user?.id);
  const { data: quota } = useUserQuota(user?.id);
  const deleteMutation = useDeleteAnalysis(user?.id);

  const contractsAnalyzed = quota?.contractsAnalyzed ?? 0;
  const maxContracts = quota?.maxContracts ?? user?.maxContracts ?? 5;
  const contracts = user?.plan === 'free' ? analyses.slice(0, maxContracts) : analyses;
  const docsLeft = Math.max(0, maxContracts - contractsAnalyzed);

  const handleDeleteContract = async (contractId: string) => {
    if (!window.confirm('Are you sure you want to delete this contract analysis?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(contractId);
    } catch (error) {
      console.error('Error deleting contract:', error);
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete contract. Please try again.';
      alert(message);
    }
  };

  return (
    <DashboardView
      userName={user?.name}
      docsLeft={docsLeft}
      maxContracts={maxContracts}
      contracts={contracts}
      searchTerm={searchTerm}
      filterStatus={filterStatus}
      onSearchTermChange={setSearchTerm}
      onFilterStatusChange={setFilterStatus}
      onNewAnalysis={() => navigate('/analyzer')}
      onViewContract={(id) => navigate(`/results/${id}`)}
      onDeleteContract={handleDeleteContract}
    />
  );
};

export default DashboardPage;
