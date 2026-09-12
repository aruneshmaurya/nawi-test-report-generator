import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Scale,
  LayoutDashboard,
  FileText,
  PlusCircle,
  LogOut,
  Bell,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await apiClient.get('/notifications');
        if (res.data?.success && res.data?.data?.notifications) {
          const unread = res.data.data.notifications.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch {
        // non-blocking
      }
    };
    fetchNotifs();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Instruments', path: '/instruments', icon: Scale },
    { label: 'New Instrument', path: '/instruments/new', icon: PlusCircle },
    { label: 'Reports & Certificates', path: '/reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* 1. Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0b2545] text-white shadow-xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-white shadow-md">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider text-white">NAWI OIML R-76</div>
              <div className="text-[10px] text-slate-400 font-medium">Legal Metrology Portal</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Lab Scoping Banner */}
        <div className="mx-4 my-4 rounded-lg bg-slate-800/80 p-3 border border-slate-700/60">
          <div className="flex items-center space-x-2 text-xs text-slate-300 mb-1">
            <Building2 className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">Assigned Laboratory</span>
          </div>
          <div className="text-xs font-medium text-white truncate" title={user?.lab_name || 'Central Metrology Lab'}>
            {user?.lab_name || 'Central Metrology Lab'}
          </div>
          {user?.lab_registration_no && (
            <div className="text-[10px] text-sky-300 font-mono mt-0.5">
              Reg: {user.lab_registration_no}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-sky-300">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="truncate text-xs font-semibold text-white">{user?.name || 'Authorized Tester'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-sky-300 px-1.5 py-0">
              {user?.role || 'TESTER'}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-xs text-rose-300 hover:bg-rose-950/40 hover:text-rose-200"
          >
            <LogOut className="mr-2 h-4 w-4 text-rose-400" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* 2. Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top App Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-600 hover:text-slate-900 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2 text-sm text-slate-600 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">OIML R-76-1:2006 & Legal Metrology Act 2009 Standards Compliance</span>
            </div>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => navigate('/dashboard')}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden sm:flex items-center space-x-2 border-l border-slate-200 pl-4 text-xs text-slate-500">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
