import React, { useState } from 'react';
import { useApp, isCustomerAdminRole, isSuperAdminRole } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { Badge } from '../common/Badge';
import { 
  Bell, 
  Menu, 
  ShieldCheck, 
  Store, 
  UserCheck,
  LogOut, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { 
    currentUser, 
    logout, 
    notifications, 
    unreadNotificationCount, 
    markAllNotificationsAsRead, 
    markNotificationAsRead, 
    dismissNotification 
  } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const isCustomerAdmin = isCustomerAdminRole(currentUser?.role);

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Mobile Toggle & Brand / Workspace Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <BrandLogo size="sm" />
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Current Workspace Identifier */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="green" size="sm">
                SudoLeads Super Admin
              </Badge>
              <span className="text-xs text-slate-400 hidden md:inline">
                • Platform Wide Management
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="sm">
                {isCustomerAdmin ? 'Mandi Account' : `${currentUser?.role || 'Staff'} Account`}
              </Badge>
              <span className="text-xs font-semibold text-slate-700 hidden md:inline">
                {currentUser?.companyName || 'Mandi Business'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Authenticated Role Badge + Notifications + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Verified Role Badge (No switching allowed) */}
        {isSuperAdmin ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Platform Super Admin</span>
          </div>
        ) : isCustomerAdmin ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span>Customer Admin</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>{currentUser?.role || 'Staff'}</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white rounded-full ring-2 ring-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notifications ({notifications.length})
                </span>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] font-medium text-emerald-700 cursor-pointer hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs flex gap-2.5 items-start transition-colors ${
                        !n.isRead
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      {n.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : n.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {n.createdAt?.substring(11, 16) || 'Just now'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {!n.isRead && (
                            <button
                              onClick={() => markNotificationAsRead(n.id)}
                              className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-100">
              {currentUser?.name?.substring(0, 2).toUpperCase() || 'VP'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {isSuperAdmin ? 'Platform Admin' : `${currentUser?.companyName || 'Mandi Business'}`}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {isSuperAdmin ? 'Super Admin' : (currentUser?.role || 'Staff')}
                </span>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
