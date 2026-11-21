import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { Button } from '../common/Button';
import { 
  ScrollText, 
  Download, 
  Filter, 
  Shield, 
  Building2, 
  Smartphone, 
  Users, 
  CreditCard, 
  RefreshCw 
} from 'lucide-react';

export const AuditLogsTab: React.FC = () => {
  const { auditLogs, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.businessName.toLowerCase().includes(search.toLowerCase()) ||
      log.activityDescription.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    showToast('Exported audit trail to audit_logs_mandi_portal.csv', 'info');
  };

  const getCategoryBadge = (category: AuditLog['category']) => {
    switch (category) {
      case 'Security':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Business':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Device':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'User':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'License':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Sync':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            System Audit Trail &amp; Activity Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable trace of all administrative modifications, user invitations, and device authorizations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          icon={<Download className="w-4 h-4" />}
        >
          Export CSV Log
        </Button>
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
            placeholder="Search action, user, or description..."
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Security">Security</option>
              <option value="Business">Business</option>
              <option value="Device">Device</option>
              <option value="User">User</option>
              <option value="License">License</option>
              <option value="Sync">Sync</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Actor &amp; Role</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Target Business</th>
                <th className="px-4 py-3.5">Activity Description</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-6 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-xs">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{log.userRole} &bull; {log.ipAddress}</div>
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-800">
                      {log.action}
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-700">
                      {log.businessName}
                    </td>

                    <td className="px-4 py-4 text-slate-600 max-w-sm">
                      {log.activityDescription}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryBadge(log.category)}`}>
                        {log.category}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-[11px] text-slate-500">
                      {log.timestamp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredLogs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};
