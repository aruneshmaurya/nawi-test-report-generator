import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
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
  X,
  Award,
  ExternalLink,
  Lock,
  CheckCircle2,
  Landmark
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
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: null },
    { label: 'Instruments Registry', path: '/instruments', icon: Scale, badge: null },
    { label: 'New Test Session', path: '/instruments/new', icon: PlusCircle, badge: 'New' },
    { label: 'Reports & Certificates', path: '/reports', icon: FileText, badge: null },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* 1. Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#081f38] text-white shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800/80`}
      >
        {/* Top Indian Tricolor Strip Accent */}
        <div className="h-1.5 w-full flex shrink-0">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {/* Brand Header with Official Government Logo */}
        <div className="p-4 pb-3 border-b border-slate-800/90 bg-[#06182c]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md border border-slate-300/40">
                <img
                  src="/doca_logo.png"
                  alt="Department of Consumer Affairs / उपभोक्ता मामले विभाग"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#FF9933]">
                  भारत सरकार • GOVT. OF INDIA
                </div>
                <div className="text-xs font-black tracking-tight text-white leading-tight">
                  Legal Metrology Portal
                </div>
                <div className="text-[10px] font-medium text-sky-300/80 truncate">
                  OIML R-76 Standards Engine
                </div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {/* Lab Scoping Credentials Card */}
          <div className="rounded-xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 p-3.5 border border-slate-700/80 shadow-inner">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                <Landmark className="h-3.5 w-3.5 text-sky-400" />
                <span>Authorized Facility</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE</span>
              </span>
            </div>
            
            <div className="text-xs font-bold text-white leading-snug line-clamp-2" title={user?.lab_name || 'National Metrology Laboratory (NML)'}>
              {user?.lab_name || 'National Metrology Laboratory (NML)'}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Accreditation:</span>
              <span className="font-mono font-bold text-sky-300 bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-800/50">
                {user?.lab_registration_no || 'NABL-OIML-2026-001'}
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
              Metrological Workflow
            </div>

            <nav className="space-y-1">
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
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-md shadow-sky-900/40 translate-x-1'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-sky-400 group-hover:bg-slate-700 group-hover:text-sky-300'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF9933] text-slate-950">
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Standards Compliance Badge Card */}
          <div className="rounded-xl bg-[#06182c]/80 p-3 border border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center space-x-1 text-[10px] font-bold text-amber-400">
              <Award className="h-3.5 w-3.5" />
              <span>OIML R-76 & ACT 2009</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Section 24 Standard Verification & Digital Seal Authentication
            </p>
          </div>
        </div>

        {/* User Info & Logout Footer */}
        <div className="border-t border-slate-800/90 bg-[#06182c] p-3.5">
          <div className="flex items-center justify-between mb-3 rounded-xl bg-slate-800/50 p-2.5 border border-slate-700/50">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0b2545] to-sky-600 text-xs font-bold text-white shadow-sm border border-sky-400/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <div className="truncate text-xs font-bold text-white">{user?.name || 'Metrology Officer'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] font-extrabold border-sky-500/50 bg-sky-950/60 text-sky-300 px-1.5 py-0.5">
              {user?.role || 'OFFICER'}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-center text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 border border-rose-900/40 rounded-lg h-8"
          >
            <LogOut className="mr-2 h-3.5 w-3.5 text-rose-400" />
            Secure Sign Out
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
            <div className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-xs md:text-sm font-bold text-slate-800">
                  National Legal Metrology Portal
                </span>
                <span className="hidden lg:inline text-xs text-slate-500 ml-2 border-l border-slate-300 pl-2">
                  OIML R-76-1:2006 & Legal Metrology Act, 2009 Standards Compliance
                </span>
              </div>
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

            <div className="hidden sm:flex items-center space-x-2 border-l border-slate-200 pl-4 text-xs text-slate-600 font-medium">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
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
