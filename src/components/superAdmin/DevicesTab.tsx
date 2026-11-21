import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Device } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { TablePagination } from '../common/TablePagination';
import { DeviceDetailModal } from './DeviceDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  Smartphone, 
  Store, 
  Filter, 
  CheckCircle, 
  Slash, 
  Eye, 
  Wifi,
  Cpu
} from 'lucide-react';

export const DevicesTab: React.FC = () => {
  const { devices, businesses, toggleDeviceStatus } = useApp();

  const [search, setSearch] = useState('');
  const [businessFilter, setBusinessFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Selected device for modal
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deviceToToggle, setDeviceToToggle] = useState<Device | null>(null);

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      d.businessName.toLowerCase().includes(search.toLowerCase()) ||
      d.counterName.toLowerCase().includes(search.toLowerCase());

    const matchesBusiness = businessFilter === 'ALL' || d.businessId === businessFilter;
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

    return matchesSearch && matchesBusiness && matchesStatus;
  });

  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenDetail = (dev: Device) => {
    setSelectedDevice(dev);
    setIsDetailOpen(true);
  };

  const handleConfirmToggle = () => {
    if (deviceToToggle) {
      toggleDeviceStatus(deviceToToggle.id);
      setDeviceToToggle(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          POS Hardware &amp; Terminal Fleet
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Monitor and control all desktop Vegetable POS terminals, scale interfaces, and auction gates.
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
            placeholder="Search terminal ID, name, or counter..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Business Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={businessFilter}
              onChange={(e) => {
                setBusinessFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
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
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>

          {(search || businessFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setBusinessFilter('ALL');
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Terminal / Counter Name</th>
                <th className="px-4 py-3.5">Assigned Mandi</th>
                <th className="px-4 py-3.5">Device ID</th>
                <th className="px-4 py-3.5">App Version</th>
                <th className="px-4 py-3.5">Last Active / Sync</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No registered devices found.
                  </td>
                </tr>
              ) : (
                paginatedDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">Counter: {d.counterName}</div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      <div>{d.businessName}</div>
                      <div className="text-[10px] text-slate-400">{d.mandiLocation}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-emerald-800 font-semibold">
                      {d.deviceId}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {d.appVersion}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      <div>{d.lastActive}</div>
                      <div className="text-[10px] text-slate-400">Activated: {d.activationDate}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          d.status === 'Active' ? 'green' :
                          d.status === 'Inactive' ? 'yellow' : 'red'
                        }
                      >
                        {d.status}
                      </Badge>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="View Device Info"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeviceToToggle(d)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            d.status === 'Active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={d.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {d.status === 'Active' ? (
                            <Slash className="w-4 h-4 text-rose-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredDevices.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredDevices.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Device Details Modal */}
      <DeviceDetailModal
        device={selectedDevice}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Confirm Deactivate / Activate */}
      <ConfirmModal
        isOpen={deviceToToggle !== null}
        onClose={() => setDeviceToToggle(null)}
        onConfirm={handleConfirmToggle}
        title={deviceToToggle?.status === 'Active' ? 'Deactivate POS Terminal?' : 'Activate POS Terminal?'}
        message={
          deviceToToggle?.status === 'Active'
            ? `Are you sure you want to revoke authorization for "${deviceToToggle?.deviceId}"? The POS app will disconnect from cloud sync.`
            : `Authorizing terminal "${deviceToToggle?.deviceId}" will re-enable sync tokens and allow live Mandi auction posting.`
        }
        confirmText={deviceToToggle?.status === 'Active' ? 'Deactivate Terminal' : 'Activate Terminal'}
        variant={deviceToToggle?.status === 'Active' ? 'danger' : 'info'}
      />
    </div>
  );
};
