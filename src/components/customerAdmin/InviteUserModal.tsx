import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose }) => {
  const { sendInvitation, currentUser } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Cashier' | 'Accountant'>('Cashier');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [result, setResult] = useState<{
    inviteUrl?: string;
    emailSent?: boolean;
    requiresSetup?: boolean;
    message?: string;
  } | null>(null);

  const handleReset = () => {
    setName('');
    setEmail('');
    setRole('Cashier');
    setIsSubmitting(false);
    setResult(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);

    const res = await sendInvitation(name.trim(), email.trim(), role);

    setIsSubmitting(false);

    if (res.success) {
      if (res.inviteUrl) {
        setResult({
          inviteUrl: res.inviteUrl,
          emailSent: res.emailStatus?.sent,
          requiresSetup: res.emailStatus?.requiresSetup,
          message: res.emailStatus?.message || res.message,
        });
      } else {
        handleClose();
      }
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? 'Invitation Dispatched' : 'Invite New Staff Member'}
      subtitle={
        result
          ? `Onboarding details for ${email}`
          : `Send a secure setup token to onboard an employee to ${currentUser?.companyName || 'your Mandi business'}`
      }
      maxWidth="md"
    >
      {result ? (
        <div className="space-y-4 py-1">
          {/* Email Delivery Feedback */}
          {result.emailSent ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Invitation Email Delivered</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                An invitation email was sent to <strong className="text-emerald-900">{email}</strong> via SMTP with role <strong className="text-emerald-900">{role}</strong>.
              </p>
            </div>
          ) : result.requiresSetup ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>SMTP Setup Required</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                SMTP credentials are not active. Copy and share the direct activation link below:
              </p>
            </div>
          ) : null}

          {/* Direct 7-Day Link Box */}
          {result.inviteUrl && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Direct Setup Link (7-Day Token)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.inviteUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 select-all focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCopyLink(result.inviteUrl!)}
                  icon={copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </Button>
                <a
                  href={result.inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border border-slate-300 hover:border-emerald-500 rounded-lg text-slate-600 hover:text-emerald-700 bg-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Employee Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asif Nadeem"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@mandi.pk"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              The employee will receive an official email invitation to set up their password.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Mandi Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                <option value="Cashier">Cashier (Boli billing, daily cash entry, receipt print)</option>
                <option value="Manager">Manager (Supervise auction lots, pricing, staff)</option>
                <option value="Accountant">Accountant (Ledgers, roznamcha, balance reconciliation)</option>
                <option value="Admin">Admin (Shop operations &amp; terminal management)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isSubmitting}
              icon={<Send className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
