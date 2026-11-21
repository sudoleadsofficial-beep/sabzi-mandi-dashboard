import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Wifi, 
  HardDrive, 
  Info,
  Radio
} from 'lucide-react';

export const CustomerDevicesTab: React.FC = () => {
  const { currentUser, devices, companyProfile, showToast } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  // Strictly Customer Admin's devices ONLY!
  const myDevices = devices.filter((d) => d.businessId === myCompanyId);

  const handleRequestTerminal = () => {
    showToast('Device addition request submitted to SudoLeads Support team', 'info');
  };

  const totalCountersAllowed = companyProfile.totalCounters || 5;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Registered POS Terminals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Hardware terminals and electronic weighing scales authorized for {currentUser?.companyName}.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleRequestTerminal}
          icon={<Smartphone className="w-4 h-4" />}
        >
          Request New Terminal
        </Button>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 leading-relaxed">
          <span className="font-bold">License Quota: {myDevices.length} of {totalCountersAllowed} Terminals in use.</span>
          <p className="text-emerald-800 text-[11px] mt-0.5">
            Each registered terminal operates an encrypted local SQLite database and syncs automatically with the cloud gateway.
          </p>
        </div>
      </div>

      {/* Devices Grid */}
      {myDevices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-10 text-center text-xs text-slate-400">
          <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No POS Terminals Registered Yet</p>
          <p className="text-slate-500 mt-1">Once POS counter terminals are registered and connect, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myDevices.map((dev) => (
          <div
            key={dev.id}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Smartphone className="w-5 h-5" />
                </div>
                <Badge variant={dev.status === 'Active' ? 'green' : 'gray'}>
                  {dev.status}
                </Badge>
              </div>

              <h2 className="text-base font-bold text-slate-900 mt-4 leading-snug">
                {dev.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Counter: {dev.counterName}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Terminal Identifier:</span>
                  <span className="font-mono font-bold text-slate-900">{dev.deviceId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Software Build:</span>
                  <span className="font-semibold text-slate-700">{dev.appVersion}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">IP on LAN:</span>
                  <span className="font-mono text-slate-700">{dev.ipAddress}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Operating System:</span>
                  <span className="text-slate-700 font-medium">{dev.osDetails}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Registration Date:</span>
                  <span className="text-slate-700 font-medium">{dev.activationDate}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                <span>Last active: {dev.lastActive}</span>
              </span>
              <span className="text-slate-400">Online</span>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
