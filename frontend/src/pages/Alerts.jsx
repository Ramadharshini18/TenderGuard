import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  CheckSquare,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAlerts, updateAlertStatus } from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function Alerts() {
  const { token, user } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Modal: Triage & Review
  const [activeAlert, setActiveAlert] = useState(null);
  const [triageStatus, setTriageStatus] = useState('Under Review');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAlerts(
        {
          status_filter: statusFilter,
          severity_filter: severityFilter,
        },
        token
      );
      if (res.success) {
        setAlerts(res.data || []);
      } else {
        setError(res.error || 'Failed to retrieve active alerts.');
      }
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter, token]);

  const handleOpenTriage = (alertItem) => {
    setActiveAlert(alertItem);
    setTriageStatus(alertItem.status === 'New' ? 'Under Review' : alertItem.status);
    setReviewNotes(alertItem.review_notes || '');
  };

  const handleSaveTriage = async () => {
    if (!activeAlert) return;
    setIsUpdating(true);
    try {
      const res = await updateAlertStatus(
        activeAlert.id,
        {
          status: triageStatus,
          review_notes: reviewNotes,
        },
        token
      );
      if (res.success) {
        setActiveAlert(null);
        loadAlerts();
      } else {
        alert(res.error || 'Failed to update alert review status.');
      }
    } catch (err) {
      alert(err.message || 'Network error.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Oversight Alerts"
        subtitle="Automated alerts identifying high-suspicion bidding patterns and potential cartel coordination."
        category="Auditor Triage & Escalation Queue"
        actions={
          <Button variant="outline" size="sm" iconLeft={CheckSquare} onClick={loadAlerts}>
            Refresh Alerts
          </Button>
        }
      />

      {/* Filters Toolbar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-brand-muted font-medium">Alert Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-brand-muted font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="All">All Severities</option>
              <option value="Very High">Very High</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
            </select>
          </div>
        </div>

        <span className="text-brand-muted">
          Total active alerts: <strong className="text-brand-charcoal font-mono">{alerts.length}</strong>
        </span>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Retrieving active risk alerts from database..." />
        ) : error ? (
          <ErrorState title="Failed to Load Alerts" message={error} onRetry={loadAlerts} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No alerts found"
            description="No procurement risk alerts meet the current filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-brand-charcoal">
              <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                <tr>
                  <th className="px-4 py-3.5">Alert &amp; Tender</th>
                  <th className="px-4 py-3.5">Pattern Flagged</th>
                  <th className="px-4 py-3.5 text-center">Severity</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5">Reviewer</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-xs">
                {alerts.map((alt) => (
                  <tr key={alt.id} className="hover:bg-brand-bg/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-brand-charcoal">{alt.title}</div>
                      <div className="font-mono text-[10px] text-brand-primary mt-0.5">
                        {alt.tender_code} — {alt.tender_title}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-brand-charcoal max-w-xs truncate" title={alt.description}>
                      {alt.pattern_type}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          alt.severity === 'Very High'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : alt.severity === 'High'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {alt.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          alt.status === 'New'
                            ? 'bg-rose-100 text-rose-900'
                            : alt.status === 'Under Review'
                            ? 'bg-amber-100 text-amber-900'
                            : alt.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {alt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-brand-muted whitespace-nowrap">
                      {alt.reviewed_by ? (
                        <span className="font-medium text-brand-charcoal">{alt.reviewed_by}</span>
                      ) : (
                        '— Unassigned'
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTriage(alt)}
                        className="text-xs py-1"
                      >
                        Triage Alert
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Triage Modal */}
      {activeAlert && (
        <Modal
          isOpen={!!activeAlert}
          onClose={() => setActiveAlert(null)}
          title={`Triage Alert #${activeAlert.id}: ${activeAlert.tender_code}`}
          subtitle="Investigative review and disposition queue"
          maxWidth="max-w-xl"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveAlert(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTriage}
                isLoading={isUpdating}
              >
                Save Review Disposition
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Alert Summary Box */}
            <div className="p-3.5 rounded-xl bg-brand-bg border border-brand-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-charcoal">{activeAlert.title}</span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900">
                  {activeAlert.severity}
                </span>
              </div>
              <p className="text-[11px] text-brand-muted leading-relaxed">
                {activeAlert.description}
              </p>
            </div>

            {/* Supporting Evidence List if available */}
            {activeAlert.evidence_details?.explanations && (
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] text-brand-muted block">
                  Supporting Evidence:
                </span>
                <ul className="space-y-1 text-[11px] text-brand-charcoal pl-2">
                  {activeAlert.evidence_details.explanations.map((exp, i) => (
                    <li key={i} className="list-disc ml-3 leading-relaxed">
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Triage Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                Investigation Status *
              </label>
              <select
                value={triageStatus}
                onChange={(e) => setTriageStatus(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-medium"
              >
                <option value="New">New</option>
                <option value="Under Review">Under Review (Manual Review Active)</option>
                <option value="Resolved">Resolved (Cleared / Audit Complete)</option>
                <option value="Dismissed">Dismissed (False Positive / Expected)</option>
              </select>
            </div>

            {/* Reviewer Notes */}
            <div>
              <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                Auditor Case Notes / Disclosures
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document verification findings, interviews conducted, or disposition rationale..."
                className="w-full p-2.5 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
