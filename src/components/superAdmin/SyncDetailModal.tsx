import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { SyncRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Clock, 
  Database, 
  Smartphone,
  CheckCircle2,
  FileCode
} from 'lucide-react';

interface SyncDetailModalProps {
  record: SyncRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDetailModal: React.FC<SyncDetailModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const { triggerSyncRetry } = useApp();

  if (!record) return null;

  const isFailed = record.syncStatus === 'Failed';

  const handleRetry = () => {
    triggerSyncRetry(record.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFailed ? 'Synchronization Error Diagnostics' : 'Terminal Sync Health'}
      subtitle={`${record.deviceName} (${record.deviceId})`}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRetry}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${record.syncStatus === 'Syncing' ? 'animate-spin' : ''}`} />}
            disabled={record.syncStatus === 'Syncing'}
          >
            {record.syncStatus === 'Syncing' ? 'Handshaking...' : 'Trigger Immediate Sync'}
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close Diagnostics
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Status header */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sync Engine Status
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={
                  record.syncStatus === 'Synced' ? 'green' :
                  record.syncStatus === 'Syncing' ? 'blue' :
                  record.syncStatus === 'Pending' ? 'yellow' : 'red'
                }
              >
                {record.syncStatus}
              </Badge>
              <span className="text-slate-500 font-mono text-[11px]">
                Retry count: {record.retryCount}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mandi Merchant
            </span>
            <span className="font-semibold text-slate-900 block mt-1">
              {record.businessName}
            </span>
          </div>
        </div>

        {/* Sync queue metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Queue</span>
            <span className="text-lg font-bold text-slate-800 mt-1 block font-mono">
              {record.pendingRecords}
            </span>
            <span className="text-[10px] text-slate-400">records waiting</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Failed Payload</span>
            <span className="text-lg font-bold text-rose-600 mt-1 block font-mono">
              {record.failedRecords}
            </span>
            <span className="text-[10px] text-slate-400">rejected packets</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Ack</span>
            <span className="text-xs font-semibold text-slate-700 mt-2 block">
              {record.lastSuccessfulSync.substring(11, 19)}
            </span>
            <span className="text-[10px] text-slate-400">{record.lastSuccessfulSync.substring(0, 10)}</span>
          </div>
        </div>

        {/* Error trace box if failed */}
        {record.errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Gateway Failure Details</span>
            </div>
            <p className="text-rose-700 text-xs leading-relaxed font-sans">
              {record.errorMessage}
            </p>

            {record.failedEntity && (
              <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2 font-mono text-[11px] text-rose-900">
                <Database className="w-3.5 h-3.5 text-rose-600" />
                <span>Affected Local Table: <strong>{record.failedEntity}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Technical Diagnostics */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 pb-1 border-b border-slate-800">
            <Terminal className="w-3.5 h-3.5" />
            <span>Hostinger Cloud Sync Gateway Trace</span>
          </div>
          <div>[INFO] Target: https://api.vegetablepos.sudoleads.com/v1/sync/mandi-batch</div>
          <div>[INFO] Device Hardware Token: SHA256({record.deviceId}:MANDI_AUTH)</div>
          <div>[INFO] Protocol: HTTPS Encrypted REST Batch Payload + GZIP</div>
          <div>
            [STATUS]{' '}
            {record.syncStatus === 'Synced'
              ? '200 OK — Offline SQLite Ledger in sync with central replica.'
              : `HTTP 504 / RETRY_NEEDED — ${record.errorMessage || 'Payload queued on local terminal disk.'}`}
          </div>
        </div>
      </div>
    </Modal>
  );
};
