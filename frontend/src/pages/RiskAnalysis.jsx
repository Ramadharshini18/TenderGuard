import React, { useState, useEffect } from 'react';
import {
  Shield,
  Play,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  TrendingUp,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchTenders,
  fetchLatestRiskAnalysis,
  runRiskAnalysis,
} from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function RiskAnalysis() {
  const { token } = useAuth();

  // State: Tenders dropdown list
  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [selectedTender, setSelectedTender] = useState(null);
  const [isLoadingTenders, setIsLoadingTenders] = useState(true);

  // State: Analysis Results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Load tenders for selection
  useEffect(() => {
    async function loadTendersList() {
      setIsLoadingTenders(true);
      try {
        const res = await fetchTenders({ page_size: 50 }, token);
        if (res.success && res.data.items) {
          setTenders(res.data.items);
          if (res.data.items.length > 0) {
            const first = res.data.items[0];
            setSelectedTenderId(first.id.toString());
            setSelectedTender(first);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingTenders(false);
      }
    }
    loadTendersList();
  }, [token]);

  // When selected tender changes, load existing latest analysis if present
  useEffect(() => {
    if (!selectedTenderId) return;
    const t = tenders.find((item) => item.id.toString() === selectedTenderId.toString());
    setSelectedTender(t || null);
    setAnalysisError(null);

    // Fetch prior analysis
    async function fetchPrior() {
      try {
        const res = await fetchLatestRiskAnalysis(selectedTenderId, token);
        if (res.success && res.data) {
          setAnalysisResult(res.data);
        } else {
          setAnalysisResult(null);
        }
      } catch (err) {
        setAnalysisResult(null);
      }
    }
    fetchPrior();
  }, [selectedTenderId, tenders, token]);

  // Trigger Risk Analysis Run
  const handleRunAnalysis = async () => {
    if (!selectedTenderId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await runRiskAnalysis(selectedTenderId, token);
      if (res.success && res.data) {
        setAnalysisResult(res.data);
      } else {
        setAnalysisError(res.error || 'Failed to complete risk analysis.');
      }
    } catch (err) {
      setAnalysisError(err.message || 'Network error while analyzing tender.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (val, cur = 'USD') => {
    if (val === undefined || val === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Risk Analysis"
        subtitle="Automated graph-driven risk assessment evaluating co-bidding syndication, price clustering, and tender award anomalies."
        category="AI Risk Analysis & Evidence Engine"
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={Play}
            onClick={handleRunAnalysis}
            isLoading={isAnalyzing}
            disabled={!selectedTender}
          >
            Run Risk Analysis
          </Button>
        }
      />

      {/* Tender Selection Toolbar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full sm:max-w-md">
          <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
            Select Tender to Analyze
          </label>
          {isLoadingTenders ? (
            <div className="text-xs text-brand-muted">Loading procurement registry...</div>
          ) : (
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-brand-bg/60 border border-brand-border rounded-lg text-brand-charcoal font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tender_id} — {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={RefreshCw}
            onClick={handleRunAnalysis}
            isLoading={isAnalyzing}
            disabled={!selectedTender}
            className="text-xs"
          >
            Re-evaluate Evidence
          </Button>
        </div>
      </div>

      {/* Selected Tender Specification Overview Card */}
      {selectedTender && (
        <div className="bg-white rounded-xl border border-brand-border/80 p-5 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
            <div>
              <span className="font-mono text-xs font-bold text-brand-primary block">
                {selectedTender.tender_id}
              </span>
              <h3 className="text-base font-bold text-brand-charcoal mt-0.5">
                {selectedTender.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedTender.status} />
              {analysisResult && (
                <RiskBadge level={analysisResult.risk_level} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div>
              <span className="text-brand-muted block text-[11px]">Issuing Organization</span>
              <span className="font-medium text-brand-charcoal block mt-0.5 truncate" title={selectedTender.procurement_authority}>
                {selectedTender.procurement_authority}
              </span>
            </div>
            <div>
              <span className="text-brand-muted block text-[11px]">Tender Category</span>
              <span className="font-medium text-brand-charcoal block mt-0.5">
                {selectedTender.category}
              </span>
            </div>
            <div>
              <span className="text-brand-muted block text-[11px]">Estimated Value</span>
              <span className="font-mono font-bold text-brand-charcoal block mt-0.5">
                {formatCurrency(selectedTender.estimated_value, selectedTender.currency)}
              </span>
            </div>
            <div>
              <span className="text-brand-muted block text-[11px]">Submission Deadline</span>
              <span className="font-mono text-brand-muted block mt-0.5">
                {selectedTender.submission_deadline}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Error Message */}
      {analysisError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-risk-high flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Main Analysis Display */}
      {isAnalyzing ? (
        <LoadingState message="Constructing procurement graph and computing risk indicators..." />
      ) : !analysisResult ? (
        <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
          <EmptyState
            icon={Shield}
            title="Tender Not Analyzed Yet"
            description="Click 'Run Risk Analysis' above to construct the multi-relational graph and evaluate historical co-bidding evidence."
            actionText="Run Risk Analysis"
            onAction={handleRunAnalysis}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Suspicion Score & Risk Level Card */}
          <div className="bg-white rounded-xl border border-brand-border/80 p-6 shadow-card">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Score Display Gauge */}
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 rounded-2xl bg-brand-bg flex flex-col items-center justify-center border border-brand-border shadow-inner">
                  <span className="text-3xl font-mono font-extrabold text-brand-primary">
                    {analysisResult.suspicion_score}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-brand-muted tracking-wider">
                    Score / 100
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-brand-muted">
                      Risk Level:
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        analysisResult.risk_level === 'Very High'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : analysisResult.risk_level === 'High'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : analysisResult.risk_level === 'Moderate'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {analysisResult.risk_level}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-brand-charcoal">
                    Pattern-Based Risk Assessment
                  </h4>
                  <p className="text-xs text-brand-muted max-w-md leading-relaxed">
                    Evaluated from {analysisResult.bidders_count} participating companies and verified historical procurement relationships.
                  </p>
                  <span className="text-[10px] font-mono text-brand-muted block pt-1">
                    Analysis Completed: {analysisResult.analysis_date || 'Just now'}
                  </span>
                </div>
              </div>

              {/* Guardrail Disclaimer Notice */}
              <div className="p-3.5 rounded-xl bg-brand-accent-light/40 border border-brand-accent/60 max-w-sm text-xs space-y-1 text-brand-charcoal">
                <div className="flex items-center gap-1.5 font-bold text-brand-primary">
                  <Info className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <span>Investigative Support Notice</span>
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  The Suspicion Score indicates pattern proximity to historical anomalous bidding behaviors. It does not establish fraud or wrongdoing without due administrative investigation.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Why Was This Flagged? (Evidence Explanations) */}
          <div className="bg-white rounded-xl border border-brand-border/80 p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Why was this flagged?
            </h3>
            {analysisResult.explanation.length === 0 ? (
              <p className="text-xs text-brand-muted">
                No anomalous bidding or relationship flags detected for this procurement notice.
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-brand-charcoal">
                {analysisResult.explanation.map((exp, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-brand-border/60"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed font-medium">{exp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section: Key Risk Indicators */}
          <div className="bg-white rounded-xl border border-brand-border/80 p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Key Risk Indicators
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {Object.entries(analysisResult.risk_indicators || {}).map(([name, item]) => {
                const isDetected = item.status === 'Detected';
                const isInsufficient = item.status === 'Insufficient Data';

                return (
                  <div
                    key={name}
                    className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
                      isDetected
                        ? 'bg-amber-50/60 border-amber-200'
                        : isInsufficient
                        ? 'bg-stone-50 border-stone-200'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-brand-charcoal block">{name}</span>
                      <span className="text-[11px] text-brand-muted leading-relaxed block">
                        {item.details}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                        isDetected
                          ? 'bg-amber-200 text-amber-900'
                          : isInsufficient
                          ? 'bg-stone-200 text-stone-700'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
