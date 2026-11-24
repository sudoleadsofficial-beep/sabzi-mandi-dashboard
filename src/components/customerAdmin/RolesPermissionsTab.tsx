import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RolePermission } from '../../types';
import { Button } from '../common/Button';
import { PermissionMatrixModal } from './PermissionMatrixModal';
import { POS_FEATURES } from '../../constants/posFeatures';
import { 
  ShieldCheck, 
  Users, 
  Sliders, 
  Lock,
  Eye,
  CheckCircle2
} from 'lucide-react';

export const RolesPermissionsTab: React.FC = () => {
  const { rolesPermissions, users, currentUser } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  const myEmployees = users.filter((u) => u.businessId === myCompanyId);

  // Selected role for permission checklist modal
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<RolePermission | null>(null);

  // Ensure only the 2 official roles are displayed: Admin and Employee
  const displayRoles = rolesPermissions.filter((r) => {
    const name = (r.name || '').toLowerCase();
    return name === 'admin' || name === 'employee';
  });

  // Fallback in case state hasn't populated yet
  const rolesToRender = displayRoles.length >= 2 ? displayRoles : [
    {
      id: 'role-admin',
      name: 'Admin',
      description: 'Full access to all POS features. Admin access is permanent and cannot be restricted.',
      isSystemRole: true,
      allowedFeatures: POS_FEATURES.map((f) => f.id),
    },
    {
      id: 'role-employee',
      name: 'Employee',
      description: 'Access only to the features enabled by the Admin.',
      isSystemRole: false,
      allowedFeatures: ['new_sale', 'wasooli', 'stock_management', 'customers', 'farmers', 'merchant_khata', 'farmer_khata'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Roles &amp; Permissions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage POS feature access for your staff. Admin has full access, and employees only see features you allow.
        </p>
      </div>

      {/* Role Cards Grid (2 roles only: Admin and Employee) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {rolesToRender.map((role) => {
          const isAdmin = role.name.toLowerCase() === 'admin' || role.isSystemRole;

          // Count staff in current business
          const count = myEmployees.filter((e) => {
            const r = (e.role || '').toLowerCase();
            if (isAdmin) {
              return r === 'admin' || r === 'customer_admin' || r === 'owner';
            }
            return r === 'employee' || r === 'cashier' || r === 'manager' || r === 'accountant' || r === 'staff';
          }).length;

          const allowedCount = isAdmin
            ? POS_FEATURES.length
            : (role.allowedFeatures || []).length;

          return (
            <div
              key={role.id}
              className={`bg-white rounded-2xl border shadow-xs p-6 flex flex-col justify-between transition-all relative overflow-hidden ${
                isAdmin
                  ? 'border-emerald-200/90 hover:shadow-md'
                  : 'border-slate-200/90 hover:shadow-md'
              }`}
            >
              {isAdmin && (
                <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Owner Role
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                  {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">{role.name}</h2>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    <Users className="w-3.5 h-3.5" />
                    <span>{count} staff</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed min-h-[36px]">
                  {role.description}
                </p>

                {/* Feature access summary box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Allowed Features:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {allowedCount} of {POS_FEATURES.length} Features
                    </span>
                  </div>

                  {/* Feature preview */}
                  <div className="mt-2 text-[11px] text-slate-500">
                    {isAdmin ? (
                      <span className="text-emerald-700 font-medium">
                        All POS features unlocked permanently
                      </span>
                    ) : (
                      <span>
                        {role.allowedFeatures && role.allowedFeatures.length > 0 ? (
                          <span className="text-slate-600 line-clamp-1">
                            {POS_FEATURES.filter((f) => role.allowedFeatures?.includes(f.id))
                              .map((f) => f.name)
                              .slice(0, 4)
                              .join(', ')}
                            {role.allowedFeatures.length > 4 ? ` +${role.allowedFeatures.length - 4} more` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">No features allowed yet</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                {isAdmin ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-semibold text-slate-700 border-slate-300 hover:bg-slate-50"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedRoleForPerms(role)}
                  >
                    View All Features
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full font-semibold"
                    icon={<Sliders className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedRoleForPerms(role)}
                  >
                    Manage Permissions
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Checklist Modal */}
      <PermissionMatrixModal
        role={selectedRoleForPerms}
        isOpen={selectedRoleForPerms !== null}
        onClose={() => setSelectedRoleForPerms(null)}
      />
    </div>
  );
};
