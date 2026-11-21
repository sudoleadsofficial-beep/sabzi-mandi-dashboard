import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, Invitation } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  Users, 
  UserPlus, 
  Filter, 
  Edit3, 
  UserCheck, 
  UserX, 
  Eye, 
  Check, 
  ShieldCheck,
  MailCheck,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Send,
  Trash2
} from 'lucide-react';

interface EmployeesTabProps {
  onOpenInvite: () => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({ onOpenInvite }) => {
  const { 
    currentUser, 
    users, 
    invitations, 
    toggleUserStatus, 
    updateUser, 
    deleteUser,
    cancelInvitation, 
    resendInvitation, 
    sendInvitation 
  } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  const myEmployees = users.filter((u) => u.businessId === myCompanyId);
  const myInvitations = invitations.filter((i) => i.businessId === myCompanyId);

  // Active view: 'staff' (Staff Directory) vs 'invitations' (Invitation Management)
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'invitations'>('staff');

  // Staff search & filters
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState('ALL');
  const [staffPage, setStaffPage] = useState(1);
  const staffPerPage = 6;

  // Invitations search & filters
  const [invSearch, setInvSearch] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('ALL');
  const [invPage, setInvPage] = useState(1);
  const invPerPage = 6;

  // Edit / View Modal for Staff
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<AppUser['role']>('Cashier');

  // Cancel Confirmation Modal for Invitation
  const [invToCancel, setInvToCancel] = useState<Invitation | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Filter staff
  const filteredEmployees = myEmployees.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
      u.phone.toLowerCase().includes(staffSearch.toLowerCase());

    const matchesRole = staffRoleFilter === 'ALL' || u.role === staffRoleFilter;
    const matchesStatus = staffStatusFilter === 'ALL' || u.status === staffStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedEmployees = filteredEmployees.slice(
    (staffPage - 1) * staffPerPage,
    staffPage * staffPerPage
  );

  // Filter invitations
  const filteredInvitations = myInvitations.filter((i) => {
    const matchesSearch =
      i.employeeName.toLowerCase().includes(invSearch.toLowerCase()) ||
      i.email.toLowerCase().includes(invSearch.toLowerCase());

    const matchesStatus = invStatusFilter === 'ALL' || i.status === invStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedInvitations = filteredInvitations.slice(
    (invPage - 1) * invPerPage,
    invPage * invPerPage
  );

  const pendingCount = myInvitations.filter((i) => i.status === 'Pending').length;

  const handleOpenEdit = (user: AppUser) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditRole(user.role);
    setIsEditing(true);
  };

  const handleOpenView = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditing(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUser(selectedUser.id, {
        name: editName,
        phone: editPhone,
        role: editRole,
      });
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Prominent Invite Employee Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Employees &amp; Staff
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your Mandi shop staff directory, roles, and onboarding invitations in one place.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenInvite}
          icon={<UserPlus className="w-4 h-4" />}
          className="shadow-sm font-semibold"
        >
          Invite Employee
        </Button>
      </div>

      {/* Sub-Tabs: Staff Directory vs Invitations */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'staff'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeSubTab === 'staff' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
          }`}>
            {myEmployees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('invitations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'invitations'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MailCheck className="w-4 h-4" />
          <span>Invitations</span>
          {pendingCount > 0 ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800">
              {pendingCount} Pending
            </span>
          ) : (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubTab === 'invitations' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
            }`}>
              {myInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: STAFF DIRECTORY */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-80">
              <SearchInput
                value={staffSearch}
                onChange={(val) => {
                  setStaffSearch(val);
                  setStaffPage(1);
                }}
                placeholder="Search staff by name, email or phone..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Role Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={staffRoleFilter}
                  onChange={(e) => {
                    setStaffRoleFilter(e.target.value);
                    setStaffPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={staffStatusFilter}
                  onChange={(e) => {
                    setStaffStatusFilter(e.target.value);
                    setStaffPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {(staffSearch || staffRoleFilter !== 'ALL' || staffStatusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setStaffSearch('');
                    setStaffRoleFilter('ALL');
                    setStaffStatusFilter('ALL');
                    setStaffPage(1);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Employee Name</th>
                    <th className="px-4 py-3.5">Email &amp; Phone</th>
                    <th className="px-4 py-3.5">Assigned Role</th>
                    <th className="px-4 py-3.5">Account Status</th>
                    <th className="px-4 py-3.5">Date Added</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        No employees match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {emp.name.substring(0, 1)}
                            </div>
                            <div>
                              <span>{emp.name}</span>
                              <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                                Last active: {emp.lastActive}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-slate-800 font-medium">{emp.email}</div>
                          <div className="text-slate-400 font-mono text-[11px] mt-0.5">{emp.phone}</div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            emp.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            emp.role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {emp.role}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <Badge
                            variant={
                              emp.status === 'Active' ? 'green' :
                              emp.status === 'Pending Password Creation' ? 'blue' : 'gray'
                            }
                          >
                            {emp.status === 'Pending Password Creation' ? 'POS Setup Pending' : emp.status}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 text-slate-600 font-medium">
                          {emp.dateAdded}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenView(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="View Employee"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => toggleUserStatus(emp.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                emp.status === 'Active'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}
                            >
                              {emp.status === 'Active' ? (
                                <UserX className="w-4 h-4 text-rose-500" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                            {emp.id !== currentUser?.id && (
                              <button
                                onClick={() => setUserToDelete(emp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove Employee"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length > 0 && (
              <TablePagination
                currentPage={staffPage}
                totalItems={filteredEmployees.length}
                itemsPerPage={staffPerPage}
                onPageChange={setStaffPage}
              />
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: INVITATION MANAGEMENT */}
      {activeSubTab === 'invitations' && (
        <div className="space-y-4">
          {/* Filter toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-80">
              <SearchInput
                value={invSearch}
                onChange={(val) => {
                  setInvSearch(val);
                  setInvPage(1);
                }}
                placeholder="Search invitation by employee name or email..."
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={invStatusFilter}
                  onChange={(e) => {
                    setInvStatusFilter(e.target.value);
                    setInvPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={onOpenInvite}
                icon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Send Invitation
              </Button>
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
                    <th className="px-4 py-3.5">Invitation Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                        No invitations match the selected criteria.
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
                              inv.status === 'Activated' ? 'green' :
                              inv.status === 'Accepted' ? 'blue' :
                              inv.status === 'Pending' ? 'yellow' : 'red'
                            }
                          >
                            {inv.status === 'Accepted' ? 'Accepted (POS Setup Pending)' :
                             inv.status === 'Activated' ? 'Active on POS' :
                             inv.status === 'Cancelled' ? 'Revoked' :
                             inv.status}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {inv.status === 'Pending' ? (
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
                          ) : inv.status === 'Accepted' ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[11px] text-blue-700 font-semibold">
                                POS Setup Pending
                              </span>
                              <button
                                onClick={() => setInvToCancel(inv)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Revoke Invitation"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : inv.status === 'Activated' ? (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active on POS</span>
                            </span>
                          ) : inv.status === 'Cancelled' ? (
                            <span className="text-[11px] text-rose-500 font-medium">
                              Revoked
                            </span>
                          ) : (
                            <button
                              onClick={() => resendInvitation(inv.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                              title="Resend Invitation Token"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Resend</span>
                            </button>
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
                currentPage={invPage}
                totalItems={filteredInvitations.length}
                itemsPerPage={invPerPage}
                onPageChange={setInvPage}
              />
            )}
          </div>
        </div>
      )}

      {/* Staff View / Edit Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={isEditing ? `Edit Staff Member: ${selectedUser.name}` : `Staff Details: ${selectedUser.name}`}
          subtitle={`${selectedUser.role} at ${currentUser?.companyName}`}
        >
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as AppUser['role'])}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedUser.name}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">Account Role</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedUser.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">Email Address</span>
                  <span className="font-semibold text-slate-800">{selectedUser.email}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">Phone Number</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedUser.phone}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  variant={selectedUser.status === 'Active' ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => {
                    toggleUserStatus(selectedUser.id);
                    setSelectedUser(null);
                  }}
                >
                  {selectedUser.status === 'Active' ? 'Deactivate Staff' : 'Activate Staff'}
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Role/Info
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Cancel Invitation Confirmation Modal */}
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

      {/* Remove Employee Confirmation Modal */}
      <ConfirmModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={async () => {
          if (userToDelete) {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
          }
        }}
        title="Remove Employee Account?"
        message={`Are you sure you want to permanently remove "${userToDelete?.name}" (${userToDelete?.email}) from your business staff? This action will delete their login account.`}
        confirmText="Remove Employee"
        variant="danger"
      />
    </div>
  );
};
