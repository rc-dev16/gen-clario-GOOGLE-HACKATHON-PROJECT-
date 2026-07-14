/**
 * Authentication Context Provider
 * 
 * Manages user authentication state and provides authentication-related functionality:
 * - User login/logout
 * - User registration
 * - Google Sign-in
 * - Password reset
 * - User session management
 * 
 * Uses Firebase Authentication for all auth operations and maintains user state
 * across the application.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase-config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;
          
          const userObj: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            plan: isAdmin ? 'enterprise' : 'free',
            contractsAnalyzed: 0,
            maxContracts: isAdmin ? Number.MAX_SAFE_INTEGER : 5,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            subscriptionStatus: isAdmin ? 'active' : 'trial',
            lastAnalysis: null,
            avatar: firebaseUser.photoURL || undefined
          };
          setUser(userObj);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error setting up user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'An error occurred during login. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            errorMessage = 'Invalid email or password';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name and default avatar
      await updateProfile(firebaseUser, { 
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      });

      // Refresh the user's token to get updated profile
      await firebaseUser.reload();
    } catch (error: any) {
      console.error('Registration error:', error);
      // Convert Firebase errors to user-friendly messages
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Registration is currently disabled';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters';
            break;
        }
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Clear all auth-related localStorage items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('chat-history-') || 
            key.startsWith('chat-name-') || 
            key === 'contracts' ||
            key.startsWith('analysis-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear any remaining state
      setUser(null);

      // Force reload the page to clear all component states
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      googleSignIn, 
      forgotPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};