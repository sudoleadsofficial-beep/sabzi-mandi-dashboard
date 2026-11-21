import React from 'react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  RefreshCw, 
  Settings, 
  Store, 
  ShieldCheck, 
  X,
  Radio,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentTab, setCurrentTab, logout } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Navigation Items for Super Admin (5 items)
  const superAdminNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'sync', label: 'Sync Monitoring', icon: RefreshCw },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Navigation Items for Customer Admin (ONLY 5 items per requirement)
  const customerAdminNav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'company', label: 'My Company', icon: Store },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentNav = isSuperAdmin ? superAdminNav : customerAdminNav;

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200/90 z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between">
            <BrandLogo />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Workspace Pill */}
          <div className="px-4 pt-4 pb-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Active Workspace
              </span>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {isSuperAdmin ? 'SudoLeads Master Control' : currentUser?.companyName}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs shadow-emerald-800/20 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Info & System Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Hostinger Gateway</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
