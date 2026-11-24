import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser } from '../../types';
import { Badge } from '../common/Badge';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Button } from '../common/Button';
import { 
  Store, 
  UserCheck, 
  UserX, 
  Edit3, 
  Filter, 
  Check, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Building2,
  Trash2
} from 'lucide-react';

export const UsersTab: React.FC = () => {
  const { currentUser, users, businesses, toggleUserStatus, updateUser, deleteUser, refreshUsers } = useApp();

  const [search, setSearch] = useState('');
  const [businessFilter, setBusinessFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit user state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<string>('Employee');
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (u.createdBy && u.createdBy.toLowerCase().includes(search.toLowerCase()));

    const matchesBusiness = businessFilter === 'ALL' || u.businessId === businessFilter;
    const isEmp = u.role.toUpperCase() !== 'SUPER_ADMIN' && u.role.toUpperCase() !== 'CUSTOMER_ADMIN' && u.role.toUpperCase() !== 'ADMIN';
    const matchesRole = roleFilter === 'ALL' ||
      (roleFilter === 'Employee' ? isEmp : u.role.toUpperCase() === roleFilter.toUpperCase());
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesBusiness && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUser(editingUser.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        role: editRole,
      });
      setEditingUser(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    const norm = role.toUpperCase();
    if (norm === 'SUPER_ADMIN') return 'purple';
    if (norm === 'CUSTOMER_ADMIN' || norm === 'ADMIN') return 'green';
    return 'blue';
  };

  const getRoleDisplayName = (role: string) => {
    const norm = role.toUpperCase();
    if (norm === 'SUPER_ADMIN') return 'Super Admin';
    if (norm === 'CUSTOMER_ADMIN') return 'Customer Admin';
    if (norm === 'ADMIN') return 'Admin';
    return 'Employee';
  };

  return (
    <div className="space-y-6">
      {/* Title & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            User Management &amp; Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Directory of all platform and Mandi business accounts across Pakistan with creator attribution.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => refreshUsers()}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Directory
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="w-full lg:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search employee, email, mandi, or creator..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Business Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={businessFilter}
              onChange={(e) => {
                setBusinessFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CUSTOMER_ADMIN">Customer Admin</option>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {(search || businessFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setBusinessFilter('ALL');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">User &amp; Email</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Business &amp; ID</th>
                <th className="px-4 py-3.5">Added / Created By</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No users match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* User Name & Email */}
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name.substring(0, 1)}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {getRoleDisplayName(u.role)}
                      </Badge>
                    </td>

                    {/* Business Name & ID */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{u.businessName}</div>
                      {u.businessId ? (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          ID: {u.businessId}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">Platform Core</div>
                      )}
                    </td>

                    {/* Added / Created By */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {u.createdBy || (u.role === 'SUPER_ADMIN' ? 'Platform System' : 'Super Admin')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {u.createdByRole === 'SUPER_ADMIN' ? 'Super Admin Action' : 'Customer Admin Action'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      <div>{u.dateAdded || '2026-11-20'}</div>
                      {u.lastActive && (
                        <div className="text-[10px] text-slate-400 font-normal">Active: {u.lastActive}</div>
                      )}
                    </td>

                    {/* Account Status */}
                    <td className="px-4 py-3.5">
                      <Badge variant={u.status === 'Active' ? 'green' : 'gray'}>
                        {u.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.status === 'Active'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          >
                            {u.status === 'Active' ? (
                              <UserX className="w-4 h-4 text-rose-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                        )}
                        {u.role !== 'SUPER_ADMIN' && u.id !== currentUser?.id && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete User"
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

        {filteredUsers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={async () => {
          if (userToDelete) {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
          }
        }}
        title="Remove User Account?"
        message={`Are you sure you want to remove "${userToDelete?.name}" (${userToDelete?.email}) from the platform? This will delete their login credentials.`}
        confirmText="Delete User"
        variant="danger"
      />

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.name}`}
          subtitle={`Account belongs to ${editingUser.businessName}`}
        >
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
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="CUSTOMER_ADMIN">Customer Admin</option>
                <option value="Admin">Admin</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
