import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { RolePermission } from '../../types';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Check, Save } from 'lucide-react';

interface PermissionMatrixModalProps {
  role: RolePermission | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionMatrixModal: React.FC<PermissionMatrixModalProps> = ({
  role,
  isOpen,
  onClose,
}) => {
  const { updateRolePermissions } = useApp();

  const [permissionsState, setPermissionsState] = useState<RolePermission['permissions']>([]);

  React.useEffect(() => {
    if (role) {
      // Deep clone permissions
      setPermissionsState(JSON.parse(JSON.stringify(role.permissions)));
    }
  }, [role]);

  if (!role) return null;

  const handleToggle = (moduleIndex: number, action: keyof RolePermission['permissions'][0]['actions']) => {
    setPermissionsState((prev) => {
      const updated = [...prev];
      const target = { ...updated[moduleIndex] };
      target.actions = {
        ...target.actions,
        [action]: !target.actions[action],
      };
      updated[moduleIndex] = target;
      return updated;
    });
  };

  const handleSave = () => {
    updateRolePermissions(role.id, permissionsState);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permission Matrix: ${role.name}`}
      subtitle={`Configure granular operational privileges for ${role.name} role in Vegetable POS`}
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} icon={<Save className="w-4 h-4" />}>
            Save Role Permissions
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>
            Changes made here directly govern what buttons, auction lot editors, and cash drawers are enabled on POS terminals logged in under this role.
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mandi POS Module</th>
                <th className="px-3 py-3 text-center">View</th>
                <th className="px-3 py-3 text-center">Create</th>
                <th className="px-3 py-3 text-center">Edit</th>
                <th className="px-3 py-3 text-center">Delete</th>
                <th className="px-3 py-3 text-center">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsState.map((p, idx) => (
                <tr key={p.module} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{p.module}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                  </td>

                  {(['view', 'create', 'edit', 'delete', 'export'] as const).map((action) => (
                    <td key={action} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={p.actions[action]}
                        onChange={() => handleToggle(idx, action)}
                        className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-700"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
