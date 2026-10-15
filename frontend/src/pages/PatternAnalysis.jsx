import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  TrendingUp,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  Sliders,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Percent,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchDataSufficiency,
  fetchPatternSummary,
  fetchCompanyRelationships,
  fetchCompanyPairDetail,
  fetchCompanyFrequencies,
  fetchUnusualPatterns,
} from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import KPICard from '../components/common/KPICard';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function PatternAnalysis() {
  const { token } = useAuth();

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [sufficiency, setSufficiency] = useState(null);
  const [summary, setSummary] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [unusualPatterns, setUnusualPatterns] = useState([]);

  // Filter state
  const [dateRange, setDateRange] = useState('all'); // 'all', '30d', '6m', '1y'
  const [thresholdPct, setThresholdPct] = useState(5.0);
  const [patternTypeFilter, setPatternTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('relationships'); // 'relationships' | 'patterns' | 'frequencies' | 'visual'

  // Modal: Pair Detail
  const [selectedPair, setSelectedPair] = useState(null);
  const [pairDetailData, setPairDetailData] = useState(null);
  const [isLoadingPairDetail, setIsLoadingPairDetail] = useState(false);

  // Calculate from_date from dateRange
  const getDateFilterParams = () => {
    if (dateRange === 'all') return {};
    const now = new Date();
    if (dateRange === '30d') {
      const d = new Date(now.getTime() - 30 * 86400000);
      return { from_date: d.toISOString().split('T')[0] };
    }
    if (dateRange === '6m') {
      const d = new Date(now.getTime() - 180 * 86400000);
      return { from_date: d.toISOString().split('T')[0] };
    }
    if (dateRange === '1y') {
      const d = new Date(now.getTime() - 365 * 86400000);
      return { from_date: d.toISOString().split('T')[0] };
    }
    return {};
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateParams = getDateFilterParams();

      // 1. Data sufficiency
      const suffRes = await fetchDataSufficiency(token);
      if (suffRes.success) {
        setSufficiency(suffRes.data);
      }

      // 2. Summary KPI metrics
      const sumRes = await fetchPatternSummary(
        { threshold_pct: thresholdPct, ...dateParams },
        token
      );
      if (sumRes.success) {
        setSummary(sumRes.data);
      }

      // 3. Repeated company relationships
      const relRes = await fetchCompanyRelationships(
        { min_shared: 2, threshold_pct: thresholdPct, ...dateParams },
        token
      );
      if (relRes.success) {
        setRelationships(relRes.data || []);
      }

      // 4. Company frequencies
      const freqRes = await fetchCompanyFrequencies(token);
      if (freqRes.success) {
        setFrequencies(freqRes.data || []);
      }

      // 5. Flagged unusual patterns
      const patRes = await fetchUnusualPatterns(
        {
          threshold_pct: thresholdPct,
          pattern_type: patternTypeFilter,
          severity: severityFilter,
          ...dateParams,
        },
        token
      );
      if (patRes.success) {
        setUnusualPatterns(patRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze historical tender patterns.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, thresholdPct, patternTypeFilter, severityFilter, token]);

  // Open Pair Comparison Modal
  const handleOpenPairDetail = async (pair) => {
    setSelectedPair(pair);
    setIsLoadingPairDetail(true);
    setPairDetailData(null);
    try {
      const res = await fetchCompanyPairDetail(
        pair.company_a_id,
        pair.company_b_id,
        thresholdPct,
        token
      );
      if (res.success) {
        setPairDetailData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPairDetail(false);
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

  // Severity color badge helper (strictly administrative priority, not fraud scores)
  const renderSeverityBadge = (severity) => {
    if (severity === 'Unusual Pattern') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-700" />
          Unusual Pattern
        </span>
      );
    }
    if (severity === 'Attention') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-300">
          <Clock className="w-3 h-3 text-stone-600" />
          Attention
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Normal Pattern
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Pattern Analysis"
        subtitle="Review historical bidding relationships and unusual tender patterns before AI risk analysis."
        category="Historical Co-Bidding & Relationship Engine"
        actions={
          <Button
            variant="outline"
            size="sm"
            iconLeft={RefreshCw}
            onClick={loadData}
            isLoading={isLoading}
          >
            Re-calculate Patterns
          </Button>
        }
      />

      {/* Data Sufficiency Banner (When insufficient data exists) */}
      {sufficiency && !sufficiency.is_sufficient && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 text-amber-900 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-950">
              Insufficient Historical Data
            </h4>
            <p className="text-xs leading-relaxed">
              {sufficiency.status_message}
            </p>
            {sufficiency.recommendation && (
              <p className="text-[11px] text-amber-800 font-medium pt-1">
                Recommendation: {sufficiency.recommendation}
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Tenders Analyzed"
          value={summary?.total_tenders_analyzed ?? 0}
          subtitle="Tenders with multiple bids recorded"
          icon={FileSpreadsheet}
          trend={summary?.is_sufficient_data ? 'Active registry data' : 'Needs data'}
          trendType={summary?.is_sufficient_data ? 'neutral' : 'down'}
        />
        <KPICard
          title="Companies Analyzed"
          value={summary?.companies_analyzed ?? 0}
          subtitle="Active participating bidders"
          icon={Building2}
          trend="Unique contractor records"
          trendType="neutral"
        />
        <KPICard
          title="Repeated Company Pairs"
          value={summary?.repeated_company_pairs ?? 0}
          subtitle="Pairs with >= 2 shared tenders"
          icon={GitCompare}
          trend={summary?.repeated_company_pairs > 0 ? 'Co-bidding pairs found' : 'None detected'}
          trendType={summary?.repeated_company_pairs > 0 ? 'neutral' : 'down'}
        />
        <KPICard
          title="Unusual Patterns Found"
          value={summary?.unusual_patterns_found ?? 0}
          subtitle="Flagged for future AI/GNN review"
          icon={AlertTriangle}
          trend={`${summary?.similar_price_pairs_count || 0} similar price pairs`}
          trendType={summary?.unusual_patterns_found > 0 ? 'neutral' : 'down'}
        />
      </div>

      {/* Control Filter Toolbar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-brand-muted font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="all">All Time History</option>
              <option value="30d">Last 30 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last 1 Year</option>
            </select>
          </div>

          {/* Similar Price Threshold */}
          <div className="flex items-center gap-1.5">
            <span className="text-brand-muted font-medium flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" /> Price Similarity Threshold:
            </span>
            <select
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value))}
              className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value={3.0}>3.0% (Very Close)</option>
              <option value={5.0}>5.0% (Default Standard)</option>
              <option value={7.5}>7.5% (Broad)</option>
              <option value={10.0}>10.0% (High Tolerance)</option>
            </select>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="text-[11px] text-brand-muted italic flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-primary" />
          <span>Descriptive historical indicators • Zero AI/fraud scores calculated</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border/60 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('relationships')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'relationships'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-brand-charcoal/70 hover:bg-brand-bg'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          Company Relationships ({relationships.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('patterns')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'patterns'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-brand-charcoal/70 hover:bg-brand-bg'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Unusual Patterns ({unusualPatterns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frequencies')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'frequencies'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-brand-charcoal/70 hover:bg-brand-bg'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Participation Frequency ({frequencies.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('visual')}
          className={`px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'visual'
              ? 'bg-brand-primary text-white shadow-sm'
              : 'text-brand-charcoal/70 hover:bg-brand-bg'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Visual Relationship View
        </button>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <LoadingState message="Analyzing historical bidding relationships from database..." />
      ) : error ? (
        <ErrorState title="Analysis Failed" message={error} onRetry={loadData} />
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: COMPANY RELATIONSHIPS                             */}
          {/* ======================================================== */}
          {activeTab === 'relationships' && (
            <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
              <div className="p-4 border-b border-brand-border/60 bg-brand-bg/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider">
                    Company Relationships (Shared Tenders &gt;= 2)
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Identifies contractor organizations repeatedly submitting bids within the same procurement tenders.
                  </p>
                </div>
                <span className="text-[11px] text-brand-muted">
                  Click on any row to open the full side-by-side tender breakdown
                </span>
              </div>

              {relationships.length === 0 ? (
                <EmptyState
                  icon={GitCompare}
                  title="No repeated company pairs found"
                  description="No two companies share 2 or more tenders within the current filter criteria."
                  actionText="View All Time"
                  onAction={() => setDateRange('all')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-brand-charcoal">
                    <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                      <tr>
                        <th className="px-4 py-3">Company A</th>
                        <th className="px-4 py-3">Company B</th>
                        <th className="px-4 py-3 text-center">Shared Tenders</th>
                        <th className="px-4 py-3 text-center">Company A Wins</th>
                        <th className="px-4 py-3 text-center">Company B Wins</th>
                        <th className="px-4 py-3 text-center">Similar Price Tenders</th>
                        <th className="px-4 py-3 text-center">Pattern Classification</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-xs">
                      {relationships.map((rel) => (
                        <tr
                          key={rel.pair_id}
                          onClick={() => handleOpenPairDetail(rel)}
                          className="hover:bg-brand-bg/50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-semibold text-brand-charcoal">
                            <div>{rel.company_a_name}</div>
                            <span className="font-mono text-[10px] text-brand-muted">
                              {rel.company_a_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-brand-charcoal">
                            <div>{rel.company_b_name}</div>
                            <span className="font-mono text-[10px] text-brand-muted">
                              {rel.company_b_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold bg-brand-accent-light text-brand-charcoal">
                              {rel.shared_tenders_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-800">
                            {rel.company_a_wins}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-800">
                            {rel.company_b_wins}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-mono font-semibold ${
                                rel.similar_price_tenders_count > 0
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'text-brand-muted'
                              }`}
                            >
                              {rel.similar_price_tenders_count} / {rel.shared_tenders_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {renderSeverityBadge(rel.severity)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconLeft={Eye}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPairDetail(rel);
                              }}
                              className="text-xs py-1"
                            >
                              Compare
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: UNUSUAL PATTERNS                                  */}
          {/* ======================================================== */}
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              {/* Pattern Filter Controls */}
              <div className="bg-white rounded-xl border border-brand-border/80 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-muted font-medium">Pattern Type:</span>
                    <select
                      value={patternTypeFilter}
                      onChange={(e) => setPatternTypeFilter(e.target.value)}
                      className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium"
                    >
                      <option value="All">All Patterns</option>
                      <option value="Similar Quoted Prices">Similar Quoted Prices</option>
                      <option value="Repeated Winner Changes">Repeated Winner Changes</option>
                      <option value="Repeated Participation">Repeated Participation</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-muted font-medium">Classification:</span>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium"
                    >
                      <option value="All">All Classifications</option>
                      <option value="Unusual Pattern">Unusual Pattern</option>
                      <option value="Attention">Attention</option>
                      <option value="Normal Pattern">Normal Pattern</option>
                    </select>
                  </div>
                </div>

                <span className="text-brand-muted">
                  Total indexed: <strong>{unusualPatterns.length}</strong>
                </span>
              </div>

              {/* Patterns Table */}
              <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
                {unusualPatterns.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="No unusual patterns found"
                    description="No historical patterns match the currently applied criteria."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-brand-charcoal">
                      <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                        <tr>
                          <th className="px-4 py-3">Pattern Type</th>
                          <th className="px-4 py-3">Entities Involved</th>
                          <th className="px-4 py-3">Observed Historical Data</th>
                          <th className="px-4 py-3 text-center">Metric / Frequency</th>
                          <th className="px-4 py-3 text-center">Severity</th>
                          <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40 text-xs">
                        {unusualPatterns.map((pat) => (
                          <tr key={pat.id} className="hover:bg-brand-bg/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-brand-primary whitespace-nowrap">
                              {pat.pattern_type}
                            </td>
                            <td className="px-4 py-3 font-semibold text-brand-charcoal">
                              {pat.entity_label}
                            </td>
                            <td className="px-4 py-3 text-brand-charcoal leading-relaxed max-w-md">
                              {pat.observed_description}
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-medium whitespace-nowrap text-brand-charcoal/90">
                              {pat.frequency_metric}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {renderSeverityBadge(pat.severity)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                {pat.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: PARTICIPATION FREQUENCIES                         */}
          {/* ======================================================== */}
          {activeTab === 'frequencies' && (
            <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
              <div className="p-4 border-b border-brand-border/60 bg-brand-bg/20">
                <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider">
                  Company Participation Frequency &amp; Win Rate
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Calculates total tender participations, wins, losses, disqualifications, and empirical win rate percentage.
                </p>
              </div>

              {frequencies.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No company participation records"
                  description="Register tender participation records in the Bidders directory to track bidding frequencies."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-brand-charcoal">
                    <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                      <tr>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3 text-center">Total Bids</th>
                        <th className="px-4 py-3 text-center">Wins</th>
                        <th className="px-4 py-3 text-center">Losses</th>
                        <th className="px-4 py-3 text-center">Disqualified</th>
                        <th className="px-4 py-3 text-center">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-xs">
                      {frequencies.map((freq) => (
                        <tr key={freq.company_id} className="hover:bg-brand-bg/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-brand-charcoal">
                            <div>{freq.company_name}</div>
                            <span className="font-mono text-[10px] text-brand-muted">
                              {freq.company_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-brand-muted">
                            {freq.city ? `${freq.city}, ${freq.country}` : freq.country || '—'}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-brand-charcoal">
                            {freq.total_participations}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-emerald-800">
                            {freq.total_wins}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-stone-600">
                            {freq.total_losses}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-red-700">
                            {freq.total_disqualifications}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-brand-primary h-1.5 rounded-full"
                                  style={{ width: `${Math.min(freq.win_rate_percentage, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-brand-primary text-xs">
                                {freq.win_rate_percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: VISUAL RELATIONSHIP VIEW (CLEAN CARDS & LINKS)    */}
          {/* ======================================================== */}
          {activeTab === 'visual' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-brand-border bg-white shadow-card">
                <div className="border-b border-brand-border/60 pb-3">
                  <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Bidding Syndication Clusters (Visual Cards)
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Visual network mapping representing repeated shared co-bidding ties between contractor organizations.
                  </p>
                </div>

                {relationships.length === 0 ? (
                  <div className="py-8 text-center text-xs text-brand-muted">
                    No co-bidding ties detected yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {relationships.map((rel) => (
                      <div
                        key={rel.pair_id}
                        onClick={() => handleOpenPairDetail(rel)}
                        className="p-4 rounded-xl border border-brand-border hover:border-brand-primary/60 bg-brand-bg/30 hover:bg-brand-bg/60 transition-all cursor-pointer space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase font-bold text-brand-muted">
                            Pair Record #{rel.pair_id}
                          </span>
                          {renderSeverityBadge(rel.severity)}
                        </div>

                        {/* Co-bidding Node Connector */}
                        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-brand-border/60 shadow-sm">
                          <div className="flex-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center mx-auto mb-1 text-xs">
                              A
                            </div>
                            <div className="font-semibold text-xs text-brand-charcoal truncate" title={rel.company_a_name}>
                              {rel.company_a_name}
                            </div>
                            <span className="text-[10px] text-emerald-800 font-bold block mt-0.5">
                              {rel.company_a_wins} wins
                            </span>
                          </div>

                          <div className="flex flex-col items-center px-2">
                            <span className="font-mono font-bold text-xs text-brand-primary">
                              {rel.shared_tenders_count} Shared
                            </span>
                            <div className="w-16 h-0.5 bg-brand-primary/40 my-1 relative">
                              <div className="w-2 h-2 rounded-full bg-brand-primary absolute left-1/2 -top-0.5 -translate-x-1/2" />
                            </div>
                            <span className="text-[10px] text-amber-800 font-semibold">
                              {rel.similar_price_tenders_count} close bids
                            </span>
                          </div>

                          <div className="flex-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-brand-secondary/10 text-brand-secondary font-bold flex items-center justify-center mx-auto mb-1 text-xs">
                              B
                            </div>
                            <div className="font-semibold text-xs text-brand-charcoal truncate" title={rel.company_b_name}>
                              {rel.company_b_name}
                            </div>
                            <span className="text-[10px] text-emerald-800 font-bold block mt-0.5">
                              {rel.company_b_wins} wins
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-brand-muted leading-relaxed">
                          {rel.summary_description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* COMPANY PAIR BREAKDOWN MODAL                             */}
      {/* ======================================================== */}
      {selectedPair && (
        <Modal
          isOpen={!!selectedPair}
          onClose={() => setSelectedPair(null)}
          title={`Company Pair Comparison: ${selectedPair.company_a_name} & ${selectedPair.company_b_name}`}
          subtitle={`Historical co-bidding analysis across ${selectedPair.shared_tenders_count} shared tenders`}
          maxWidth="max-w-4xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedPair(null)}>
              Close Comparison
            </Button>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {/* Pair Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-brand-bg/60 border border-brand-border">
                <span className="text-[10px] text-brand-muted block uppercase font-bold">Shared Tenders</span>
                <span className="font-mono text-base font-bold text-brand-charcoal">
                  {selectedPair.shared_tenders_count}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 block uppercase font-bold truncate">
                  {selectedPair.company_a_name} Wins
                </span>
                <span className="font-mono text-base font-bold text-emerald-900">
                  {selectedPair.company_a_wins}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-[10px] text-blue-800 block uppercase font-bold truncate">
                  {selectedPair.company_b_name} Wins
                </span>
                <span className="font-mono text-base font-bold text-blue-900">
                  {selectedPair.company_b_wins}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-800 block uppercase font-bold">
                  Similar Price Cases (&lt;= {thresholdPct}%)
                </span>
                <span className="font-mono text-base font-bold text-amber-900">
                  {selectedPair.similar_price_tenders_count}
                </span>
              </div>
            </div>

            {/* Explanatory summary text */}
            <div className="p-3 rounded-lg bg-stone-50 border border-brand-border text-brand-charcoal leading-relaxed">
              <span className="font-bold block mb-0.5">Historical Pattern Note:</span>
              <span>{selectedPair.summary_description}</span>
            </div>

            {/* Tender-by-Tender Breakdown Table */}
            {isLoadingPairDetail ? (
              <div className="py-6 text-center">
                <LoadingState message="Loading tender-by-tender quoted price comparisons..." />
              </div>
            ) : !pairDetailData || pairDetailData.tenders.length === 0 ? (
              <div className="p-4 rounded-lg bg-stone-50 text-center text-brand-muted">
                No tender comparison records available.
              </div>
            ) : (
              <div className="rounded-lg border border-brand-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-accent-light/50 border-b border-brand-border text-[11px] font-semibold uppercase text-brand-charcoal">
                    <tr>
                      <th className="px-3 py-2.5">Tender ID &amp; Title</th>
                      <th className="px-3 py-2.5 text-right">{selectedPair.company_a_name} Bid</th>
                      <th className="px-3 py-2.5 text-right">{selectedPair.company_b_name} Bid</th>
                      <th className="px-3 py-2.5 text-right">Price Delta</th>
                      <th className="px-3 py-2.5 text-center">% Difference</th>
                      <th className="px-3 py-2.5 text-center">Winner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 bg-white">
                    {pairDetailData.tenders.map((tnd) => (
                      <tr key={tnd.tender_id} className="hover:bg-brand-bg/40">
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-brand-primary block">
                            {tnd.tender_code}
                          </span>
                          <span className="text-brand-charcoal font-medium line-clamp-1">
                            {tnd.tender_title}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-brand-charcoal whitespace-nowrap">
                          {formatCurrency(tnd.company_a_price, tnd.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-brand-charcoal whitespace-nowrap">
                          {formatCurrency(tnd.company_b_price, tnd.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-brand-muted whitespace-nowrap">
                          {formatCurrency(tnd.absolute_difference, tnd.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              tnd.is_similar_price
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {tnd.percentage_difference}% difference
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              tnd.winner_label.includes(selectedPair.company_a_name)
                                ? 'bg-emerald-600 text-white'
                                : tnd.winner_label.includes(selectedPair.company_b_name)
                                ? 'bg-blue-600 text-white'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {tnd.winner_label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
