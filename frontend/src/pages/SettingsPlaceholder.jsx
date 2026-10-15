import React, { useState } from 'react';
import {
  Settings,
  Database,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import DemoBanner from '../components/common/DemoBanner';
import { fetchHealth } from '../services/api';

export default function SettingsPlaceholder({ backendHealth, onRefreshHealth }) {
  const [activeTab, setActiveTab] = useState('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState(null);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetchHealth();
      if (res.success) {
        setDbTestResult({
          success: res.data?.database?.connected,
          message: res.data?.database?.message || 'Database status retrieved.',
          status: res.data?.database?.status,
        });
      } else {
        setDbTestResult({
          success: false,
          message: res.error || 'Failed to communicate with API server.',
          status: 'unreachable',
        });
      }
    } catch (e) {
      setDbTestResult({
        success: false,
        message: e.message,
        status: 'error',
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs = [
    { id: 'general', label: 'System Configuration', icon: Settings },
    { id: 'database', label: 'Database & Infrastructure', icon: Database },
    { id: 'notifications', label: 'Audit & Alerts', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <DemoBanner />

      <PageHeader
        title="Administrative Platform Settings"
        subtitle="Configure platform parameters, database connectivity, and procurement oversight rules."
        category="System Administration"
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={Save}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        }
      />

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Platform settings updated successfully (Simulated).</span>
        </div>
      )}

      {/* Settings Layout with Tab navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Tabs */}
        <div className="space-y-1 bg-white p-2 rounded-xl border border-brand-border/80 shadow-card h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-charcoal hover:bg-brand-accent-light/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-accent' : 'text-brand-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-3 bg-white rounded-xl border border-brand-border/80 p-6 shadow-card space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider">
                  General System Parameters
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Core identity and runtime configurations for TenderGuard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Application Name"
                  defaultValue="TenderGuard"
                  disabled
                  helperText="Registered platform branding"
                />
                <Input
                  label="Deployment Environment"
                  defaultValue="Development / Production Preview"
                  disabled
                  helperText="Managed via backend .env configuration"
                />
                <Input
                  label="API Version Prefix"
                  defaultValue="/api/v1"
                  disabled
                  helperText="REST API routing version"
                />
                <Input
                  label="GNN Inference Cadence"
                  defaultValue="On-Demand / Scheduled"
                  disabled
                  helperText="Configurable via AI Risk Analysis settings"
                />
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider">
                  PostgreSQL Infrastructure Status
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Manage persistent storage and connectivity with PostgreSQL.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-brand-primary" />
                    <span className="text-sm font-bold text-brand-charcoal">
                      Backend Server & DB Health
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={RefreshCw}
                    isLoading={isTestingDb}
                    onClick={handleTestDatabase}
                  >
                    Test Connectivity
                  </Button>
                </div>

                <div className="text-xs space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">API Connection:</span>
                    <span className="font-semibold text-brand-primary">
                      {backendHealth?.success ? 'Connected (http://localhost:8000)' : 'Awaiting Server'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Database Engine:</span>
                    <span className="font-mono text-[11px]">SQLAlchemy 2.0 (PostgreSQL)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Environment Target:</span>
                    <span className="font-mono text-[11px]">tenderguard_db @ localhost:5432</span>
                  </div>
                </div>

                {dbTestResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-xs border ${
                      dbTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="font-semibold">
                      Status: {dbTestResult.status}
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-90 break-words">
                      {dbTestResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider">
                  Auditor Notification Channels
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Configure real-time alerts for high-risk procurement indicators.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-brand-border cursor-pointer hover:bg-brand-bg">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      High-Risk Tender Escalations
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Dispatch immediate notices when collusion scores exceed predefined confidence thresholds.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-brand-border cursor-pointer hover:bg-brand-bg">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-brand-charcoal block">
                      Weekly Integrity Summary Dossier
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      Generate digest reports for chief procurement directors every Monday at 08:00 UTC.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider">
                  Security & Access Policy
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Governance baselines for procurement auditors.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-brand-accent-light/40 border border-brand-accent/40 text-xs text-brand-muted space-y-2">
                <p className="font-semibold text-brand-primary">
                  Authentication Configuration:
                </p>
                <p className="text-[11px] leading-relaxed">
                  TenderGuard uses enterprise JWT authentication with Role-Based Access Control (RBAC) supporting Auditors, Investigators, and Chief Observers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
