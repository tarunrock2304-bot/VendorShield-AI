import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../App';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

const roleNavItems = {
  admin: [
    { path: '/dashboard', label: 'Executive Dashboard' },
    { path: '/vendors', label: 'Vendor Management' },
    { path: '/risk-assessment', label: 'AI Risk Assessment' },
    { path: '/compliance', label: 'Compliance & Certification' },
    { path: '/threats', label: 'Threat & Monitoring Center' },
    { path: '/remediation', label: 'Remediation Tracker' },
    { path: '/user-management', label: 'User Management' },
  ],
  analyst: [
    { path: '/dashboard', label: 'Executive Dashboard' },
    { path: '/vendors', label: 'Vendor Management' },
    { path: '/risk-assessment', label: 'AI Risk Assessment' },
    { path: '/compliance', label: 'Compliance & Certification' },
    { path: '/threats', label: 'Threat & Monitoring Center' },
    { path: '/remediation', label: 'Remediation Tracker' },
  ],
  auditor: [
    { path: '/dashboard', label: 'Executive Dashboard' },
    { path: '/compliance', label: 'Compliance & Certification' },
    { path: '/reports', label: 'Reports' },
  ],
} as const;

type NotificationItem = {
  id: string;
  title: string;
  type: string;
  detail: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
};

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const navItems = roleNavItems[user?.role ?? 'admin'];
  const sidebarWidthClass = sidebarCollapsed ? 'w-20' : 'w-80';
  const mainContentMarginClass = sidebarCollapsed ? 'ml-20' : 'ml-80';

  useEffect(() => {
    const fetchNotifications = async () => {
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const [contractsResult, certsResult, vendorsResult] = await Promise.all([
        supabase
          .from('contracts')
          .select('id, contract_name, end_date')
          .in('status', ['active', 'pending_renewal'])
          .lte('end_date', sixtyDaysFromNow.toISOString())
          .order('end_date', { ascending: true }),
        supabase
          .from('compliance_certifications')
          .select('id, standard, expiry_date')
          .neq('status', 'expired')
          .lte('expiry_date', ninetyDaysFromNow.toISOString())
          .order('expiry_date', { ascending: true }),
        supabase
          .from('vendors')
          .select('id, name, overall_risk_score, risk_level')
          .in('risk_level', ['high', 'critical'])
          .order('overall_risk_score', { ascending: false })
          .limit(5),
      ]);

      const contractNotifications = (contractsResult.data || []).map((contract) => ({
        id: `contract-${contract.id}`,
        title: contract.contract_name || 'Expiring Contract',
        type: 'Expiring Contracts',
        detail: 'Contract requires review',
        date: contract.end_date ? format(new Date(contract.end_date), 'MMM d, yyyy') : '-',
        severity: 'high' as const,
      }));

      const certificateNotifications = (certsResult.data || []).map((cert) => ({
        id: `cert-${cert.id}`,
        title: cert.standard || 'Expiring Certificate',
        type: 'Expiring Certificates',
        detail: 'Certification requires renewal',
        date: cert.expiry_date ? format(new Date(cert.expiry_date), 'MMM d, yyyy') : '-',
        severity: 'medium' as const,
      }));

      const vendorNotifications = (vendorsResult.data || []).map((vendor) => ({
        id: `vendor-${vendor.id}`,
        title: vendor.name || 'High-Risk Vendor',
        type: 'High-Risk Vendors',
        detail: `Risk level: ${String(vendor.risk_level || 'high').toUpperCase()} | Score: ${vendor.overall_risk_score ?? 0}`,
        date: format(new Date(), 'MMM d, yyyy'),
        severity: 'high' as const,
      }));

      setNotifications([...contractNotifications, ...certificateNotifications, ...vendorNotifications]);
    };

    fetchNotifications();
  }, []);

  const notificationCount = useMemo(() => notifications.length, [notifications]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const openProfileCard = () => {
    setShowProfileMenu(false);
    setShowProfileCard(true);
  };

  const closeProfileCard = () => {
    setShowProfileCard(false);
  };

  const toggleNotifications = () => {
    setShowProfileMenu(false);
    setShowNotifications((current) => !current);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#0c1222] text-white z-50 transition-all duration-300 ${sidebarWidthClass}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary-400" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                VendorShield AI
              </span>
            </div>
          )}
          {sidebarCollapsed && <ShieldCheck className="w-8 h-8 text-primary-400 mx-auto" />}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5 text-slate-400" />
            ) : (
              <X className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${
                  sidebarCollapsed ? 'justify-center px-2' : 'px-4'
                }`
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile Card */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0c1222]">
            <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.full_name || 'Admin User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {sidebarCollapsed && user && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${mainContentMarginClass}`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="h-16 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              {/* Search removed as requested */}
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Notifications</p>
                          <p className="text-xs text-slate-500">Expiring items and risk alerts</p>
                        </div>
                        <span className="badge badge-danger">{notificationCount} total</span>
                      </div>

                      <div className="max-h-[24rem] overflow-y-auto p-3 space-y-3">
                        {notifications.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            No notifications found.
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">{item.type}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                                  <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                                </div>
                                <div className={`badge ${item.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                                  {item.date}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-700">
                      {user?.full_name || 'Admin User'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.department || 'Security Operations'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <button
                        onClick={openProfileCard}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </button>
                      <hr className="my-2 border-slate-200" />
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {showProfileCard && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-7">
              <button
                type="button"
                onClick={closeProfileCard}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close profile card"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Profile Details</h2>
                  <p className="text-sm text-slate-500">Signed in as {user?.role?.replace('_', ' ') || 'user'}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide">Username</p>
                  <p className="mt-1 font-medium text-slate-900">{user?.full_name || '-'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide">Email</p>
                  <p className="mt-1 font-medium text-slate-900 break-all">{user?.email || '-'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide">Password</p>
                  <p className="mt-1 font-medium text-slate-900 break-all">{user?.password || '-'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide">Role</p>
                  <p className="mt-1 font-medium text-slate-900 capitalize">{user?.role || '-'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeProfileCard}
                className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
