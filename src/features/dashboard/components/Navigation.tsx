import React from 'react';
import { 
  Home, 
  FileText, 
  BarChart3, 
   
  LogOut,
 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

interface NavigationProps {
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onLogout }) => {
  const { user } = useAuth();
 
  const location = useLocation();

  const menuItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Analyze Contract',
      path: '/analyzer'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Analytics',
      path: '/analytics'
    }
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-blue-600">Contract</span>
              <span className="text-xl font-bold text-indigo-600">AI</span>
            </Link>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center space-x-2">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-50 px-3 py-1 rounded-full text-sm font-medium">
                {user?.email && user.email.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
