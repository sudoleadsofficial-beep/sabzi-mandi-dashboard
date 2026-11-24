import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { RolePermission } from '../../types';
import { useApp } from '../../context/AppContext';
import { POS_FEATURES, ALL_FEATURE_IDS } from '../../constants/posFeatures';
import { ShieldCheck, Check, Save, Lock, CheckSquare, Square } from 'lucide-react';

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

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = role?.name.toLowerCase() === 'admin' || role?.isSystemRole === true;

  useEffect(() => {
    if (role) {
      if (isAdmin) {
        // Admin always has all features
        setSelectedFeatures([...ALL_FEATURE_IDS]);
      } else {
        setSelectedFeatures([...(role.allowedFeatures || [])]);
      }
    }
  }, [role, isAdmin]);

  if (!role) return null;

  const handleToggle = (featureId: string) => {
    if (isAdmin) return; // Cannot modify Admin permissions

    setSelectedFeatures((prev) => {
      if (prev.includes(featureId)) {
        return prev.filter((id) => id !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const handleSelectAll = () => {
    if (isAdmin) return;
    setSelectedFeatures([...ALL_FEATURE_IDS]);
  };

  const handleDeselectAll = () => {
    if (isAdmin) return;
    setSelectedFeatures([]);
  };

  const handleSave = async () => {
    if (isAdmin) {
      onClose();
      return;
    }

    setIsSaving(true);
    const success = await updateRolePermissions(role.id, selectedFeatures);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdmin ? 'Admin Permissions' : 'Employee Permissions'}
      subtitle={
        isAdmin
          ? 'Admin has permanent full access to all POS features'
          : 'Tick or untick features to decide what employees can access'
      }
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            {isAdmin ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Full Access (All {POS_FEATURES.length} Features Enabled)
              </span>
            ) : (
              <span>
                <strong className="text-slate-900 font-semibold">{selectedFeatures.length}</strong> of{' '}
                {POS_FEATURES.length} features allowed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              {isAdmin ? 'Close' : 'Cancel'}
            </Button>
            {!isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? undefined : <Save className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Permissions'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Admin notice or Employee quick actions */}
        {isAdmin ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">Full Access Guaranteed</p>
              <p className="text-emerald-700 mt-0.5 leading-relaxed">
                The Admin role has full access to all POS features to guarantee business control.
                These permissions cannot be turned off.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pb-1 pt-0.5">
            <span className="text-xs text-slate-500 font-medium">
              Click a feature to enable or disable it:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" /> Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Scalable Features Checklist */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[60vh] overflow-y-auto">
          {POS_FEATURES.map((feature, idx) => {
            const isChecked = isAdmin || selectedFeatures.includes(feature.id);

            return (
              <label
                key={feature.id}
                onClick={(e) => {
                  if (isAdmin) {
                    e.preventDefault();
                    return;
                  }
                }}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors select-none ${
                  isAdmin
                    ? 'cursor-default bg-slate-50/50'
                    : isChecked
                    ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3.5 pr-4">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isAdmin}
                      onChange={() => handleToggle(feature.id)}
                      className={`w-4 h-4 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-700 ${
                        isAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {feature.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {feature.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isChecked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                      <Check className="w-3 h-3 text-emerald-700" />
                      Allowed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Not Allowed
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
