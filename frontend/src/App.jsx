import React, { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Tenders from './pages/Tenders';
import Companies from './pages/Companies';
import PatternAnalysis from './pages/PatternAnalysis';
import RiskAnalysis from './pages/RiskAnalysis';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { fetchHealth } from './services/api';

const PAGE_META = {
  dashboard: {
    title: 'Platform Dashboard',
    subtitle: 'Smart Tender Fraud Risk Detection & Real-Time E-Procurement Monitoring',
  },
  tenders: {
    title: 'Tender Registry',
    subtitle: 'Central repository of procurement notices and contract specifications',
  },
  bidders: {
    title: 'Participating Companies Directory',
    subtitle: 'Profiles, corporate connections, and bidding syndication records',
  },
  patterns: {
    title: 'Pattern Analysis',
    subtitle: 'Review historical bidding relationships and unusual tender patterns before AI risk analysis',
  },
  'risk-analysis': {
    title: 'AI Risk Analysis',
    subtitle: 'Network topology and multi-factor suspicious bidding pattern scoring',
  },
  alerts: {
    title: 'Oversight Alerts',
    subtitle: 'Active suspicious tender alerts requiring auditor triage and case review',
  },
  reports: {
    title: 'Investigation Reports',
    subtitle: 'Forensic procurement audit reports, risk dossiers, and printable PDF exports',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Platform parameters, database connections, and audit configurations',
  },
};

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Navigation & UI state
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Backend Health check state
  const [backendHealth, setBackendHealth] = useState(null);

  const checkHealth = async () => {
    const res = await fetchHealth();
    setBackendHealth(res);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // 1. Initial Authentication Check Loading Splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center text-brand-accent shadow-lg mb-4 animate-pulse">
          <Shield className="w-8 h-8 text-brand-accent" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-charcoal">
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
          <span>Verifying TenderGuard Security Credentials...</span>
        </div>
        <p className="text-xs text-brand-muted mt-1.5">
          Connecting to cryptographic token authorization service
        </p>
      </div>
    );
  }

  // 2. Strict Protected Route Enforcement: Unauthenticated users are redirected to Login
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. Authenticated Dashboard & Protected Routes
  const activeMeta = PAGE_META[currentPath] || PAGE_META.dashboard;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-charcoal flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={(path) => setCurrentPath(path)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          pageTitle={activeMeta.title}
          pageSubtitle={activeMeta.subtitle}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={logout}
          onNavigate={(path) => setCurrentPath(path)}
          backendHealth={backendHealth}
          currentUser={user}
        />

        {/* Dynamic Protected Route Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentPath === 'dashboard' && (
            <Dashboard onNavigate={(path) => setCurrentPath(path)} />
          )}
          {currentPath === 'tenders' && <Tenders />}
          {currentPath === 'bidders' && <Companies />}
          {currentPath === 'patterns' && <PatternAnalysis />}
          {currentPath === 'risk-analysis' && <RiskAnalysis />}
          {currentPath === 'alerts' && <Alerts />}
          {currentPath === 'reports' && <Reports />}
          {currentPath === 'settings' && (
            <Settings
              backendHealth={backendHealth}
              onRefreshHealth={checkHealth}
            />
          )}
        </main>

        {/* Standardized Dashboard Footer */}
        <footer className="mt-auto border-t border-brand-border/60 bg-white py-4 px-6 text-xs text-brand-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-primary">TenderGuard</span>
            <span>•</span>
            <span>Authenticated Session Active</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-brand-accent-light text-brand-primary">
              {user?.email || 'admin@tenderguard.gov'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="text-risk-high hover:underline font-medium"
            >
              Sign Out Session
            </button>
            <span>•</span>
            <span className="text-[11px] text-brand-muted/70">
              Graph Neural Network E-Procurement Surveillance
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
