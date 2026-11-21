import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Subscription, SubscriptionPlan } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { 
  CreditCard, 
  Calendar, 
  Smartphone, 
  Edit3, 
  Check, 
  Filter,
  AlertCircle
} from 'lucide-react';

export const SubscriptionsTab: React.FC = () => {
  const { subscriptions, updateSubscription } = useApp();

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Edit Subscription Modal state
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>('Standard Mandi');
  const [editAllowedDevices, setEditAllowedDevices] = useState(5);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState<Subscription['status']>('Active');

  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch = s.businessName.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'ALL' || s.plan === planFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const paginatedSubs = filteredSubs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setEditPlan(sub.plan);
    setEditAllowedDevices(sub.allowedDevices);
    setEditExpiryDate(sub.expiryDate);
    setEditStatus(sub.status);
  };

  const handleSaveSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSub) {
      updateSubscription(editingSub.id, {
        plan: editPlan,
        allowedDevices: editAllowedDevices,
        expiryDate: editExpiryDate,
        status: editStatus,
      });
      setEditingSub(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Licenses &amp; Mandi Subscriptions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage recurring software contracts, terminal license quotas, and expiry dates across Mandi clients.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search business name..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Plan filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="Starter Mandi">Starter Mandi</option>
              <option value="Standard Mandi">Standard Mandi</option>
              <option value="Enterprise Commission">Enterprise Commission</option>
            </select>
          </div>

          {/* Status filter */}
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
              <option value="ALL">All License Statuses</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Overdue">Overdue</option>
              <option value="Trial">Trial</option>
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
                <th className="px-6 py-3.5">Business Name</th>
                <th className="px-4 py-3.5">Subscription Plan</th>
                <th className="px-4 py-3.5">Device Allocation</th>
                <th className="px-4 py-3.5">License Validity</th>
                <th className="px-4 py-3.5">Contract Rate</th>
                <th className="px-4 py-3.5">License Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No subscriptions match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedSubs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{s.businessName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Billing: {s.billingCycle} ({s.paymentMethod})</div>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {s.plan}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.registeredDevices} of {s.allowedDevices} Terminals</span>
                      </div>
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (s.registeredDevices / s.allowedDevices) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-slate-700 font-medium">Expires: {s.expiryDate}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Started: {s.activationDate}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-bold text-slate-900">PKR {s.pricePKR.toLocaleString()}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">/{s.billingCycle.toLowerCase()}</span>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          s.status === 'Active' ? 'green' :
                          s.status === 'Expiring Soon' ? 'yellow' :
                          s.status === 'Trial' ? 'blue' : 'red'
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(s)}
                        icon={<Edit3 className="w-3.5 h-3.5 text-slate-500" />}
                      >
                        Edit Plan
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredSubs.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredSubs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Edit Subscription Modal */}
      {editingSub && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSub(null)}
          title={`Edit Subscription: ${editingSub.businessName}`}
          subtitle="Adjust license tier, allowed hardware limits, and renewal dates"
        >
          <form onSubmit={handleSaveSub} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plan Tier
              </label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as SubscriptionPlan)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="Starter Mandi">Starter Mandi (PKR 9,000/mo - 2 Devices)</option>
                <option value="Standard Mandi">Standard Mandi (PKR 15,000/mo - 5 Devices)</option>
                <option value="Enterprise Commission">Enterprise Commission (PKR 28,000/mo - 10 Devices)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allowed Devices Quota
              </label>
              <input
                type="number"
                min={editingSub.registeredDevices}
                max={20}
                value={editAllowedDevices}
                onChange={(e) => setEditAllowedDevices(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Currently registered: {editingSub.registeredDevices} devices. Minimum quota cannot be less than active installations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  License Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Subscription['status'])}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Trial">Trial</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingSub(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                Update Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
