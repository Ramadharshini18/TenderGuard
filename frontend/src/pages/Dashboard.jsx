import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  BellRing,
  PlusCircle,
  Eye,
  GitFork,
  FileText,
  Filter,
  ChevronRight,
  Shield,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Activity,
  Users,
  Zap,
} from 'lucide-react';
import KPICard from '../components/common/KPICard';
import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import {
  fetchOverallRiskSummary,
  fetchTenders,
  fetchRecentRiskAnalyses,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onNavigate }) {
  const { token } = useAuth();

  const [activeModal, setActiveModal] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);

  // Live data state
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [portfolioStats, setPortfolioStats] = useState(null);
  const [patternOverview, setPatternOverview] = useState(null);
  const [recentTenders, setRecentTenders] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [isLoadingTenders, setIsLoadingTenders] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoadingStats(true);
    setIsLoadingTenders(true);
    setStatsError(null);

    try {
      // Fetch overview summary and recent tenders in parallel
      const [summaryRes, tendersRes, analysesRes] = await Promise.all([
        fetchOverallRiskSummary(token),
        fetchTenders({ page_size: 6, sort_by: 'created_at', sort_order: 'desc' }, token),
        fetchRecentRiskAnalyses(5, token),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setPortfolioStats(summaryRes.data.portfolio_metrics);
        setPatternOverview(summaryRes.data.pattern_overview);
      } else {
        setStatsError('Could not load portfolio statistics. Check backend connection.');
      }

      if (tendersRes.success && tendersRes.data?.items) {
        setRecentTenders(tendersRes.data.items);
      }

      if (analysesRes.success) {
        setRecentAnalyses(analysesRes.data || []);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setStatsError('Network error loading dashboard data.');
    } finally {
      setIsLoadingStats(false);
      setIsLoadingTenders(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleQuickAction = (actionName, targetRoute) => {
    if (targetRoute) {
      onNavigate(targetRoute);
    } else {
      setActiveModal({
        title: actionName,
        message: `The "${actionName}" workflow is accessible from the sidebar navigation.`,
      });
    }
  };

  const formatCurrency = (val, cur = 'USD') => {
    if (!val) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(val);
  };

  const columns = [
    {
      header: 'Tender ID',
      accessor: 'tender_id',
      cellClassName: 'font-mono text-xs font-semibold text-brand-primary',
    },
    {
      header: 'Title',
      accessor: 'title',
      cellClassName: 'max-w-xs xl:max-w-sm truncate font-medium text-brand-charcoal text-xs',
    },
    {
      header: 'Category',
      accessor: 'category',
      cellClassName: 'text-xs text-brand-muted hidden lg:table-cell',
    },
    {
      header: 'Value',
      accessor: 'estimated_value',
      cellClassName: 'font-semibold text-brand-charcoal font-mono text-xs hidden md:table-cell',
      render: (row) => formatCurrency(row.estimated_value, row.currency),
    },
    {
      header: 'Status',
      accessor: 'status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Risk',
      accessor: 'risk_status',
      align: 'center',
      render: (row) => <RiskBadge level={row.risk_status || 'Not Analyzed'} />,
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTender(row);
          }}
          className="text-xs"
        >
          Details
        </Button>
      ),
    },
  ];

  // Build risk distribution from real analyses
  const riskBuckets = recentAnalyses.reduce(
    (acc, a) => {
      const lvl = (a.risk_level || '').toLowerCase();
      if (lvl === 'low') acc.low++;
      else if (lvl === 'moderate') acc.moderate++;
      else if (lvl === 'high') acc.high++;
      else if (lvl === 'very high') acc.veryHigh++;
      return acc;
    },
    { low: 0, moderate: 0, high: 0, veryHigh: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Procurement Monitoring Overview"
        subtitle="Live monitoring of public contracts, bidder networks, and procurement fraud indicators."
        category="Executive Dashboard"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              iconLeft={RefreshCw}
              onClick={loadDashboardData}
              isLoading={isLoadingStats}
              className="text-xs"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={PlusCircle}
              onClick={() => handleQuickAction('Add New Tender', 'tenders')}
            >
              Add New Tender
            </Button>
          </>
        }
      />

      {/* Live KPI Cards */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-brand-border/60 animate-pulse" />
          ))}
        </div>
      ) : statsError ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{statsError}</span>
          <button onClick={loadDashboardData} className="ml-auto font-semibold underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <KPICard
            title="Total Tenders"
            value={portfolioStats?.total_tenders ?? '—'}
            subtitle="Active procurement tenders"
            icon={FileSpreadsheet}
            trend="Live from database"
            trendType="positive"
            accentColor="primary"
          />
          <KPICard
            title="Companies Registered"
            value={portfolioStats?.total_companies ?? '—'}
            subtitle="Participating bidder entities"
            icon={Users}
            trend="Live from database"
            trendType="positive"
            accentColor="secondary"
          />
          <KPICard
            title="Tenders Analyzed"
            value={portfolioStats?.tenders_analyzed ?? '—'}
            subtitle="AI risk scores computed"
            icon={Activity}
            trend="Live risk engine"
            trendType="positive"
            accentColor="secondary"
          />
          <KPICard
            title="Open Alerts"
            value={portfolioStats?.open_alerts ?? '—'}
            subtitle={
              portfolioStats?.high_or_very_high_suspicion_tenders != null
                ? `${portfolioStats.high_or_very_high_suspicion_tenders} high-risk tenders`
                : 'Requiring auditor review'
            }
            icon={BellRing}
            trend={portfolioStats?.open_alerts > 0 ? 'Requires attention' : 'All clear'}
            trendType={portfolioStats?.open_alerts > 0 ? 'negative' : 'positive'}
            accentColor={portfolioStats?.open_alerts > 0 ? 'danger' : 'secondary'}
          />
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
            Quick Actions
          </span>
          {lastRefreshed && (
            <span className="text-[11px] text-brand-muted">
              Last refreshed: {lastRefreshed}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button variant="outline" size="sm" iconLeft={PlusCircle}
            onClick={() => handleQuickAction('Add New Tender', 'tenders')}
            className="w-full justify-start text-xs font-semibold hover:border-brand-primary">
            Add New Tender
          </Button>
          <Button variant="outline" size="sm" iconLeft={Eye}
            onClick={() => handleQuickAction('View Tenders', 'tenders')}
            className="w-full justify-start text-xs font-semibold hover:border-brand-primary">
            View Tenders
          </Button>
          <Button variant="outline" size="sm" iconLeft={GitFork}
            onClick={() => handleQuickAction('Analyze Tender', 'risk-analysis')}
            className="w-full justify-start text-xs font-semibold hover:border-brand-primary">
            Analyze Tender
          </Button>
          <Button variant="outline" size="sm" iconLeft={BellRing}
            onClick={() => handleQuickAction('View Alerts', 'alerts')}
            className="w-full justify-start text-xs font-semibold hover:border-brand-primary">
            View Alerts
          </Button>
          <Button variant="outline" size="sm" iconLeft={FileText}
            onClick={() => handleQuickAction('Generate Report', 'reports')}
            className="w-full justify-start text-xs font-semibold hover:border-brand-primary">
            Generate Report
          </Button>
        </div>
      </div>

      {/* Middle Section: Pattern Intelligence & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pattern Intelligence Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border/80 p-5 shadow-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-brand-charcoal uppercase tracking-wider">
                  Pattern Intelligence Summary
                </h3>
              </div>
              <p className="text-xs text-brand-muted mt-0.5">
                Live analysis of co-bidding syndication and unusual procurement behaviors
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Data
            </span>
          </div>

          {isLoadingStats ? (
            <div className="h-24 animate-pulse bg-brand-bg rounded-xl" />
          ) : patternOverview ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-brand-border/60 bg-brand-bg/50 text-center">
                  <span className="text-[10px] text-brand-muted uppercase font-bold block">Repeated Pairs</span>
                  <span className="font-mono text-2xl font-extrabold text-brand-primary block mt-1">
                    {patternOverview.repeated_company_pairs}
                  </span>
                  <span className="text-[10px] text-brand-muted">co-bidding groups</span>
                </div>
                <div className="p-3 rounded-xl border border-amber-200/60 bg-amber-50/50 text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">Unusual Patterns</span>
                  <span className="font-mono text-2xl font-extrabold text-amber-800 block mt-1">
                    {patternOverview.unusual_patterns_found}
                  </span>
                  <span className="text-[10px] text-amber-700">flagged for review</span>
                </div>
                <div className="p-3 rounded-xl border border-brand-border/60 bg-brand-bg/50 text-center">
                  <span className="text-[10px] text-brand-muted uppercase font-bold block">Similar Prices</span>
                  <span className="font-mono text-2xl font-extrabold text-brand-secondary block mt-1">
                    {patternOverview.similar_price_pairs}
                  </span>
                  <span className="text-[10px] text-brand-muted">price clusters ≤5%</span>
                </div>
                <div className="p-3 rounded-xl border border-red-100 bg-red-50/40 text-center">
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Winner Rotations</span>
                  <span className="font-mono text-2xl font-extrabold text-red-800 block mt-1">
                    {patternOverview.alternating_winners_pairs}
                  </span>
                  <span className="text-[10px] text-red-600">alternating pairs</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
                <span>Based on full historical bidding participation database</span>
                <button
                  onClick={() => onNavigate('patterns')}
                  className="font-semibold text-brand-primary hover:underline text-xs"
                >
                  View Pattern Analysis →
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-brand-muted">No pattern data available. Add tenders and companies to begin.</p>
          )}
        </div>

        {/* Oversight Engine Status Panel */}
        <div className="bg-gradient-to-br from-brand-primary-dark to-brand-primary text-white rounded-xl p-5 shadow-card flex flex-col justify-between border border-brand-primary">
          <div>
            <div className="flex items-center gap-2 text-brand-accent">
              <Shield className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Oversight Engine Status
              </h3>
            </div>
            <p className="mt-3 text-xs text-white/80 leading-relaxed">
              TenderGuard monitors public bidding for collusive indicators: rotating winners, cover bidding, and abnormal bid spread clustering.
            </p>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-white/80">Engine Status:</span>
                <span className="font-semibold text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-white/80">Audit Cadence:</span>
                <span className="font-semibold text-white">On-Demand</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-white/80">GNN Architecture:</span>
                <span className="font-semibold text-emerald-300">Graph Neural Network</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
            <span>Governance Level: Federal</span>
            <span className="font-mono text-brand-accent">ST-FRDS-01</span>
          </div>
        </div>
      </div>

      {/* Recent Tenders Section — Live Data */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-brand-charcoal tracking-tight">
              Recent Tenders
            </h2>
            <p className="text-xs text-brand-muted">
              Latest procurement notices from the live tender registry
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconRight={ChevronRight}
            onClick={() => onNavigate('tenders')}
            className="text-xs font-semibold text-brand-primary"
          >
            View All Tenders
          </Button>
        </div>

        {isLoadingTenders ? (
          <LoadingState message="Loading procurement registry..." />
        ) : recentTenders.length === 0 ? (
          <div className="bg-white rounded-xl border border-brand-border/80 p-8 text-center shadow-card">
            <FileSpreadsheet className="w-8 h-8 text-brand-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold text-brand-charcoal">No tenders registered yet</p>
            <p className="text-xs text-brand-muted mt-1">Add your first tender to begin procurement monitoring.</p>
            <Button variant="primary" size="sm" iconLeft={PlusCircle}
              onClick={() => onNavigate('tenders')} className="mt-3">
              Register Tender
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={recentTenders}
            onRowClick={(row) => setSelectedTender(row)}
          />
        )}
      </div>

      {/* Tender Detail Modal */}
      {selectedTender && (
        <Modal
          isOpen={!!selectedTender}
          onClose={() => setSelectedTender(null)}
          title={`Tender: ${selectedTender.tender_id}`}
          subtitle="Live procurement registry record"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedTender(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedTender(null);
                  onNavigate('risk-analysis');
                }}
              >
                Analyze in Risk Engine →
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-brand-charcoal">
            <div className="p-3 rounded-lg bg-brand-bg border border-brand-border/60">
              <span className="text-xs text-brand-muted uppercase font-bold tracking-wider block">Tender Title</span>
              <p className="font-semibold text-brand-charcoal mt-0.5">{selectedTender.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-xs text-brand-muted block">Category</span>
                <span className="font-medium text-xs">{selectedTender.category || '—'}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-xs text-brand-muted block">Estimated Value</span>
                <span className="font-bold text-xs font-mono">
                  {formatCurrency(selectedTender.estimated_value, selectedTender.currency)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-xs text-brand-muted block">Authority</span>
                <span className="font-medium text-xs truncate block" title={selectedTender.procurement_authority}>
                  {selectedTender.procurement_authority || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-brand-border/60">
                <span className="text-xs text-brand-muted block">Risk Status</span>
                <div className="mt-1">
                  <RiskBadge level={selectedTender.risk_status || 'Not Analyzed'} />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-brand-accent-light/50 border border-brand-accent/50 text-xs text-brand-muted">
              <strong className="text-brand-primary block mb-0.5">AI Risk Analysis:</strong>
              Use the Risk Analysis page to compute a full Suspicion Score and review forensic evidence indicators for this tender.
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Action Info Modal */}
      {activeModal && (
        <Modal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          title={activeModal.title}
          subtitle="Navigation Notice"
          footer={
            <Button variant="primary" size="sm" onClick={() => setActiveModal(null)}>
              Acknowledged
            </Button>
          }
        >
          <p className="text-sm text-brand-charcoal leading-relaxed">{activeModal.message}</p>
        </Modal>
      )}
    </div>
  );
}
