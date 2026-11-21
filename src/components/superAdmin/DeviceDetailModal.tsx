import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Device } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Smartphone, 
  Wifi, 
  Cpu, 
  HardDrive, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Slash,
  Store,
  ShieldAlert
} from 'lucide-react';

interface DeviceDetailModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  isOpen,
  onClose,
}) => {
  const { toggleDeviceStatus } = useApp();

  if (!device) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={device.name}
      subtitle={`Device ID: ${device.deviceId}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant={device.status === 'Active' ? 'danger' : 'success'}
            size="sm"
            onClick={() => {
              toggleDeviceStatus(device.id);
            }}
          >
            {device.status === 'Active' ? 'Deactivate Terminal' : 'Activate Terminal'}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Status card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Authorization Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={device.status === 'Active' ? 'green' : 'red'}>
                {device.status}
              </Badge>
              <span className="text-slate-500 font-medium">({device.appVersion})</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Assigned Counter
            </span>
            <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
              {device.counterName}
            </span>
          </div>
        </div>

        {/* Mandi & Tenant Info */}
        <div className="p-3.5 rounded-xl border border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mandi Business Location</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{device.businessName}</p>
          <p className="text-slate-500 mt-0.5">{device.mandiLocation}</p>
        </div>

        {/* Hardware & Network Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
              <Wifi className="w-3.5 h-3.5 text-blue-600" />
              <span>Local IP Address</span>
            </div>
            <p className="font-mono font-semibold text-slate-800">{device.ipAddress}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
              <HardDrive className="w-3.5 h-3.5 text-purple-600" />
              <span>Hardware MAC Address</span>
            </div>
            <p className="font-mono font-semibold text-slate-800">{device.macAddress}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
              <Cpu className="w-3.5 h-3.5 text-slate-600" />
              <span>Operating System</span>
            </div>
            <p className="font-semibold text-slate-800">{device.osDetails}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Last Heartbeat / Sync</span>
            </div>
            <p className="font-semibold text-slate-800">{device.lastActive}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Deactivating this terminal will immediately invalidate its offline sync token. The local POS app will restrict new Boli entry until re-authorized by SudoLeads admin.
          </span>
        </div>
      </div>
    </Modal>
  );
};
