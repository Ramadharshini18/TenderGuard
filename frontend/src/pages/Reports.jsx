import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Printer,
  Shield,
  Building2,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchTenders,
  fetchTenderRiskReport,
  fetchOverallRiskSummary,
} from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';

export default function Reports() {
  const { token } = useAuth();

  const [tenders, setTenders] = useState([]);
  const [selectedTenderId, setSelectedTenderId] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('tender'); // 'tender' | 'portfolio'

  const [tenderReport, setTenderReport] = useState(null);
  const [portfolioReport, setPortfolioReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load tenders for dropdown
  useEffect(() => {
    async function initTenders() {
      try {
        const res = await fetchTenders({ page_size: 50 }, token);
        if (res.success && res.data.items?.length > 0) {
          setTenders(res.data.items);
          setSelectedTenderId(res.data.items[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    }
    initTenders();
  }, [token]);

  // Load report data
  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeReportTab === 'tender') {
        if (!selectedTenderId) return;
        const res = await fetchTenderRiskReport(selectedTenderId, token);
        if (res.success) {
          setTenderReport(res.data);
        } else {
          setError(res.error || 'Failed to generate tender report.');
        }
      } else {
        const res = await fetchOverallRiskSummary(token);
        if (res.success) {
          setPortfolioReport(res.data);
        } else {
          setError(res.error || 'Failed to generate portfolio report.');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeReportTab, selectedTenderId, token]);

  // Clean, high-fidelity browser print to PDF
  const handlePrintPDF = () => {
    window.print();
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
        title="Investigation Reports"
        subtitle="Forensic procurement audit reports, court-admissible dossiers, and executive portfolio risk summaries."
        category="Auditor Reporting & Formal Disclosures"
        actions={
          <Button variant="primary" size="sm" iconLeft={Printer} onClick={handlePrintPDF}>
            Export / Print PDF
          </Button>
        }
      />

      {/* Report Type Selector Toolbar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Button
            variant={activeReportTab === 'tender' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveReportTab('tender')}
          >
            Tender Risk Dossier
          </Button>
          <Button
            variant={activeReportTab === 'portfolio' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveReportTab('portfolio')}
          >
            Portfolio Risk Summary
          </Button>
        </div>

        {activeReportTab === 'tender' && (
          <div className="w-full sm:max-w-xs">
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="w-full py-1.5 px-3 text-xs bg-brand-bg/60 border border-brand-border rounded-lg text-brand-charcoal font-medium"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tender_id} — {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Report Viewable & Printable Container */}
      {isLoading ? (
        <LoadingState message="Compiling audit evidence and generating dossier..." />
      ) : error ? (
        <ErrorState title="Failed to Generate Report" message={error} onRetry={loadReport} />
      ) : activeReportTab === 'tender' && tenderReport ? (
        <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card space-y-6 printable-dossier">
          {/* Official Letterhead */}
          <div className="border-b-2 border-brand-primary pb-4 flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold text-brand-primary uppercase tracking-wider block">
                {tenderReport.system_name}
              </span>
              <h2 className="text-xl font-black text-brand-charcoal mt-1">
                {tenderReport.report_title}
              </h2>
              <span className="text-xs text-brand-muted block mt-0.5">
                Timestamp: {tenderReport.generated_at}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded bg-brand-accent-light text-brand-primary uppercase">
                Official Audit Report
              </span>
            </div>
          </div>

          {/* Section: Tender Specifications */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-brand-primary text-xs">
              1. Procurement Tender Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-stone-50 border border-brand-border/60">
              <div>
                <span className="text-brand-muted block text-[11px]">Tender Code</span>
                <span className="font-mono font-bold text-brand-charcoal">{tenderReport.tender.tender_code}</span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Issuing Authority</span>
                <span className="font-semibold text-brand-charcoal">{tenderReport.tender.procurement_authority}</span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Estimated Value</span>
                <span className="font-mono font-bold text-brand-charcoal">
                  {formatCurrency(tenderReport.tender.estimated_value, tenderReport.tender.currency)}
                </span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Status</span>
                <span className="font-semibold text-brand-charcoal">{tenderReport.tender.status}</span>
              </div>
            </div>
          </div>

          {/* Section: Risk Evaluation */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-brand-primary text-xs">
              2. Graph Risk Assessment &amp; Evidence
            </h3>
            <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-amber-800 font-bold uppercase block">Suspicion Score</span>
                <span className="text-2xl font-mono font-extrabold text-amber-950">
                  {tenderReport.risk_assessment.suspicion_score} / 100
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-amber-800 font-bold uppercase block">Risk Level</span>
                <span className="font-extrabold text-sm uppercase px-3 py-1 rounded-full bg-amber-200 text-amber-900">
                  {tenderReport.risk_assessment.risk_level}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white border border-brand-border/60 space-y-1.5">
              <span className="font-bold text-brand-charcoal block">Evidence Points Identified:</span>
              <ul className="space-y-1 text-brand-charcoal pl-2">
                {tenderReport.risk_assessment.evidence_points.map((pt, i) => (
                  <li key={i} className="list-disc ml-3 leading-relaxed">
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section: Participating Bidders Table */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-brand-primary text-xs">
              3. Recorded Contractor Bids
            </h3>
            <div className="rounded-lg border border-brand-border/70 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-brand-accent-light/50 border-b border-brand-border text-[11px] font-semibold uppercase text-brand-charcoal">
                  <tr>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2 text-right">Quoted Price</th>
                    <th className="px-3 py-2 text-center">Qualification</th>
                    <th className="px-3 py-2 text-center">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {tenderReport.bidders.map((b, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-semibold text-brand-charcoal">
                        {b.company_name} ({b.company_id})
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-brand-charcoal">
                        {formatCurrency(b.quoted_price)}
                      </td>
                      <td className="px-3 py-2 text-center">{b.qualification_status}</td>
                      <td className="px-3 py-2 text-center font-bold">{b.participation_result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Recommendation & Disclaimer */}
          <div className="p-4 rounded-lg bg-stone-50 border border-brand-border space-y-2 text-xs">
            <div className="font-bold text-brand-charcoal">
              Investigator Recommendation:
            </div>
            <p className="text-brand-charcoal/90 leading-relaxed font-medium">
              {tenderReport.recommendation}
            </p>
            <div className="pt-2 border-t border-brand-border/60 text-[10px] text-brand-muted leading-relaxed italic">
              <strong>Official Notice: </strong>
              {tenderReport.disclaimer}
            </div>
          </div>
        </div>
      ) : activeReportTab === 'portfolio' && portfolioReport ? (
        <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card space-y-6 printable-dossier">
          <div className="border-b-2 border-brand-primary pb-4 flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold text-brand-primary uppercase tracking-wider block">
                TenderGuard Enterprise Surveillance
              </span>
              <h2 className="text-xl font-black text-brand-charcoal mt-1">
                Executive Procurement Oversight Risk Summary
              </h2>
              <span className="text-xs text-brand-muted block mt-0.5">
                Timestamp: {portfolioReport.generated_at}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-stone-50 border border-brand-border text-center">
              <span className="text-[10px] uppercase font-bold text-brand-muted block">Tenders Monitored</span>
              <span className="font-mono text-lg font-bold text-brand-charcoal">
                {portfolioReport.portfolio_metrics.total_tenders}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 border border-brand-border text-center">
              <span className="text-[10px] uppercase font-bold text-brand-muted block">Contractors Analyzed</span>
              <span className="font-mono text-lg font-bold text-brand-charcoal">
                {portfolioReport.portfolio_metrics.total_companies}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">High-Suspicion Flags</span>
              <span className="font-mono text-lg font-bold text-amber-950">
                {portfolioReport.portfolio_metrics.high_or_very_high_suspicion_tenders}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Open Alerts</span>
              <span className="font-mono text-lg font-bold text-rose-950">
                {portfolioReport.portfolio_metrics.open_alerts}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-stone-50 border border-brand-border space-y-2 text-xs">
            <span className="font-bold text-brand-charcoal block">Co-Bidding Pattern Syndication Metrics:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-muted block">Repeated Pairs</span>
                <span className="font-mono font-bold text-brand-charcoal">{portfolioReport.pattern_overview.repeated_company_pairs}</span>
              </div>
              <div className="p-2 rounded bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-muted block">Unusual Patterns</span>
                <span className="font-mono font-bold text-brand-charcoal">{portfolioReport.pattern_overview.unusual_patterns_found}</span>
              </div>
              <div className="p-2 rounded bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-muted block">Similar Price Pairs</span>
                <span className="font-mono font-bold text-brand-charcoal">{portfolioReport.pattern_overview.similar_price_pairs}</span>
              </div>
              <div className="p-2 rounded bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-muted block">Alternating Winners</span>
                <span className="font-mono font-bold text-brand-charcoal">{portfolioReport.pattern_overview.alternating_winners_pairs}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-brand-border text-[11px] text-brand-muted italic leading-relaxed">
            <strong>Disclaimer: </strong> {portfolioReport.disclaimer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
