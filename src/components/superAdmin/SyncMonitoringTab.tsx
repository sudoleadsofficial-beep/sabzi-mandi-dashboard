import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SyncRecord } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { SyncDetailModal } from './SyncDetailModal';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Eye, 
  Filter,
  Radio
} from 'lucide-react';

export const SyncMonitoringTab: React.FC = () => {
  const { syncRecords, triggerSyncRetry } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Selected for Error / Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<SyncRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredRecords = syncRecords.filter((r) => {
    const matchesSearch =
      r.businessName.toLowerCase().includes(search.toLowerCase()) ||
      r.deviceName.toLowerCase().includes(search.toLowerCase()) ||
      r.deviceId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.syncStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenDetail = (record: SyncRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const syncedCount = syncRecords.filter((r) => r.syncStatus === 'Synced').length;
  const pendingCount = syncRecords.filter((r) => r.syncStatus === 'Pending' || r.syncStatus === 'Syncing').length;
  const failedCount = syncRecords.filter((r) => r.syncStatus === 'Failed').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Sync Monitoring &amp; Data Pipeline
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Real-time telemetry of offline-to-cloud transaction batching between desktop POS terminals and the Hostinger server.
        </p>
      </div>

      {/* Status Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Monitored</span>
            <span className="text-2xl font-bold text-slate-900 block mt-1">{syncRecords.length} Terminals</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fully Synced</span>
            <span className="text-2xl font-bold text-emerald-700 block mt-1">{syncedCount} Terminals</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Batches</span>
            <span className="text-2xl font-bold text-amber-700 block mt-1">{pendingCount} Terminals</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Failed Records</span>
            <span className="text-2xl font-bold text-rose-700 block mt-1">{failedCount} Terminals</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
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
            placeholder="Search business, terminal, or ID..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sync Statuses</option>
              <option value="Synced">Synced</option>
              <option value="Pending">Pending</option>
              <option value="Syncing">Syncing</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sync Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Business &amp; Terminal</th>
                <th className="px-4 py-3.5">Device Identifier</th>
                <th className="px-4 py-3.5">Last Successful Sync</th>
                <th className="px-4 py-3.5">Pending Records</th>
                <th className="px-4 py-3.5">Failed Records</th>
                <th className="px-4 py-3.5">Sync Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No POS Terminals or Sync Telemetry Records Registered Yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Once local desktop POS instances connect to this Hostinger cloud backend, their offline transaction batching, heartbeat, and synchronization telemetry will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{r.deviceName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.businessName}</div>
                    </td>

                    <td className="px-4 py-4 font-mono font-semibold text-slate-800">
                      {r.deviceId}
                    </td>

                    <td className="px-4 py-4 text-slate-600 font-mono">
                      {r.lastSuccessfulSync}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`font-mono font-semibold ${
                        r.pendingRecords > 0 ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded' : 'text-slate-400'
                      }`}>
                        {r.pendingRecords} rec
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`font-mono font-semibold ${
                        r.failedRecords > 0 ? 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold' : 'text-slate-400'
                      }`}>
                        {r.failedRecords} rec
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          r.syncStatus === 'Synced' ? 'green' :
                          r.syncStatus === 'Syncing' ? 'blue' :
                          r.syncStatus === 'Pending' ? 'yellow' : 'red'
                        }
                      >
                        {r.syncStatus}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(r)}
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          {r.syncStatus === 'Failed' ? 'Error Log' : 'Inspect'}
                        </Button>

                        <button
                          onClick={() => triggerSyncRetry(r.id)}
                          disabled={r.syncStatus === 'Syncing'}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Trigger Sync Retry"
                        >
                          <RefreshCw className={`w-4 h-4 ${r.syncStatus === 'Syncing' ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Error / Diagnostic Modal */}
      <SyncDetailModal
        record={selectedRecord}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
};
