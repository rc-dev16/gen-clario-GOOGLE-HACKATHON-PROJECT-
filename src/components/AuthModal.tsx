import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Scale, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, register, loading, user, googleSignIn, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/analyzer');
    }
  }, [user]);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  }, [initialMode]);

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Please enter your name.');
          return;
        }
        await register(email, password, name);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Authentication failed. Please try again.';
      // Make Firebase error messages more user-friendly
      if (errorMessage.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (errorMessage.includes('auth/wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (errorMessage.includes('auth/user-not-found')) {
        setError('No account found with this email.');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        setError('An account already exists with this email.');
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Animated Floating Background Elements - match LandingPage2 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gray-800/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gray-700/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
      <div className={`relative z-10 w-full max-w-md mx-auto min-h-[440px] flex flex-col items-center justify-center transition-all duration-700 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>        
        {/* Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 w-full px-8 py-10 flex flex-col items-center animate-fade-in-glass">
          {/* Branding */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-2">
              <div className="absolute inset-0 bg-gray-900 rounded-full blur opacity-70 animate-pulse-glow" />
              <div className="relative p-3 bg-gray-900 rounded-full">
                <Scale className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight drop-shadow-lg">
              {mode === 'login' ? 'Sign In to Clario' : 'Create Your Account'}
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              {mode === 'login'
                ? 'Access your dashboard and analyze contracts.'
                : 'Sign up to get started with Clario.'}
            </p>
          </div>
          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6 flex-1 flex flex-col justify-center animate-fade-in delay-200">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center animate-shake">
                {error}
              </div>
            )}
            {mode === 'register' && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 shadow-inner transition-all duration-200 focus:shadow-lg focus:bg-white/90"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            )}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 shadow-inner transition-all duration-200 focus:shadow-lg focus:bg-white/90"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 shadow-inner transition-all duration-200 focus:shadow-lg focus:bg-white/90"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {/* Forgot password link */}
              {mode === 'login' && !showForgot && (
                <div className="text-right mt-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 transition-colors"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotEmail(email);
                      setForgotMessage('');
                      setForgotError('');
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
            {/* Forgot password form */}
            {showForgot && (
              <div className="w-full mt-4 animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter your email to reset password</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 shadow-inner transition-all duration-200 focus:shadow-lg focus:bg-white/90 mb-2"
                  placeholder="Enter your email"
                  required
                />
                {forgotMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center mb-2 animate-fade-in">
                    {forgotMessage}
                  </div>
                )}
                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center mb-2 animate-shake">
                    {forgotError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 bg-gray-900 text-white py-2 rounded-xl hover:bg-gray-700 transition-all duration-200 font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !forgotEmail}
                    onClick={async () => {
                      setForgotMessage('');
                      setForgotError('');
                      try {
                        await forgotPassword(forgotEmail);
                        setForgotMessage('Password reset email sent!');
                      } catch (err: any) {
                        setForgotError(err?.message || 'Failed to send reset email.');
                      }
                    }}
                  >
                    {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span> : 'Send Reset Email'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold shadow"
                    onClick={() => setShowForgot(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                  </div>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </span>
              <span className="absolute inset-0 bg-gray-900 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl" />
            </button>
          </form>
          {/* Divider and Google Sign In */}
          <div className="w-full flex items-center my-6">
            <div className="flex-grow h-px bg-gray-200" />
            <span className="mx-4 text-gray-400 font-medium">or</span>
            <div className="flex-grow h-px bg-gray-200" />
          </div>
          {googleError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center animate-shake mb-4">
              {googleError}
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              setGoogleError('');
              try {
                await googleSignIn();
              } catch (err: any) {
                setGoogleError(err?.message || 'Google sign-in failed.');
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-700 shadow group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></span>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_17_40)">
                    <path d="M47.5 24.5C47.5 22.6 47.3 20.8 46.9 19H24V29.1H37.1C36.5 32.1 34.5 34.6 31.7 36.2V42H39.3C44 38 47.5 32 47.5 24.5Z" fill="#4285F4"/>
                    <path d="M24 48C30.6 48 36.2 45.8 39.3 42L31.7 36.2C30 37.3 27.7 38.1 24 38.1C17.7 38.1 12.2 34.1 10.3 28.7H2.5V34.1C5.6 40.3 14.1 48 24 48Z" fill="#34A853"/>
                    <path d="M10.3 28.7C9.7 26.7 9.7 24.7 10.3 22.7V17.3H2.5C0.5 21.1 0.5 26.9 2.5 34.1L10.3 28.7Z" fill="#FBBC05"/>
                    <path d="M24 9.9C27.7 9.9 30.6 11.2 32.5 13L39.4 6.1C36.2 3.1 30.6 0 24 0C14.1 0 5.6 7.7 2.5 17.3L10.3 22.7C12.2 17.3 17.7 9.9 24 9.9Z" fill="#EA4335"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_17_40">
                      <rect width="48" height="48" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          {/* End Google Sign In */}
          <div className="w-full mt-6 text-center text-sm text-gray-600 animate-fade-in delay-300">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="ml-1 text-gray-900 hover:text-gray-700 font-bold transition-colors duration-200 underline underline-offset-2"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
        {/* Powered by Firebase */}
        <div className="mt-6 text-center w-full">
          <span className="text-xs text-gray-400">Powered by <span className="font-semibold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Firebase</span></span>
        </div>
      </div>
      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 7s ease-in-out infinite; }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 1s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes fade-in-glass {
          0% { opacity: 0; filter: blur(12px); }
          100% { opacity: 1; filter: blur(0); }
        }
        .animate-fade-in-glass { animation: fade-in-glass 1.2s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 0 0 rgba(17,24,39,0.5); }
          50% { opacity: 1; box-shadow: 0 0 24px 8px rgba(17,24,39,0.25); }
        }
        .animate-pulse-glow { animation: pulse-glow 2.5s infinite; }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 1.2s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s; }
      `}</style>
    </div>
  );
};

export default AuthModal;