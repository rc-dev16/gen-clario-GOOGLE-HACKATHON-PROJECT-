import React, { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserAnalyses } from '@/features/dashboard/hooks/useUserAnalyses';
import { useContractsAnalyzed } from '@/features/dashboard/hooks/useContractsAnalyzed';
import { useDeleteAnalysis } from '@/features/dashboard/hooks/useDeleteAnalysis';
import { DashboardView } from '@/features/dashboard/components/DashboardView';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'high-risk' | 'medium-risk' | 'low-risk'
  >('all');
  const { data: analyses = [] } = useUserAnalyses(user?.id);
  const { data: contractsAnalyzed = 0 } = useContractsAnalyzed(user?.id);
  const deleteMutation = useDeleteAnalysis(user?.id);

  const contracts = user?.plan === 'free' ? analyses.slice(0, user.maxContracts) : analyses;
  const docsLeft = user ? Math.max(0, user.maxContracts - contractsAnalyzed) : 0;

  const handleDeleteContract = async (contractId: string) => {
    if (!window.confirm('Are you sure you want to delete this contract analysis?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(contractId);
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract. Please try again.');
    }
  };

  return (
    <DashboardView
      userName={user?.name}
      docsLeft={docsLeft}
      maxContracts={user?.maxContracts ?? 0}
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
