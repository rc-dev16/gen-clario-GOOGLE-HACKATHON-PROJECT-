import { Scale, User, LogOut, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { getContractsAnalyzed } from '../services/analysisService';

// Profile Modal Component
const ProfileModal = ({ user, onClose }: { user: any, onClose: () => void }) => {
  const [contractsAnalyzed, setContractsAnalyzed] = React.useState<number>(user.contractsAnalyzed || 0);
  React.useEffect(() => {
    const fetchCount = async () => {
      if (user) {
        const count = await getContractsAnalyzed(user.id);
        setContractsAnalyzed(count);
      }
    };
    fetchCount();
  }, [user]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm p-0 relative animate-scale-in">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold transition-colors duration-200 hover:rotate-90 transform"
        >
          ×
        </button>
        <div className="p-8 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Profile</h2>
          <p className="text-center text-gray-500 text-sm">Account details and plan information</p>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Name</div>
            <div className="font-semibold text-lg text-gray-900">{user.name}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</div>
            <div className="text-base text-gray-800">{user.email}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Contracts Analyzed</div>
            <div className="text-base text-gray-800 font-semibold">{contractsAnalyzed}</div>
          </div>
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-center mb-2">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                user.plan === 'free' 
                  ? 'bg-gray-100 text-gray-800' 
                  : user.plan === 'pro' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-800 text-white'
              }`}>
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {user.plan === 'free' && 'Basic features and limited analyses'}
              {user.plan === 'pro' && 'Pro features with higher limits and support'}
              {user.plan === 'enterprise' && 'Enterprise features and premium support'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo/Branding */}
          <div 
            className="flex items-center space-x-4 cursor-pointer group" 
            onClick={() => navigate('/')}
          > 
            <div className="relative">
              <div className="absolute inset-0 bg-gray-900 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-3 bg-gray-900 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Scale className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="relative">
              <h1 className="text-4xl font-bold text-gray-900 group-hover:text-gray-700 transition-all duration-300">
                Clario
              </h1>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Account section */}
          <div className="relative flex items-center gap-3">
            {user && location.pathname !== '/dashboard' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="relative group bg-gray-900 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold flex items-center justify-center h-12 w-12 hover:scale-110 hover:bg-gray-800"
                title="Dashboard"
              >
                <LayoutDashboard className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
              </button>
            )}
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="relative group flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-300 h-12 w-12 hover:scale-110"
                  title="Profile"
                >
                  <User className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-scale-in">
                    <button
                      onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                      className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center space-x-3"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="w-full text-left px-6 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center space-x-3"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="relative group bg-gray-900 text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 shimmer-effect"
              >
                <span className="relative z-10">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showProfileModal && user && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  );
};

export default Header;