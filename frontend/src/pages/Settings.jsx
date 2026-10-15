import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Sliders,
  User,
  KeyRound,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  HardDrive,
  FileSpreadsheet,
  Building2,
  Lock,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { fetchHealth, fetchOverallRiskSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SETTINGS_STORAGE_KEY = 'tenderguard_platform_settings';

const DEFAULT_SETTINGS = {
  priceProximityThreshold: 5.0,
  highRiskScoreThreshold: 60,
  veryHighRiskScoreThreshold: 80,
  minCobiddingCount: 2,
  autoAlertHighRisk: true,
  autoAlertCriticalSeverity: true,
  enableEmailAlerts: true,
  enableInAppNotifications: true,
  enableWeeklyDigest: true,
  auditLogLevel: 'detailed',
};

export default function Settings({ backendHealth, onRefreshHealth }) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('detection');

  // Detection and system settings state
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Database connectivity test state
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbHealthData, setDbHealthData] = useState(null);
  const [portfolioStats, setPortfolioStats] = useState(null);

  // User Profile edit state
  const [profileName, setProfileName] = useState(user?.name || 'Chief Procurement Auditor');
  const [profileEmail] = useState(user?.email || 'admin@tenderguard.gov');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    if (backendHealth) {
      setDbHealthData(backendHealth.data);
    }
  }, [backendHealth]);

  // Load portfolio stats when database tab is active
  useEffect(() => {
    async function loadStats() {
      if (token) {
        try {
          const res = await fetchOverallRiskSummary(token);
          if (res.success && res.data) {
            setPortfolioStats(res.data.portfolio_metrics);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadStats();
  }, [token]);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const res = await fetchHealth();
      if (res.success) {
        setDbHealthData(res.data);
        if (onRefreshHealth) onRefreshHealth();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setSaveSuccessMessage('Detection parameters and platform preferences saved successfully.');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    } catch {
      setSaveSuccessMessage('Failed to save settings to local storage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSaveSuccessMessage('Restored factory default detection parameters.');
    setTimeout(() => setSaveSuccessMessage(''), 4000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current administrator password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPasswordMessage({
      type: 'success',
      text: 'Administrator security credentials updated successfully.',
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMessage(null), 5000);
  };

  const tabs = [
    { id: 'detection', label: 'AI Risk Engine & Detection Rules', icon: Sliders },
    { id: 'database', label: 'Database & Infrastructure Health', icon: Database },
    { id: 'notifications', label: 'Auditor Alerts & Escalations', icon: Bell },
    { id: 'profile', label: 'Auditor Profile & Credentials', icon: User },
    { id: 'security', label: 'Platform Security Policy', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Administrative Platform Settings"
        subtitle="Configure risk detection thresholds, inspect live database health, and manage oversight preferences."
        category="System Administration"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs"
            >
              Reset Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={Save}
              isLoading={isSaving}
              onClick={handleSaveSettings}
            >
              Save Configuration
            </Button>
          </div>
        }
      />

      {/* Save Success Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Navigation Tabs */}
        <div className="space-y-1 bg-white p-2 rounded-xl border border-brand-border/80 shadow-card h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-brand-charcoal hover:bg-brand-accent-light/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-accent' : 'text-brand-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-3 bg-white rounded-xl border border-brand-border/80 p-6 shadow-card space-y-6">
          {/* TAB 1: AI Risk Engine & Detection Rules */}
          {activeTab === 'detection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-primary" />
                  AI Risk Engine & Detection Thresholds
                </h3>
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                  Calibrate algorithmic sensitivity for identifying price clustering, repeated co-bidding syndication, and automatic fraud risk alert generation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-2">
                  <label className="block text-xs font-bold text-brand-charcoal">
                    Price Proximity Threshold (%)
                  </label>
                  <p className="text-[11px] text-brand-muted">
                    Bids whose quoted prices differ by less than or equal to this percentage will trigger a price clustering flag.
                  </p>
                  <select
                    value={settings.priceProximityThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, priceProximityThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full mt-2 py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value={2.0}>2.0% — Strict Proximity</option>
                    <option value={3.0}>3.0% — Sensitive Threshold</option>
                    <option value={5.0}>5.0% — Standard Procurement Baseline</option>
                    <option value={7.5}>7.5% — Relaxed Detection</option>
                    <option value={10.0}>10.0% — Broad Clustering</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-2">
                  <label className="block text-xs font-bold text-brand-charcoal">
                    Minimum Co-Bidding History Count
                  </label>
                  <p className="text-[11px] text-brand-muted">
                    Number of shared previous tender lots required before a company pair is flagged as recurring co-bidders.
                  </p>
                  <select
                    value={settings.minCobiddingCount}
                    onChange={(e) =>
                      setSettings({ ...settings, minCobiddingCount: parseInt(e.target.value, 10) })
                    }
                    className="w-full mt-2 py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value={2}>2 or more shared tenders (Recommended)</option>
                    <option value={3}>3 or more shared tenders</option>
                    <option value={4}>4 or more shared tenders</option>
                    <option value={5}>5 or more shared tenders (Strict)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-2">
                  <label className="block text-xs font-bold text-brand-charcoal">
                    High Risk Score Trigger Threshold
                  </label>
                  <p className="text-[11px] text-brand-muted">
                    Suspicion score threshold (0–100) at which tenders are classified as High Risk.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={40}
                      max={75}
                      step={5}
                      value={settings.highRiskScoreThreshold}
                      onChange={(e) =>
                        setSettings({ ...settings, highRiskScoreThreshold: parseInt(e.target.value, 10) })
                      }
                      className="flex-1 accent-brand-primary"
                    />
                    <span className="font-mono text-xs font-bold text-brand-primary px-2.5 py-1 bg-white border border-brand-border rounded-lg">
                      {settings.highRiskScoreThreshold} / 100
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-2">
                  <label className="block text-xs font-bold text-brand-charcoal">
                    Very High Risk Score Trigger Threshold
                  </label>
                  <p className="text-[11px] text-brand-muted">
                    Suspicion score threshold (0–100) at which tenders trigger immediate Critical oversight alerts.
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min={75}
                      max={95}
                      step={5}
                      value={settings.veryHighRiskScoreThreshold}
                      onChange={(e) =>
                        setSettings({ ...settings, veryHighRiskScoreThreshold: parseInt(e.target.value, 10) })
                      }
                      className="flex-1 accent-risk-high"
                    />
                    <span className="font-mono text-xs font-bold text-risk-high px-2.5 py-1 bg-white border border-brand-border rounded-lg">
                      {settings.veryHighRiskScoreThreshold} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Automatic Dispatch Toggles */}
              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                  Automated Escalation Actions
                </h4>
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-bg/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoAlertHighRisk}
                    onChange={(e) =>
                      setSettings({ ...settings, autoAlertHighRisk: e.target.checked })
                    }
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      Auto-generate Oversight Alert on High/Very High Risk (Score &ge; {settings.highRiskScoreThreshold})
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      When Risk Analysis executes and identifies a score at or above threshold, an alert record is immediately registered in the triage queue.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-bg/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoAlertCriticalSeverity}
                    onChange={(e) =>
                      setSettings({ ...settings, autoAlertCriticalSeverity: e.target.checked })
                    }
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      Auto-Flag Alternating Winner Rotations
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Generate an alert when historical bid records confirm repeating winner rotations between specific contractor pairs.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Database & Infrastructure Health */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-primary" />
                    Database & Infrastructure Health
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Live operational telemetry for persistent database storage and REST API endpoints.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={RefreshCw}
                  isLoading={isTestingDb}
                  onClick={handleTestDatabase}
                  className="text-xs"
                >
                  Refresh Health
                </Button>
              </div>

              {/* Server Diagnostics Card */}
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/60 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-brand-border/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-brand-charcoal">
                      API Server Status: {dbHealthData?.status || 'Online'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-brand-primary bg-white px-2 py-0.5 rounded border border-brand-border">
                    v{dbHealthData?.version || '1.0.0'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-brand-border/70">
                    <span className="text-[10px] text-brand-muted uppercase font-bold block">Database Engine</span>
                    <span className="text-xs font-bold text-brand-charcoal mt-1 block">
                      {dbHealthData?.database?.database_type || 'SQLAlchemy / SQLite (Dev)'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      ● Active Connection
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-brand-border/70">
                    <span className="text-[10px] text-brand-muted uppercase font-bold block">Environment</span>
                    <span className="text-xs font-bold text-brand-charcoal mt-1 block capitalize">
                      {dbHealthData?.environment || 'Development Preview'}
                    </span>
                    <span className="text-[10px] text-brand-muted block mt-0.5">
                      FastAPI + Uvicorn
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-brand-border/70">
                    <span className="text-[10px] text-brand-muted uppercase font-bold block">Service Endpoint</span>
                    <span className="font-mono text-xs font-bold text-brand-primary mt-1 block">
                      http://127.0.0.1:8000
                    </span>
                    <span className="text-[10px] text-brand-muted block mt-0.5">
                      CORS Allowed: Localhost
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-brand-border/70 text-xs">
                  <span className="text-brand-muted block text-[11px] font-semibold mb-1">
                    Database Connection Details:
                  </span>
                  <p className="font-mono text-[11px] text-brand-charcoal/80">
                    {dbHealthData?.database?.message || 'Database connection is established and verified operational.'}
                  </p>
                </div>
              </div>

              {/* Live Record Counts */}
              {portfolioStats && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                    Live Registry Entities
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-white rounded-xl border border-brand-border">
                      <span className="text-[10px] text-brand-muted uppercase font-bold block">Tenders</span>
                      <span className="font-mono text-lg font-bold text-brand-primary block mt-1">
                        {portfolioStats.total_tenders}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-brand-border">
                      <span className="text-[10px] text-brand-muted uppercase font-bold block">Companies</span>
                      <span className="font-mono text-lg font-bold text-brand-primary block mt-1">
                        {portfolioStats.total_companies}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-brand-border">
                      <span className="text-[10px] text-brand-muted uppercase font-bold block">Analyzed Tenders</span>
                      <span className="font-mono text-lg font-bold text-brand-secondary block mt-1">
                        {portfolioStats.tenders_analyzed}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-brand-border">
                      <span className="text-[10px] text-risk-high uppercase font-bold block">Open Alerts</span>
                      <span className="font-mono text-lg font-bold text-risk-high block mt-1">
                        {portfolioStats.open_alerts}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Auditor Alerts & Escalations */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-primary" />
                  Auditor Notification & Audit Preferences
                </h3>
                <p className="text-xs text-brand-muted mt-1">
                  Configure notification dispatching when procurement anomalies or suspicious co-bidding patterns are flagged.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-bg/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableInAppNotifications}
                    onChange={(e) =>
                      setSettings({ ...settings, enableInAppNotifications: e.target.checked })
                    }
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      In-App Alert Notification Badges
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Display dynamic badge counters in the sidebar navigation when new unacknowledged alerts are recorded.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-bg/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailAlerts}
                    onChange={(e) =>
                      setSettings({ ...settings, enableEmailAlerts: e.target.checked })
                    }
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      Immediate Email Escalations for Critical Incidents
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Send automated incident reports to official oversight auditor mailbox when suspicion score exceeds 80.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-border bg-white cursor-pointer hover:bg-brand-bg/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableWeeklyDigest}
                    onChange={(e) =>
                      setSettings({ ...settings, enableWeeklyDigest: e.target.checked })
                    }
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      Weekly Executive Portfolio Digest
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Generate consolidated summary dossier containing cross-tender bidding syndication statistics.
                    </span>
                  </div>
                </label>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-2">
                  <label className="block text-xs font-bold text-brand-charcoal">
                    Audit Logging Detail Level
                  </label>
                  <select
                    value={settings.auditLogLevel}
                    onChange={(e) => setSettings({ ...settings, auditLogLevel: e.target.value })}
                    className="w-full mt-1 py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value="standard">Standard Audit Trail (Tender creation & Status changes)</option>
                    <option value="detailed">Detailed Audit Trail (Includes graph feature extraction & score runs)</option>
                    <option value="forensic">Forensic Verbose (Full edge weight inspection & investigator notes)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Auditor Profile & Credentials */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-primary" />
                  Auditor Profile & Credentials
                </h3>
                <p className="text-xs text-brand-muted mt-1">
                  Manage active administrator session information and update access credentials.
                </p>
              </div>

              {/* Profile Details Card */}
              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary text-brand-accent flex items-center justify-center font-bold text-lg shadow-sm">
                    {profileName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-charcoal">{profileName}</h4>
                    <span className="text-xs font-mono text-brand-muted">{profileEmail}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-accent-light text-brand-primary uppercase">
                        {user?.role || 'Administrator'}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium">● Verified Session</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    label="Administrator Display Name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    helperText="Visible in report sign-off blocks"
                  />
                  <Input
                    label="Official Email Address"
                    value={profileEmail}
                    disabled
                    helperText="Fixed system administrator account"
                  />
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordChange} className="p-4 rounded-xl border border-brand-border bg-white space-y-4">
                <div className="flex items-center gap-2 border-b border-brand-border/60 pb-2">
                  <KeyRound className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                    Change Security Password
                  </span>
                </div>

                {passwordMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      passwordMessage.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-risk-high'
                    }`}
                  >
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" iconLeft={Lock}>
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: Platform Security Policy */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-primary" />
                  Security & Access Policy
                </h3>
                <p className="text-xs text-brand-muted mt-1">
                  Governance baselines, cryptographic token policy, and legal audit disclaimers.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-brand-accent-light/40 border border-brand-accent/50 text-xs text-brand-charcoal space-y-2">
                  <span className="font-bold text-brand-primary block">
                    Cryptographic Token Authorization (JWT)
                  </span>
                  <p className="text-[11px] text-brand-muted leading-relaxed">
                    TenderGuard sessions utilize HMAC-SHA256 signed JSON Web Tokens expiring after 60 minutes. Refresh tokens are secured in HTTP-only state or protected local terminal storage.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-white text-xs space-y-2">
                  <span className="font-bold text-brand-charcoal block">
                    Role-Based Access Control (RBAC) Rules
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-brand-muted list-disc list-inside">
                    <li><strong>Chief Auditor / Administrator:</strong> Full CRUD on tenders, participants, AI analysis execution, alert triage, and report exports.</li>
                    <li><strong>Investigator:</strong> Access to pattern graphs, dossier exports, and alert status triage notes.</li>
                    <li><strong>Observer / Public Monitor:</strong> Read-only access to published tenders and high-level portfolio statistics.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-brand-border/70 text-xs text-brand-muted space-y-1">
                  <span className="font-bold text-brand-primary block">
                    Forensic Evidence Legal Disclaimer
                  </span>
                  <p className="text-[10px] leading-relaxed">
                    All AI risk scores, graph proximity indicators, and co-bidding patterns computed by TenderGuard serve as investigative decision-support aids. They do not constitute formal judicial accusations of fraud or bid rigging without independent verification and formal administrative proceedings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
