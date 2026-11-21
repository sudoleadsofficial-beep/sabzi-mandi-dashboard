import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { 
  Settings, 
  ShieldCheck, 
  Bell, 
  KeyRound, 
  Server, 
  Save, 
  Radio
} from 'lucide-react';

export const PlatformSettingsTab: React.FC = () => {
  const { currentUser, showToast, changePassword, updateProfile } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'hostinger'>('general');
  const [adminName, setAdminName] = useState(currentUser?.name || 'SudoLeads Super Admin');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@sudoleads.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Notifications
  const [alertSyncFailure, setAlertSyncFailure] = useState(true);
  const [alertNewMerchant, setAlertNewMerchant] = useState(true);
  const [alertFailedLogins, setAlertFailedLogins] = useState(true);

  // Hostinger API
  const [apiEndpoint, setApiEndpoint] = useState('https://pos-api.sudoleads.com/v1');
  const [syncInterval, setSyncInterval] = useState('15');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    await updateProfile(adminName, '');
    setIsUpdatingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsUpdatingPassword(false);
    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Platform notification alerts saved', 'success');
  };

  const handleSaveHostinger = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Hostinger Gateway configuration saved', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Super Admin Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure global platform parameters, Hostinger gateway, security policies and credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold text-slate-500">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Platform Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security &amp; Password</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alert Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('hostinger')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'hostinger'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Hostinger API Gateway</span>
        </button>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Super Admin Account Profile</h2>
          <p className="text-xs text-slate-500 mb-5">Manage identity details for SudoLeads platform operators.</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Master Email Address</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
              <span className="font-semibold text-slate-800">Deployment Architecture:</span>
              <p className="mt-0.5">Frontend Admin Portal v2.4 (React + Vite) designed for Hostinger Cloud hosting with REST API sync.</p>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Change Administrative Password</h2>
          <p className="text-xs text-slate-500 mb-5">Ensure a strong 12-character passphrase for platform safety.</p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<KeyRound className="w-4 h-4" />}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Notification &amp; Alert Rules</h2>
          <p className="text-xs text-slate-500 mb-5">Choose which platform events trigger notifications.</p>

          <form onSubmit={handleSaveNotifications} className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSyncFailure}
                  onChange={(e) => setAlertSyncFailure(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">POS Sync Failures &amp; Timeout Alerts</span>
                  <span className="text-xs text-slate-500">Trigger notification if a terminal drops synchronization for &gt; 3 retries.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertNewMerchant}
                  onChange={(e) => setAlertNewMerchant(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">New Mandi Merchant Onboarding</span>
                  <span className="text-xs text-slate-500">Alert when a newly registered business verifies their initial admin token.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertFailedLogins}
                  onChange={(e) => setAlertFailedLogins(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Multiple Failed Login Attempts</span>
                  <span className="text-xs text-slate-500">Notify security administrators if anomalous credentials are detected.</span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Preferences
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'hostinger' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Hostinger API &amp; Server Connectivity</h2>
          <p className="text-xs text-slate-500 mb-5">Endpoint details for the future central cloud synchronization host.</p>

          <form onSubmit={handleSaveHostinger} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Production Cloud Endpoint</label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Sync Ping Interval</label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              >
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes (Standard)</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Hourly</option>
              </select>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
              <Radio className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Hostinger Ready Architecture:</span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  The dashboard is prepared for straightforward deployment on Hostinger Web Hosting via standard static export or VPS reverse proxy.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Gateway Settings
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
