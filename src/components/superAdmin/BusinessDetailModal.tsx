import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Business } from '../../types';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../config/api';
import { 
  Edit2, 
  Check, 
  Mail, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Send 
} from 'lucide-react';

interface BusinessDetailModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  business,
  isOpen,
  onClose,
}) => {
  const { updateBusiness, toggleBusinessStatus, sendBusinessInvitation } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Invitation action states
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState<boolean>(true);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl?: string;
    emailSent?: boolean;
    requiresSetup?: boolean;
    message?: string;
  } | null>(null);

  // Sync state when modal opens or business changes
  React.useEffect(() => {
    apiFetch('/api/invitations/smtp-status')
      .then((r) => r.json())
      .then((d) => setIsSmtpConfigured(Boolean(d.configured)))
      .catch(() => {});

    if (business) {
      setName(business.name);
      setOwnerName(business.ownerName);
      setPhone(business.phone);
      setAddress(business.address);
      setIsEditing(false);
      setCopied(false);
      setInviteResult(
        business.inviteToken
          ? {
              inviteUrl: `${window.location.origin}/?token=${business.inviteToken}`,
              emailSent: Boolean(business.inviteEmailSent),
              requiresSetup: !isSmtpConfigured && !business.inviteEmailSent,
              message: business.inviteEmailError,
            }
          : null
      );
    }
  }, [business]);

  if (!business) return null;

  const handleSave = async () => {
    await updateBusiness(business.id, {
      name,
      ownerName,
      phone,
      address,
    });
    setIsEditing(false);
  };

  const handleSendInvitation = async () => {
    setIsSendingInvite(true);
    const result = await sendBusinessInvitation(business.id, business.email, business.ownerName);
    setIsSendingInvite(false);

    if (result.success) {
      setInviteResult({
        inviteUrl: result.inviteUrl,
        emailSent: result.emailStatus?.sent,
        requiresSetup: result.emailStatus?.requiresSetup,
        message: result.emailStatus?.message || result.message,
      });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Mandi Business' : business.name}
      subtitle={
        isEditing
          ? 'Update merchant contact details and physical address'
          : `${business.mandiLocation || business.city}, ${business.city}`
      }
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant={business.status === 'Active' ? 'danger' : 'success'}
            size="sm"
            onClick={() => {
              toggleBusinessStatus(business.id);
            }}
          >
            {business.status === 'Active' ? 'Suspend Business' : 'Reactivate Business'}
          </Button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" icon={<Check className="w-4 h-4" />} onClick={handleSave}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setIsEditing(true)}>
                  Edit Details
                </Button>
                <Button variant="primary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mandi Merchant Account
            </span>
            <span className="text-sm font-bold text-slate-900">{business.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <Badge
              variant={
                business.status === 'Active' ? 'green' :
                business.status === 'Suspended' ? 'red' : 'yellow'
              }
            >
              {business.status}
            </Badge>
          </div>
        </div>

        {/* Customer Admin Invitation Section */}
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Admin Invitation
                </h4>
                <p className="text-[11px] text-slate-500">
                  Target Account: <span className="font-semibold text-slate-800">{business.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  business.inviteStatus === 'Accepted' ? 'green' :
                  business.inviteStatus === 'Pending' ? 'yellow' :
                  business.inviteStatus === 'Expired' ? 'red' : 'gray'
                }
              >
                {business.inviteStatus ? `Invite ${business.inviteStatus}` : 'Not Invited'}
              </Badge>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSendInvitation}
                loading={isSendingInvite}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {business.inviteStatus === 'Pending' ? 'Resend Invitation' : 'Send Invitation'}
              </Button>
            </div>
          </div>

          {/* Invitation Link Box & SMTP Status */}
          {inviteResult?.inviteUrl && (
            <div className="pt-2 border-t border-emerald-100 space-y-2">
              {inviteResult.emailSent ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Invitation email delivered successfully to {business.email}.</span>
                </div>
              ) : isSmtpConfigured ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>SMTP connected. Click <strong>{business.inviteStatus === 'Pending' ? 'Resend Invitation' : 'Send Invitation'}</strong> to email {business.email}.</span>
                </div>
              ) : inviteResult.requiresSetup ? (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Email Delivery: SMTP Setup Required</span>
                    <span className="text-[11px] text-amber-800">
                      Configure SMTP credentials in server/.env to enable automatic emails. Copy the link below to share with the merchant:
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.inviteUrl}
                  className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-slate-700 select-all focus:outline-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(inviteResult.inviteUrl!)}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <a
                  href={inviteResult.inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 border border-emerald-200 hover:border-emerald-500 rounded-lg text-slate-600 hover:text-emerald-700 bg-white transition-colors"
                  title="Open Invitation in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Form or Info View */}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-400 font-medium block mb-1">Owner Name</span>
              <span className="font-semibold text-slate-900 text-sm">{business.ownerName}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-400 font-medium block mb-1">Email Address</span>
              <span className="font-semibold text-slate-900 text-sm">{business.email}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-400 font-medium block mb-1">Phone Contact</span>
              <span className="font-semibold text-slate-900 text-sm">{business.phone}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-400 font-medium block mb-1">Registered Since</span>
              <span className="font-semibold text-slate-900 text-sm">{business.registrationDate}</span>
            </div>
            <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-100 bg-white">
              <span className="text-slate-400 font-medium block mb-1">Address / Mandi Shed</span>
              <span className="font-semibold text-slate-900 text-sm">{business.address}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
