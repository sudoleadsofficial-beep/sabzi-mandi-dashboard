import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { 
  Settings, 
  ShieldCheck, 
  Bell, 
  KeyRound, 
  Save, 
  User, 
  Lock, 
  Smartphone,
  Check
} from 'lucide-react';

export const CustomerSettingsTab: React.FC = () => {
  const { 
    currentUser, 
    companyProfile, 
    showToast, 
    changePassword, 
    updateProfile, 
    updateBusinessSettings 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'security'>('profile');
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [userPhone, setUserPhone] = useState(companyProfile?.phone || '');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications
  const [dailyClosingSms, setDailyClosingSms] = useState(true);
  const [cashMismatchAlert, setCashMismatchAlert] = useState(true);
  const [staffLoginAlert, setStaffLoginAlert] = useState(false);

  // Security
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    await updateProfile(userName, userPhone);
    setIsSavingProfile(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    setIsChangingPass(true);
    const res = await changePassword(oldPassword, newPassword);
    setIsChangingPass(false);
    if (res.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessSettings({
      notifications: {
        dailyClosingSms,
        cashMismatchAlert,
        staffLoginAlert,
      },
    });
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessSettings({
      security: {
        twoFactorAuth,
        sessionTimeout,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Account &amp; Shop Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your personal credentials, SMS daily closing alerts, and security preferences.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold text-slate-500">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
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
          <span>Mandi Notifications</span>
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
          <span>Terminal Security</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Customer Admin Profile</h2>
          <p className="text-xs text-slate-500 mb-5">Your personal credentials for the Mandi portal.</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono"
              />
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Update Password</h2>
          <p className="text-xs text-slate-500 mb-5">Ensure your account is protected with a secure password.</p>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
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
              <Button variant="primary" size="md" type="submit" icon={<Lock className="w-4 h-4" />}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Mandi Notifications &amp; Alerts</h2>
          <p className="text-xs text-slate-500 mb-5">Configure daily reports and financial discrepancy alerts.</p>

          <form onSubmit={handleSaveNotifications} className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyClosingSms}
                  onChange={(e) => setDailyClosingSms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Daily Day-End Roznamcha Summary</span>
                  <span className="text-xs text-slate-500">Receive evening summary of total auction sales, commission earned, and cash in drawer.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cashMismatchAlert}
                  onChange={(e) => setCashMismatchAlert(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Cash Drawer Discrepancy Alert</span>
                  <span className="text-xs text-slate-500">Instant notification if physical cash reconciled by employee differs from system total.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staffLoginAlert}
                  onChange={(e) => setStaffLoginAlert(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">After-Hours Counter Login Alert</span>
                  <span className="text-xs text-slate-500">Notify if any employee logs onto a Mandi POS counter past 8:00 PM.</span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Notification Rules
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Terminal Security Policies</h2>
          <p className="text-xs text-slate-500 mb-5">Enforce workstation lockouts and access guardrails.</p>

          <form onSubmit={handleSaveSecurity} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Automatic Inactive Session Lockout</label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
              >
                <option value="15">After 15 minutes of counter inactivity</option>
                <option value="30">After 30 minutes of counter inactivity</option>
                <option value="60">After 1 hour (Default)</option>
                <option value="120">After 2 hours</option>
              </select>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={twoFactorAuth}
                onChange={(e) => setTwoFactorAuth(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-700 rounded accent-emerald-700"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Require Admin Authorization for Void Slips</span>
                <span className="text-xs text-slate-500">Require Admin PIN approval on the POS terminal before any auction parchi can be cancelled or modified.</span>
              </div>
            </label>

            <div className="pt-2">
              <Button variant="primary" size="md" type="submit" icon={<Save className="w-4 h-4" />}>
                Save Security Settings
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
