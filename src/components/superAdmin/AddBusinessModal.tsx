import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  User, 
  Mail, 
  Check, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBusinessModal: React.FC<AddBusinessModalProps> = ({ isOpen, onClose }) => {
  const { addBusiness } = useApp();

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+92 3');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [sendInvitation, setSendInvitation] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationResult, setCreationResult] = useState<{
    businessName: string;
    email: string;
    inviteUrl?: string;
    emailSent?: boolean;
    requiresSetup?: boolean;
    setupMessage?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const mandiCities = [
    'Lahore',
    'Karachi',
    'Islamabad',
    'Rawalpindi',
    'Multan',
    'Faisalabad',
    'Sargodha',
    'Gujranwala',
    'Peshawar',
    'Quetta',
  ];

  const handleReset = () => {
    setName('');
    setOwnerName('');
    setEmail('');
    setPhone('+92 3');
    setCity('Lahore');
    setAddress('');
    setSendInvitation(true);
    setCreationResult(null);
    setCopied(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim() || !email.trim()) return;

    setIsSubmitting(true);

    const result = await addBusiness({
      name: name.trim(),
      ownerName: ownerName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      city: city.trim(),
      mandiLocation: `${city.trim()} Wholesale Mandi`,
      address: address.trim() || `Shop/Platform Yard, ${city.trim()} Mandi`,
      registrationDate: new Date().toISOString().substring(0, 10),
      subscriptionPlan: 'Standard Mandi',
      status: 'Active',
      maxDevices: 5,
      monthlyFee: 15000,
      sendInvitation,
    });

    setIsSubmitting(false);

    if (result.success) {
      if (result.inviteUrl) {
        // Show result state with invitation link and email setup info
        setCreationResult({
          businessName: name.trim(),
          email: email.trim().toLowerCase(),
          inviteUrl: result.inviteUrl,
          emailSent: result.emailStatus?.sent,
          requiresSetup: result.emailStatus?.requiresSetup,
          setupMessage: result.emailStatus?.message,
        });
      } else {
        handleClose();
      }
    }
  };

  const handleCopyLink = () => {
    if (creationResult?.inviteUrl) {
      navigator.clipboard.writeText(creationResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={creationResult ? 'Business Created Successfully' : 'Add New Customer Business'}
      subtitle={
        creationResult
          ? 'Record saved in PostgreSQL database with Customer Admin credentials'
          : 'Register a new Mandi commission merchant and send invitation to owner'
      }
      maxWidth="2xl"
    >
      {creationResult ? (
        <div className="space-y-5 py-2">
          {/* Status Header */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                "{creationResult.businessName}" Registered in PostgreSQL
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Owner: <span className="font-semibold">{creationResult.email}</span>
              </p>
            </div>
          </div>

          {/* Email Delivery Status Card */}
          {creationResult.emailSent ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Invitation Email Dispatched</span>
                <span>An activation email with the secure 7-day token was sent to {creationResult.email}.</span>
              </div>
            </div>
          ) : creationResult.requiresSetup ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Email Delivery Notice: SMTP Setup Required</span>
                  <span>
                    No automated email was sent because SMTP credentials are not configured in your server <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">.env</code> file.
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 pl-6.5">
                To enable automatic email delivery, configure <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SMTP_HOST</code>, <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SMTP_USER</code>, and <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SMTP_PASS</code> in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">server/.env</code>.
              </p>
            </div>
          ) : null}

          {/* Shareable Invitation Link */}
          {creationResult.inviteUrl && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Direct Invitation Link (Valid for 7 Days)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={creationResult.inviteUrl}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyLink}
                  icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <a
                  href={creationResult.inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border border-slate-300 hover:border-emerald-500 rounded-lg text-slate-600 hover:text-emerald-700 bg-white transition-colors"
                  title="Open Invitation Link in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Share this link directly with the business owner so they can set their password and log in to Customer Admin.
              </p>
            </div>
          )}

          {/* Done Button */}
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" onClick={handleClose}>
              Done &bull; Return to Directory
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business Details Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>1. Mandi Business Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Mandi Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kashmir Fruit & Sabzi Agency"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                >
                  {mandiCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Yard / Shop Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop 45, I-11 Fruit Mandi, Islamabad"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Owner Details Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-700" />
              <span>2. Owner / Aarhti Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Chaudhry Bilal"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bilal@kashmirfruit.pk"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 301 9876543"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Invitation Option */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendInvitation}
                onChange={(e) => setSendInvitation(e.target.checked)}
                className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-700"
              />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
                <span>Generate Secure Invitation Token for Owner</span>
              </div>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6.5 leading-relaxed">
              Creates a secure 7-day token. If SMTP is configured in <code className="font-mono bg-slate-200/60 px-1 rounded">server/.env</code>, an invitation email will be sent automatically. If unconfigured, a shareable invitation link will be provided.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              Create Customer Business
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
