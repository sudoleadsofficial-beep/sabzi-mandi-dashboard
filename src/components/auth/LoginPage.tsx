import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../common/Button';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Store, 
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAs } = useApp();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core authentication executor calling backend API
  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const cleanEmail = targetEmail.trim().toLowerCase();
    const cleanPassword = targetPass.trim();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword, rememberMe }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        setErrorMessage('Server error: invalid response received from backend.');
        setIsSubmitting(false);
        return;
      }

      if (response.ok && data.success && data.user) {
        loginAs(data.user.role, cleanEmail, rememberMe, {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          companyId: data.user.businessId,
          companyName: data.user.businessName,
          token: data.token,
        }, data.token);
        setIsSubmitting(false);
        return;
      } else {
        setErrorMessage(data.message || 'Invalid email or password.');
        setIsSubmitting(false);
        return;
      }
    } catch (err: any) {
      console.error('[Login Error]:', err);
      setErrorMessage('Unable to connect to the backend server. Please verify backend is running on port 5000.');
      setIsSubmitting(false);
    }
  };

  // Validate and handle login form submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative subtle grid / glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <BrandLogo size="lg" />
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to Admin Portal
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          Centralized management for Vegetable POS Mandi installations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        {/* Main Card */}
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/90">
          
          {/* Error Alert Message */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block">Authentication Failed</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-colors"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 border-slate-300 rounded focus:ring-emerald-500 accent-emerald-700"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me on this browser</span>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-semibold shadow-md shadow-emerald-900/10"
                icon={<ArrowRight className="w-4 h-4" />}
                loading={isSubmitting}
              >
                Sign In
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Notice */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Vegetable POS Cloud Sync Architecture &bull; Designed &amp; Maintained by SudoLeads Pakistan
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              To reset your credentials or recover access, please contact your platform administrator or shop manager.
            </p>
            <div className="mt-5">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setShowForgotModal(false)}
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
