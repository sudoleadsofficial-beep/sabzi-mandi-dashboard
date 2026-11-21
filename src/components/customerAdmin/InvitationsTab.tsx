import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Invitation } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { InviteUserModal } from './InviteUserModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  MailCheck, 
  Send, 
  RefreshCw, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface InvitationsTabProps {
  onOpenInvite: () => void;
}

export const InvitationsTab: React.FC<InvitationsTabProps> = ({ onOpenInvite }) => {
  const { 
    currentUser, 
    invitations, 
    sendInvitation, 
    cancelInvitation, 
    resendInvitation 
  } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  const myInvitations = invitations.filter((i) => i.businessId === myCompanyId);

  // Inline Quick Send State
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickRole, setQuickRole] = useState<'Admin' | 'Manager' | 'Cashier' | 'Accountant'>('Cashier');

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Cancel Confirmation
  const [invToCancel, setInvToCancel] = useState<Invitation | null>(null);

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickEmail.trim()) return;
    sendInvitation(quickName.trim(), quickEmail.trim(), quickRole);
    setQuickName('');
    setQuickEmail('');
    setQuickRole('Cashier');
  };

  const filteredInvitations = myInvitations.filter((i) => {
    const matchesSearch =
      i.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedInvitations = filteredInvitations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Staff Onboarding Invitations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Send and track secure employee onboarding invitation tokens for your Vegetable POS shop.
        </p>
      </div>

      {/* Quick Invitation Dispatch Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <MailCheck className="w-5 h-5 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">Send New Staff Invitation</h2>
        </div>

        <form onSubmit={handleQuickSend} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Name</label>
            <input
              type="text"
              required
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="e.g. Tariq Mehmood"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={quickEmail}
              onChange={(e) => setQuickEmail(e.target.value)}
              placeholder="staff@mandi.pk"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
            <select
              value={quickRole}
              onChange={(e) => setQuickRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            >
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              icon={<Send className="w-4 h-4" />}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search invitation by name or email..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Employee Name</th>
                <th className="px-4 py-3.5">Email Address</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Invitation Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInvitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No invitations found.
                  </td>
                </tr>
              ) : (
                paginatedInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {inv.employeeName.substring(0, 1)}
                        </div>
                        <span>{inv.employeeName}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-800 font-medium">
                      {inv.email}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {inv.assignedRole}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <div>Sent: {inv.invitationDate}</div>
                      <div className="text-[10px] text-slate-400">Expires: {inv.expiryDate}</div>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          inv.status === 'Accepted' ? 'green' :
                          inv.status === 'Pending' ? 'yellow' : 'red'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {inv.status !== 'Accepted' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resendInvitation(inv.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                            title="Resend Invitation Token"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Resend</span>
                          </button>

                          <button
                            onClick={() => setInvToCancel(inv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Cancel Invitation"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Onboarded</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredInvitations.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredInvitations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={invToCancel !== null}
        onClose={() => setInvToCancel(null)}
        onConfirm={() => {
          if (invToCancel) {
            cancelInvitation(invToCancel.id);
            setInvToCancel(null);
          }
        }}
        title="Cancel Employee Invitation?"
        message={`Are you sure you want to revoke the pending invitation for "${invToCancel?.employeeName}" (${invToCancel?.email})? The invite link will become invalid.`}
        confirmText="Revoke Invite"
        variant="danger"
      />
    </div>
  );
};
