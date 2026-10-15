import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Server,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function Navbar({
  pageTitle = 'Dashboard',
  pageSubtitle = 'E-Procurement Intelligence & Fraud Risk Monitoring',
  onOpenMobileSidebar,
  onLogout,
  onNavigate,
  backendHealth,
  currentUser,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const demoNotifications = [
    {
      id: 1,
      title: 'High Risk Tender Flagged',
      time: '12m ago',
      unread: true,
      desc: 'TND-2024-9042 exhibits unusual bidding concentration (Demonstration)',
    },
    {
      id: 2,
      title: 'Database Synchronization',
      time: '1h ago',
      unread: true,
      desc: 'Central procurement dataset synced successfully.',
    },
    {
      id: 3,
      title: 'System Security Verification',
      time: '3h ago',
      unread: false,
      desc: 'Scheduled integrity audit completed with 0 exceptions.',
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-brand-border/80 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
          className="lg:hidden p-2 rounded-lg text-brand-charcoal hover:bg-brand-accent-light/60 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-brand-charcoal tracking-tight flex items-center gap-2">
            <span>{pageTitle}</span>
          </h1>
          <p className="hidden md:block text-xs text-brand-muted truncate max-w-xs xl:max-w-md">
            {pageSubtitle}
          </p>
        </div>
      </div>

      {/* Middle: Global Search Input */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-muted">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenders by ID, contractor, or category..."
            className="w-full pl-9 pr-4 py-1.5 text-xs lg:text-sm bg-brand-bg border border-brand-border rounded-lg text-brand-charcoal placeholder-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
          />
        </div>
      </div>

      {/* Right: Health Badge, Notifications, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Backend Health Badge */}
        <div
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            backendHealth?.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={
            backendHealth?.success
              ? `Backend Connected (v${backendHealth?.data?.version || '1.0'})`
              : 'Backend connection pending or offline'
          }
        >
          <Server className="w-3 h-3" />
          <span>
            {backendHealth?.success ? 'API Online' : 'API Standby'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendHealth?.success ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-brand-charcoal hover:bg-brand-accent-light/60 transition-colors"
          >
            <Bell className="w-5 h-5 text-brand-charcoal/80" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-risk-high ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-brand-border py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-brand-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-brand-charcoal">Notifications</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-primary text-white">
                    2 New
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-brand-muted hover:text-brand-charcoal text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-brand-border/30 max-h-72 overflow-y-auto">
                {demoNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 hover:bg-brand-bg/80 transition-colors ${
                      notif.unread ? 'bg-brand-accent-light/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-brand-charcoal">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-brand-muted whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-brand-muted leading-relaxed">
                      {notif.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-brand-border/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    if (onNavigate) onNavigate('alerts');
                  }}
                  className="text-xs font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  View All Alerts & Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="Admin Profile menu"
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-brand-accent-light/50 border border-transparent hover:border-brand-border/60 transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-primary text-brand-accent flex items-center justify-center font-bold text-xs shadow-sm uppercase">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'CA'}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-brand-charcoal leading-tight truncate max-w-[120px]">
                {currentUser?.name || 'Chief Auditor'}
              </span>
              <span className="text-[10px] text-brand-muted uppercase tracking-wider">
                {currentUser?.role || 'Administrator'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-brand-muted hidden xl:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-brand-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-brand-border/60">
                <div className="text-xs font-bold text-brand-charcoal">
                  {currentUser?.name || 'Chief Procurement Auditor'}
                </div>
                <div className="text-[11px] text-brand-muted truncate">
                  {currentUser?.email || 'admin@tenderguard.gov'}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-accent-light text-brand-primary uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  {currentUser?.role || 'Administrator'}
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-brand-charcoal hover:bg-brand-bg transition-colors"
                >
                  Settings & Preferences
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigate) onNavigate('reports');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-brand-charcoal hover:bg-brand-bg transition-colors"
                >
                  Audit Activity Logs
                </button>
              </div>

              <div className="pt-1 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
}
