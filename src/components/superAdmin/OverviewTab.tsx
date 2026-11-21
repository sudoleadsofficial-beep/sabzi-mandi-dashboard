import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  MailCheck, 
  Plus, 
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface OverviewTabProps {
  onOpenAddBusiness: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onOpenAddBusiness }) => {
  const { 
    businesses, 
    users, 
    devices,
    syncRecords, 
    invitations,
    setCurrentTab 
  } = useApp();

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === 'Active').length;
  const totalUsers = users.length;
  const pendingInvitations = invitations.filter((i) => i.status === 'Pending').length;
  const syncIssues = syncRecords.filter((s) => s.syncStatus === 'Failed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-100 border border-emerald-600/50 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>SudoLeads Central Control Tower</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Vegetable POS Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
            Real-time management across Mandi wholesale businesses, registered users, and cloud synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentTab('sync')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30"
            icon={<AlertTriangle className="w-4 h-4 text-amber-300" />}
          >
            Sync Health ({syncIssues} alerts)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddBusiness}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm font-semibold"
            icon={<Plus className="w-4 h-4" />}
          >
            Onboard New Mandi
          </Button>
        </div>
      </div>

      {/* 5 Focused Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Businesses"
          value={totalBusinesses}
          icon={<Building2 className="w-5 h-5 text-emerald-600" />}
          subtitle="Across Mandis"
          onClick={() => setCurrentTab('businesses')}
        />
        <StatCard
          title="Active Businesses"
          value={activeBusinesses}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          badgeText={`${Math.round((activeBusinesses / (totalBusinesses || 1)) * 100)}% active`}
          badgeVariant="green"
          onClick={() => setCurrentTab('businesses')}
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          subtitle="Staff across businesses"
          onClick={() => setCurrentTab('users')}
        />
        <StatCard
          title="Pending Invitations"
          value={pendingInvitations}
          icon={<MailCheck className="w-5 h-5 text-amber-600" />}
          badgeText="Awaiting signup"
          badgeVariant="yellow"
          onClick={() => setCurrentTab('users')}
        />
        <StatCard
          title="Synchronization Status"
          value={devices.length === 0 ? '0 Terminals' : syncIssues > 0 ? `${syncIssues} Issues` : 'All Synced'}
          icon={<RefreshCw className={`w-5 h-5 ${devices.length === 0 ? 'text-slate-400' : syncIssues > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />}
          badgeText={devices.length === 0 ? 'Awaiting POS' : syncIssues > 0 ? 'Action Needed' : 'Operational'}
          badgeVariant={devices.length === 0 ? 'gray' : syncIssues > 0 ? 'red' : 'green'}
          onClick={() => setCurrentTab('sync')}
        />
      </div>

      {/* 2-Column Content Grid: Recent Registrations & Device Sync Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent Business Registrations (Cleaned of subscription/device columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Mandi Registrations</h2>
              <p className="text-xs text-slate-500">Newly onboarded commission agents &amp; wholesalers</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTab('businesses')}
              className="text-emerald-700"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3">Business &amp; Mandi</th>
                  <th className="px-4 py-3">Owner Contact</th>
                  <th className="px-4 py-3">Registered Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      No businesses registered yet. Click &quot;Onboard New Mandi&quot; to add your first customer.
                    </td>
                  </tr>
                ) : (
                  businesses.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{b.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{b.mandiLocation}, {b.city}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium">{b.ownerName}</div>
                        <div className="text-[11px] text-slate-500">{b.phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {b.registrationDate}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            b.status === 'Active' ? 'green' :
                            b.status === 'Suspended' ? 'red' : 'yellow'
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Synchronization Status & Gateway */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Sync Gateway Status</h2>
              <Badge variant={syncIssues > 0 ? 'red' : 'green'} size="sm">
                {syncIssues > 0 ? `${syncIssues} Degraded` : '100% Synced'}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {syncRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No POS Terminals Registered Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Terminals and transaction sync feeds will appear here automatically once connected.
                  </p>
                </div>
              ) : (
                syncRecords.slice(0, 4).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          {record.deviceName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                          {record.businessName}
                        </p>
                      </div>
                      <Badge
                        variant={
                          record.syncStatus === 'Synced' ? 'green' :
                          record.syncStatus === 'Syncing' ? 'blue' :
                          record.syncStatus === 'Pending' ? 'yellow' : 'red'
                        }
                        size="sm"
                      >
                        {record.syncStatus}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 text-[11px] flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {record.lastSuccessfulSync.substring(11, 19)}
                      </span>
                      {record.pendingRecords > 0 && (
                        <span className="text-amber-700 font-medium">
                          {record.pendingRecords} queued
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-700"
              onClick={() => setCurrentTab('sync')}
            >
              Open Full Sync Monitor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
