import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../config/api';
import { Business } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../common/Modal';
import { BusinessDetailModal } from './BusinessDetailModal';
import { 
  Plus, 
  Eye, 
  CheckCircle, 
  Slash, 
  Filter, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface BusinessesTabProps {
  onOpenAddBusiness: () => void;
}

export const BusinessesTab: React.FC<BusinessesTabProps> = ({ onOpenAddBusiness }) => {
  const { businesses, toggleBusinessStatus, deleteBusiness, sendBusinessInvitation, refreshBusinesses } = useApp();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected for Details / Modal
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Selected for Suspend / Activate confirmation
  const [businessToToggle, setBusinessToToggle] = useState<Business | null>(null);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);

  // Selected for Send Invitation action modal
  const [inviteModalBiz, setInviteModalBiz] = useState<Business | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState<boolean>(true);
  const [lastInviteResult, setLastInviteResult] = useState<{
    inviteUrl?: string;
    emailSent?: boolean;
    requiresSetup?: boolean;
    message?: string;
  } | null>(null);

  // Check live server SMTP status
  const checkSmtpStatus = async () => {
    try {
      const res = await apiFetch('/api/invitations/smtp-status');
      if (res.ok) {
        const data = await res.json();
        setIsSmtpConfigured(Boolean(data.configured));
      }
    } catch {
      // Default to true or fallback
    }
  };

  useEffect(() => {
    checkSmtpStatus();
  }, []);

  // Filter list
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      (b.mandiLocation && b.mandiLocation.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesCity = cityFilter === 'ALL' || b.city === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  const paginatedBusinesses = filteredBusinesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const cities = Array.from(new Set(businesses.map((b) => b.city)));

  const handleOpenDetail = (biz: Business) => {
    setSelectedBusiness(biz);
    setIsDetailOpen(true);
  };

  const handleConfirmToggle = () => {
    if (businessToToggle) {
      toggleBusinessStatus(businessToToggle.id);
      setBusinessToToggle(null);
    }
  };

  const handleOpenInviteModal = async (biz: Business) => {
    await checkSmtpStatus();
    setInviteModalBiz(biz);
    setCopiedLink(false);

    if (biz.inviteToken) {
      setLastInviteResult({
        inviteUrl: `${window.location.origin}/?token=${biz.inviteToken}`,
        emailSent: Boolean(biz.inviteEmailSent),
        requiresSetup: !isSmtpConfigured && !biz.inviteEmailSent,
        message: biz.inviteEmailError,
      });
    } else {
      setLastInviteResult(null);
    }
  };

  const handleTriggerSendInvite = async () => {
    if (!inviteModalBiz) return;
    setIsSendingInvite(true);
    const res = await sendBusinessInvitation(
      inviteModalBiz.id,
      inviteModalBiz.email,
      inviteModalBiz.ownerName
    );
    setIsSendingInvite(false);

    if (res.success) {
      const isSent = Boolean(res.emailStatus?.sent);
      setLastInviteResult({
        inviteUrl: res.inviteUrl,
        emailSent: isSent,
        requiresSetup: Boolean(res.emailStatus?.requiresSetup),
        message: res.emailStatus?.message || res.message,
      });
      // Refresh local businesses list to reflect new status
      await refreshBusinesses();
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Business Directory &amp; Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage registered Mandi commission agents, owner accounts, and invitations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => refreshBusinesses()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onOpenAddBusiness}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            Add New Business
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search business, owner, city or mandi..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending Setup">Pending Setup</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(search || statusFilter !== 'ALL' || cityFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCityFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Business &amp; Mandi</th>
                <th className="px-4 py-3.5">Owner &amp; Contacts</th>
                <th className="px-4 py-3.5">Registered Date</th>
                <th className="px-4 py-3.5">Account &amp; Invitation</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                    No Mandi businesses match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {b.mandiLocation || `${b.city} Mandi`},{' '}
                        <span className="font-semibold text-slate-700">{b.city}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-800">{b.ownerName}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{b.email}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{b.phone}</div>
                    </td>

                    <td className="px-4 py-4 text-slate-600 font-medium">
                      {b.registrationDate}
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <Badge
                          variant={
                            b.status === 'Active' ? 'green' :
                            b.status === 'Suspended' ? 'red' : 'yellow'
                          }
                        >
                          {b.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              b.inviteStatus === 'Accepted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : b.inviteStatus === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : b.inviteStatus === 'Expired'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {b.inviteStatus ? `Invite ${b.inviteStatus}` : 'Not Invited'}
                          </span>
                          {b.inviteEmailSent && (
                            <span className="text-[10px] text-emerald-700 font-medium" title="Email dispatched to owner">
                              ✉ Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send / Manage Invitation Action */}
                        <button
                          onClick={() => handleOpenInviteModal(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={b.inviteEmailSent ? 'View / Resend Invitation' : 'Send Invitation Email'}
                        >
                          <Mail className="w-4 h-4 text-emerald-700" />
                        </button>

                        {/* View Details Action */}
                        <button
                          onClick={() => handleOpenDetail(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Suspend / Activate Action */}
                        <button
                          onClick={() => setBusinessToToggle(b)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            b.status === 'Active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={b.status === 'Active' ? 'Suspend Business' : 'Activate Business'}
                        >
                          {b.status === 'Active' ? (
                            <Slash className="w-4 h-4 text-rose-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        {/* Delete Business Action */}
                        <button
                          onClick={() => setBusinessToDelete(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Business"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredBusinesses.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredBusinesses.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Detail / Edit Modal */}
      <BusinessDetailModal
        business={selectedBusiness}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Send Invitation Modal */}
      {inviteModalBiz && (
        <Modal
          isOpen={inviteModalBiz !== null}
          onClose={() => setInviteModalBiz(null)}
          title="Customer Admin Invitation"
          subtitle={`Send or manage setup invite for ${inviteModalBiz.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Business & Owner Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600">Business:</span>
                <span className="font-bold text-slate-900">{inviteModalBiz.name}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600">Owner Name:</span>
                <span className="text-slate-800">{inviteModalBiz.ownerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Recipient Email:</span>
                <span className="font-mono text-emerald-800 font-bold">{inviteModalBiz.email}</span>
              </div>
            </div>

            {/* Email Delivery Status Card */}
            {lastInviteResult?.emailSent ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Invitation Email Successfully Delivered</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  An activation email with the secure 7-day token was dispatched to <strong className="text-emerald-900">{inviteModalBiz.email}</strong>.
                </p>
              </div>
            ) : isSmtpConfigured ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-emerald-200 text-xs text-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>SMTP Email Service Connected</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Click the button below to dispatch the invitation email directly to <strong className="text-slate-900">{inviteModalBiz.email}</strong> via your configured SMTP server.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>SMTP Setup Required for Automated Email</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  SMTP credentials are not configured in <code className="font-mono bg-amber-100 px-1 rounded">server/.env</code>. Copy and share the direct link below:
                </p>
              </div>
            )}

            {/* Direct 7-Day Invitation Link Box */}
            {lastInviteResult?.inviteUrl && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Direct Invitation Link (7-Day Token)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={lastInviteResult.inviteUrl}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 select-all focus:outline-none"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCopyLink(lastInviteResult.inviteUrl!)}
                    icon={copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                  <a
                    href={lastInviteResult.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-slate-300 hover:border-emerald-500 rounded-lg text-slate-600 hover:text-emerald-700 bg-white transition-colors"
                    title="Open invitation in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                loading={isSendingInvite}
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={handleTriggerSendInvite}
              >
                {lastInviteResult?.emailSent ? 'Resend Email Invitation' : 'Send Invitation Email Now'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteModalBiz(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Suspend / Activate */}
      <ConfirmModal
        isOpen={businessToToggle !== null}
        onClose={() => setBusinessToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={businessToToggle?.status === 'Active' ? 'Suspend Business Account?' : 'Reactivate Business Account?'}
        message={
          businessToToggle?.status === 'Active'
            ? `Are you sure you want to suspend "${businessToToggle?.name}"? All POS terminal synchronizations for this account will be paused until reactivated.`
            : `Reactivating "${businessToToggle?.name}" will restore access and permit POS terminals to resume real-time data sync.`
        }
        confirmText={businessToToggle?.status === 'Active' ? 'Suspend Account' : 'Reactivate'}
        variant={businessToToggle?.status === 'Active' ? 'danger' : 'info'}
      />

      {/* Confirmation Modal for Delete Business */}
      <ConfirmModal
        isOpen={businessToDelete !== null}
        onClose={() => setBusinessToDelete(null)}
        onConfirm={async () => {
          if (businessToDelete) {
            await deleteBusiness(businessToDelete.id);
            setBusinessToDelete(null);
          }
        }}
        title="Delete Mandi Business?"
        message={`Are you sure you want to permanently delete "${businessToDelete?.name}"? All associated employee accounts will be unlinked and terminal sync records will be deleted.`}
        confirmText="Delete Business"
        variant="danger"
      />
    </div>
  );
};
