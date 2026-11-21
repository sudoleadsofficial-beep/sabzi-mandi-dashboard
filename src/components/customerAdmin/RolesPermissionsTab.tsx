import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RolePermission } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { PermissionMatrixModal } from './PermissionMatrixModal';
import { 
  ShieldCheck, 
  Users, 
  Edit3, 
  Check, 
  Sliders, 
  Sparkles,
  Lock
} from 'lucide-react';

export const RolesPermissionsTab: React.FC = () => {
  const { rolesPermissions, users, currentUser } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  const myEmployees = users.filter((u) => u.businessId === myCompanyId);

  // Selected role for permission matrix modal
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<RolePermission | null>(null);

  // Edit role description modal
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null);
  const [editDesc, setEditDesc] = useState('');

  const handleOpenEditRole = (role: RolePermission) => {
    setEditingRole(role);
    setEditDesc(role.description);
  };

  const handleSaveRoleDesc = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      editingRole.description = editDesc;
      setEditingRole(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Roles &amp; Access Permissions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure security roles and granular feature permissions for your Mandi billing and auction counters.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rolesPermissions.map((role) => {
          // Count how many staff in our company have this role
          const count = myEmployees.filter(
            (e) =>
              e.role.toLowerCase() === role.name.toLowerCase() ||
              (role.name.toLowerCase() === 'admin' &&
                (e.role.toUpperCase() === 'CUSTOMER_ADMIN' || e.role.toLowerCase() === 'admin'))
          ).length;

          const isPrimaryAdmin = role.name === 'Admin';

          return (
            <div
              key={role.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {isPrimaryAdmin && (
                <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Owner Role
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">{role.name}</h2>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{count} staff</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed min-h-[48px]">
                  {role.description}
                </p>

                {/* Module count pill */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Authorized Modules:</span>
                  <span className="font-semibold text-slate-800">
                    {role.permissions.length} Mandi Modules
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full font-semibold"
                  icon={<Sliders className="w-3.5 h-3.5" />}
                  onClick={() => setSelectedRoleForPerms(role)}
                >
                  Manage Permissions
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-600"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEditRole(role)}
                >
                  Edit Role Description
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix Modal */}
      <PermissionMatrixModal
        role={selectedRoleForPerms}
        isOpen={selectedRoleForPerms !== null}
        onClose={() => setSelectedRoleForPerms(null)}
      />

      {/* Edit Role Description Modal */}
      {editingRole && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRole(null)}
          title={`Edit Role: ${editingRole.name}`}
          subtitle="Update role description and guidance notes for staff members"
        >
          <form onSubmit={handleSaveRoleDesc} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description</label>
              <textarea
                rows={3}
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-900"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingRole(null)}>
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
