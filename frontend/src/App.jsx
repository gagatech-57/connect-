import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { Loader2, MessageSquareCode } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const [page, setPage] = useState('login'); // 'login', 'register', 'verify-email', 'forgot-password', 'reset-password'
  const [verificationEmail, setVerificationEmail] = useState('');

  // Run Auth Check on boot
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load and apply Dark Mode theme settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  // Show premium loading splash screen while checking session validity
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-white transition-colors duration-300">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/25 mb-4">
            <MessageSquareCode className="w-9 h-9 text-white animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Gaga Connect</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Initializing workspace...</p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-brand-500 mt-8" />
      </div>
    );
  }

  // If session is active, load workspace
  if (isAuthenticated) {
    return <Dashboard />;
  }

  // Otherwise, render requested public screen
  switch (page) {
    case 'register':
      return <Register setPage={setPage} setVerificationEmail={setVerificationEmail} />;
    case 'verify-email':
      return <VerifyEmail setPage={setPage} email={verificationEmail} />;
    case 'forgot-password':
      return <ForgotPassword setPage={setPage} setVerificationEmail={setVerificationEmail} />;
    case 'reset-password':
      return <ResetPassword setPage={setPage} email={verificationEmail} />;
    case 'login':
    default:
      return <Login setPage={setPage} setVerificationEmail={setVerificationEmail} />;
  }
}
