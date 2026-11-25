import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../config/api';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../common/Button';
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  User, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Clock,
  Monitor,
  Sparkles,
  KeyRound
} from 'lucide-react';

interface AcceptInvitationPageProps {
  token: string;
  onClearToken: () => void;
}

interface InvitationData {
  id: string;
  businessId: string;
  businessName: string;
  businessCity: string;
  mandiLocation?: string;
  email: string;
  name: string;
  role: string;
  isEmployee?: boolean;
  expiresAt: string;
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({ token, onClearToken }) => {
  const { loginAs } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  // Employee-specific state
  const [isEmployeeAccepted, setIsEmployeeAccepted] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);

  // Customer Admin owner password form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activatedUser, setActivatedUser] = useState<any>(null);

  // Verify and process token on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyAndProcess() {
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const res = await apiFetch(`/api/invitations/verify?token=${encodeURIComponent(token.trim())}`);
        let data: any;
        try {
          data = await res.json();
        } catch {
          if (!isMounted) return;
          setErrorStatus('server_error');
          if (res.status === 404) {
            setErrorMessage('Verification endpoint not found (HTTP 404). Please verify backend routes.');
          } else if (res.status === 502 || res.status === 503 || res.status === 504) {
            setErrorMessage(`Backend service unavailable (HTTP ${res.status}). The server may be restarting.`);
          } else {
            setErrorMessage(`Authentication server returned an invalid response (HTTP ${res.status}).`);
          }
          return;
        }

        if (!isMounted) return;

        // Check if token was already accepted as an employee
        if (data.status === 'already_accepted' && data.isEmployee) {
          setIsEmployeeAccepted(true);
          setEmployeeDetails({
            name: data.name,
            email: data.email,
            role: data.role,
            businessName: data.businessName,
          });
          setIsLoading(false);
          return;
        }

        if (res.ok && data.valid && data.invitation) {
          setInvitation(data.invitation);

          // If this is an employee invitation, automatically accept it without password creation on web
          if (data.invitation.isEmployee) {
            try {
              const acceptRes = await apiFetch('/api/invitations/accept-employee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token.trim() }),
              });
              let acceptData: any;
              try {
                acceptData = await acceptRes.json();
              } catch {
                if (!isMounted) return;
                setErrorStatus('server_error');
                setErrorMessage(`Server error (${acceptRes.status}) while accepting employee invitation.`);
                return;
              }

              if (!isMounted) return;

              if (acceptRes.ok && acceptData.success) {
                setIsEmployeeAccepted(true);
                setEmployeeDetails(acceptData.employee || data.invitation);
              } else {
                setErrorStatus('acceptance_failed');
                setErrorMessage(acceptData?.message || 'Unable to accept employee invitation.');
              }
            } catch (acceptErr) {
              if (!isMounted) return;
              setErrorStatus('network_error');
              setErrorMessage('Failed to connect to backend server or request was blocked by CORS.');
            }
          }
        } else {
          setErrorStatus(data.status || 'invalid');
          setErrorMessage(data.message || 'The invitation link is invalid or has expired.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorStatus('network_error');
        setErrorMessage('Unable to connect to the authentication server. Please verify internet connectivity or CORS settings.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verifyAndProcess();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Customer Admin password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          password: password.trim(),
        }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        setFormError(
          res.status >= 500
            ? `Backend service error (HTTP ${res.status}). Please try again shortly.`
            : `Unexpected response format (HTTP ${res.status}).`
        );
        setIsSubmitting(false);
        return;
      }

      if (res.ok && data.success) {
        setIsSuccess(true);
        setActivatedUser({
          ...data.user,
          token: data.token,
        });
      } else {
        setFormError(data.message || 'Failed to activate account. The invitation may have expired.');
      }
    } catch (err: any) {
      setFormError('Network failure or request blocked. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterDashboard = () => {
    onClearToken();
    if (invitation && activatedUser) {
      const isSuper = activatedUser.role === 'SUPER_ADMIN';
      const roleToLogin = isSuper ? 'SUPER_ADMIN' : (activatedUser.role || 'CUSTOMER_ADMIN');
      loginAs(roleToLogin, activatedUser.email, true, {
        id: activatedUser.id,
        name: activatedUser.name || invitation.name,
        email: activatedUser.email,
        companyId: activatedUser.businessId || invitation.businessId,
        companyName: activatedUser.businessName || invitation.businessName,
        token: activatedUser.token,
      }, activatedUser.token);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-emerald-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <BrandLogo size="lg" />
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/90">
          
          {/* State 1: Loading Token Verification */}
          {isLoading && (
            <div className="py-12 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Verifying Security Token</h3>
              <p className="text-xs text-slate-500">Connecting to PostgreSQL database to validate invitation credentials...</p>
            </div>
          )}

          {/* State 2: Token Invalid / Expired / Revoked */}
          {!isLoading && errorStatus && !isEmployeeAccepted && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {errorStatus === 'accepted' || errorStatus === 'already_accepted' ? 'Invitation Already Processed' :
                   errorStatus === 'expired' ? 'Invitation Expired' :
                   errorStatus === 'cancelled' ? 'Invitation Revoked' :
                   'Invalid Invitation Link'}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
                  {errorMessage}
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    onClearToken();
                    window.location.href = '/';
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Return to Main Screen
                </Button>
              </div>
            </div>
          )}

          {/* State 3: Employee Acceptance Confirmation Screen (POS-Only Activation) */}
          {!isLoading && isEmployeeAccepted && (
            <div className="py-4 text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Invitation Accepted</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Your invitation has been accepted.
                </h2>
                <p className="text-sm text-slate-600 mt-2.5 leading-relaxed font-medium">
                  Now open the <strong className="text-emerald-700">Vegetable POS application</strong> installed on your computer, enter your invited email address, and create your password to activate your account.
                </p>
              </div>

              {/* Employee & Mandi Identity Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">{employeeDetails?.businessName || invitation?.businessName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    Role: {employeeDetails?.role || invitation?.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Invited Staff:</span>
                    <span className="font-semibold text-slate-800">{employeeDetails?.name || invitation?.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Invited Email:</span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">{employeeDetails?.email || invitation?.email}</span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step POS Activation Guide */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-left space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <Monitor className="w-4 h-4 text-emerald-700" />
                  <span>Next Steps on Installed Windows POS</span>
                </div>

                <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                  <li>
                    Launch the <strong>Vegetable POS</strong> desktop application on your station.
                  </li>
                  <li>
                    Enter your invited email: <strong className="font-mono text-emerald-800">{employeeDetails?.email || invitation?.email}</strong>.
                  </li>
                  <li>
                    The POS will recognize your accepted invitation and prompt you to <strong>create your password</strong>.
                  </li>
                  <li>
                    Enter your secure password to immediately activate terminal billing access.
                  </li>
                </ol>
              </div>

              {/* Clear Dashboard Exclusion Notice */}
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-500 text-center leading-normal">
                <span className="font-semibold text-slate-700">Notice:</span> Employees authenticate and operate exclusively through the installed Windows POS application. No web dashboard login is required or permitted.
              </div>
            </div>
          )}

          {/* State 4: Customer Admin Owner Success State */}
          {!isLoading && isSuccess && !isEmployeeAccepted && (
            <div className="py-6 text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Account Activated Successfully!
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Your password has been set. You now have full Customer Admin access to manage{' '}
                  <strong className="text-slate-900">{invitation?.businessName}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
                <div className="text-slate-500">Login Email:</div>
                <div className="font-mono font-bold text-slate-900">{invitation?.email}</div>
                <div className="text-slate-500 pt-1">Assigned Role:</div>
                <div className="font-semibold text-emerald-800">Customer Admin (Full Business Control)</div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-bold shadow-md shadow-emerald-900/10"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleEnterDashboard}
                >
                  Open Customer Admin Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* State 5: Customer Admin Owner Setup Password Form */}
          {!isLoading && !errorStatus && !isSuccess && !isEmployeeAccepted && invitation && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Customer Admin Invitation</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Activate Business Admin Portal
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create a secure password to access your Vegetable POS Mandi portal.
                </p>
              </div>

              {/* Business & Owner Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-slate-900 text-sm">{invitation.businessName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{invitation.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{invitation.email}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Mandi: <strong>{invitation.mandiLocation || invitation.businessCity}</strong></span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <Clock className="w-3 h-3" />
                    <span>Active 7-Day Window</span>
                  </span>
                </div>
              </div>

              {/* Form Error Notice */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Password Setup Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Create Password
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative rounded-lg shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-semibold shadow-md shadow-emerald-900/10"
                    loading={isSubmitting}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Activate Admin Account &amp; Complete Setup
                  </Button>
                </div>
              </form>

              <p className="text-center text-[11px] text-slate-400">
                By activating your account, you agree to access terms for SudoLeads Vegetable POS Cloud Sync.
              </p>
            </div>
          )}

        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              onClearToken();
              window.location.href = '/';
            }}
            className="text-xs text-slate-500 hover:text-emerald-700 font-medium cursor-pointer"
          >
            &larr; Return to Sign In Screen
          </button>
        </div>
      </div>
    </div>
  );
};
