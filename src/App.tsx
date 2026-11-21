import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { LoginPage } from './components/auth/LoginPage';
import { AcceptInvitationPage } from './components/auth/AcceptInvitationPage';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Super Admin views (5 sections)
import { OverviewTab } from './components/superAdmin/OverviewTab';
import { BusinessesTab } from './components/superAdmin/BusinessesTab';
import { AddBusinessModal } from './components/superAdmin/AddBusinessModal';
import { UsersTab } from './components/superAdmin/UsersTab';
import { SyncMonitoringTab } from './components/superAdmin/SyncMonitoringTab';
import { PlatformSettingsTab } from './components/superAdmin/PlatformSettingsTab';

// Customer Admin views (5 sections: Overview, My Company, Employees, Roles & Permissions, Settings)
import { CustomerOverviewTab } from './components/customerAdmin/CustomerOverviewTab';
import { MyCompanyTab } from './components/customerAdmin/MyCompanyTab';
import { EmployeesTab } from './components/customerAdmin/EmployeesTab';
import { InviteUserModal } from './components/customerAdmin/InviteUserModal';
import { RolesPermissionsTab } from './components/customerAdmin/RolesPermissionsTab';
import { CustomerSettingsTab } from './components/customerAdmin/CustomerSettingsTab';

export const AppContent: React.FC = () => {
  const { currentUser, currentTab } = useApp();

  // Modals accessible across tabs
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Check URL query for invitation token
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    } catch {
      return null;
    }
  });

  const handleClearToken = () => {
    setInviteToken(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname);
    } catch (e) {
      console.warn('Could not clean URL query', e);
    }
  };

  // If an invitation token is present in the URL, render the Accept Invitation page
  if (inviteToken) {
    return <AcceptInvitationPage token={inviteToken} onClearToken={handleClearToken} />;
  }

  // If not logged in, render the login page
  if (!currentUser) {
    return <LoginPage />;
  }

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <DashboardLayout>
      {/* Super Admin Experience: Overview, Businesses, User Management, Sync Monitoring, Settings */}
      {isSuperAdmin && (
        <>
          {currentTab === 'overview' && (
            <OverviewTab onOpenAddBusiness={() => setIsAddBusinessOpen(true)} />
          )}
          {currentTab === 'businesses' && (
            <BusinessesTab onOpenAddBusiness={() => setIsAddBusinessOpen(true)} />
          )}
          {currentTab === 'users' && <UsersTab />}
          {currentTab === 'sync' && <SyncMonitoringTab />}
          {currentTab === 'settings' && <PlatformSettingsTab />}

          {/* Add Business Modal for Super Admin */}
          <AddBusinessModal
            isOpen={isAddBusinessOpen}
            onClose={() => setIsAddBusinessOpen(false)}
          />
        </>
      )}

      {/* Customer Admin Experience: Overview, My Company, Employees, Roles & Permissions, Settings */}
      {!isSuperAdmin && (
        <>
          {currentTab === 'overview' && (
            <CustomerOverviewTab onOpenInvite={() => setIsInviteModalOpen(true)} />
          )}
          {currentTab === 'company' && <MyCompanyTab />}
          {(currentTab === 'employees' || currentTab === 'users') && (
            <EmployeesTab onOpenInvite={() => setIsInviteModalOpen(true)} />
          )}
          {currentTab === 'roles' && <RolesPermissionsTab />}
          {currentTab === 'settings' && <CustomerSettingsTab />}

          {/* Invite User Modal for Customer Admin */}
          <InviteUserModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return <AppContent />;
}
