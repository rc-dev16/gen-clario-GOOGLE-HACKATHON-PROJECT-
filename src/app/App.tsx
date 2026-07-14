import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './components/LandingPage2';
import AuthModal from './components/AuthModal';
import Analyzer from './components/Analyzer';
import Dashboard from './components/Dashboard';
import AnalysisResultPage from './components/results/ResultPage';
import DocumentAITest from './components/DocumentAITest';

function App() {
  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyzer" element={<Analyzer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/results/:id" element={<AnalysisResultPage />} />
          <Route path="/auth" element={<AuthModal />} />
          <Route path="/test" element={<DocumentAITest />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;