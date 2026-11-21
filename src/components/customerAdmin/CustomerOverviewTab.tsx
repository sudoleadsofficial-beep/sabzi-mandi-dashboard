import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  Users, 
  UserCheck, 
  MailCheck, 
  UserPlus, 
  Store, 
  ArrowRight,
  MapPin
} from 'lucide-react';

interface CustomerOverviewTabProps {
  onOpenInvite: () => void;
}

export const CustomerOverviewTab: React.FC<CustomerOverviewTabProps> = ({ onOpenInvite }) => {
  const { 
    currentUser, 
    users, 
    invitations, 
    companyProfile, 
    setCurrentTab 
  } = useApp();

  const myCompanyId = currentUser?.companyId || '';
  
  // Filter data belonging strictly to this customer company
  const myEmployees = users.filter((u) => u.businessId === myCompanyId);
  const activeEmployees = myEmployees.filter((u) => u.status === 'Active').length;
  const myInvitations = invitations.filter((i) => i.businessId === myCompanyId);
  const pendingInvitations = myInvitations.filter((i) => i.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/60 text-emerald-100 border border-emerald-600/50 mb-2">
            <Store className="w-3.5 h-3.5 text-amber-300" />
            <span>Mandi Merchant Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {companyProfile.name || currentUser?.companyName || 'Mandi Merchant Portal'}
          </h1>
          {(companyProfile.mandiLocation || companyProfile.city) ? (
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
              <span>{[companyProfile.mandiLocation, companyProfile.city].filter(Boolean).join(', ')}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentTab('company')}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30"
          >
            My Company Info
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInvite}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm font-semibold"
            icon={<UserPlus className="w-4 h-4" />}
          >
            Invite Staff
          </Button>
        </div>
      </div>

      {/* 3 Summary Cards - Clean & Focused */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Staff"
          value={myEmployees.length}
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          subtitle="Registered staff accounts"
          onClick={() => setCurrentTab('employees')}
        />
        <StatCard
          title="Active Employees"
          value={activeEmployees}
          icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
          badgeText={`${Math.round((activeEmployees / (myEmployees.length || 1)) * 100)}% active`}
          badgeVariant="green"
          onClick={() => setCurrentTab('employees')}
        />
        <StatCard
          title="Pending Invitations"
          value={pendingInvitations}
          icon={<MailCheck className="w-5 h-5 text-amber-600" />}
          badgeText={pendingInvitations > 0 ? 'Action required' : 'All confirmed'}
          badgeVariant={pendingInvitations > 0 ? 'yellow' : 'gray'}
          onClick={() => setCurrentTab('employees')}
        />
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Spans): Staff Activity & Recently Sent Invitations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Staff Activity */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mandi Staff Activity</h2>
                <p className="text-xs text-slate-500">Recent actions by managers, auction cashiers and accountants</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTab('employees')}
                className="text-emerald-700"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Staff
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {myEmployees.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600">No Staff Registered Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click &quot;Invite Staff&quot; above to onboard cashiers, auction masters, or accountants.
                  </p>
                </div>
              ) : (
                myEmployees.slice(0, 3).map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        {emp.name.substring(0, 1)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[11px] text-slate-500">{emp.email} &bull; {emp.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {emp.role}
                      </span>
                      <Badge variant={emp.status === 'Active' ? 'green' : 'gray'} size="sm">
                        {emp.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Sent Invitations */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Staff Invitations</h2>
                <p className="text-xs text-slate-500">Status of onboarding invite tokens</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTab('employees')}
                className="text-emerald-700"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Manage Invitations
              </Button>
            </div>

            <div className="mt-4 space-y-2.5">
              {myInvitations.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No pending or accepted staff invitations yet.
                </div>
              ) : (
                myInvitations.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{inv.employeeName}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{inv.email} &bull; Role: {inv.assignedRole}</span>
                    </div>
                    <Badge
                      variant={
                        inv.status === 'Accepted' ? 'green' :
                        inv.status === 'Pending' ? 'yellow' : 'red'
                      }
                      size="sm"
                    >
                      {inv.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right (1 Span): Company Information Overview Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Company Profile</h2>
              <Badge variant="green" size="sm">Verified Aarhti</Badge>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Sole Proprietor / Owner</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{companyProfile.ownerName || 'Not configured'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Primary Contact</span>
                <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{companyProfile.phone || 'No phone set'}</span>
                <span className="text-slate-500 block">{companyProfile.email || currentUser?.email}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Mandi Location</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{companyProfile.mandiLocation || 'Not specified'}</span>
                <span className="text-slate-500 block">{[companyProfile.address, companyProfile.city].filter(Boolean).join(', ') || 'No address set'}</span>
              </div>

              {companyProfile.commissionRate ? (
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Mandi Commission Rate</span>
                  <span className="font-bold text-emerald-800 mt-0.5 block">{companyProfile.commissionRate}</span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-700"
                  onClick={() => setCurrentTab('company')}
                >
                  Edit Company Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
