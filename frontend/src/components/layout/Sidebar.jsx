import React from 'react';
import {
  Shield,
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  GitFork,
  BellRing,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  LogOut,
  ExternalLink,
  GitCompare,
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'tenders', label: 'Tenders', icon: FileSpreadsheet, path: '/tenders', badge: '1,248' },
  { id: 'bidders', label: 'Participating Companies', icon: Building2, path: '/bidders' },
  { id: 'patterns', label: 'Pattern Analysis', icon: GitCompare, path: '/patterns' },
  { id: 'risk-analysis', label: 'Risk Analysis', icon: GitFork, path: '/risk-analysis', badge: 'AI GNN' },
  { id: 'alerts', label: 'Alerts', icon: BellRing, path: '/alerts', badge: '12' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar({
  currentPath = 'dashboard',
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-primary-dark/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-brand-primary-dark text-white border-r border-brand-primary/40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-brand-primary-dark/80">
          <div
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-secondary to-brand-primary flex items-center justify-center text-brand-accent shadow-md flex-shrink-0 border border-brand-accent/30">
              <Shield className="w-5 h-5 text-brand-accent" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-white leading-tight">
                  Tender<span className="text-brand-accent">Guard</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-brand-accent/80 font-medium truncate">
                  Procurement Intel
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              System Navigation
            </div>
          )}

          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-brand-secondary text-white shadow-sm font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-brand-accent' : 'text-white/60 group-hover:text-white'
                  }`}
                />

                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.id === 'alerts'
                        ? 'bg-risk-high text-white'
                        : item.id === 'risk-analysis'
                        ? 'bg-brand-accent text-brand-primary-dark font-bold'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand-accent rounded-r-md" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-white/10 bg-black/15">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/70 truncate">GNN Engine Ready</span>
              </div>
              <span className="text-[10px] font-mono text-brand-accent/90 bg-white/10 px-1.5 py-0.5 rounded">
                v1.0
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
                title="System Operational"
              />
            </div>
          )}

          {/* Logout Action */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
