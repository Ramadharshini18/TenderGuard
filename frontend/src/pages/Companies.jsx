import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  DollarSign,
  Briefcase,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  fetchCompanyParticipationHistory,
} from '../services/api';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export default function Companies() {
  const { token } = useAuth();

  // State: List & pagination
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // State: Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [detailModalCompany, setDetailModalCompany] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteModalCompany, setDeleteModalCompany] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Form State
  const initialFormData = {
    company_id: '',
    company_name: '',
    registration_number: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    country: 'United States',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load companies
  const loadCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchCompanies(
        {
          search: searchQuery,
          page: currentPage,
          page_size: pageSize,
        },
        token
      );

      if (res.success) {
        setCompanies(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setError(res.error || 'Failed to retrieve companies.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentPage, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadCompanies();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData(initialFormData);
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (company) => {
    setFormMode('edit');
    setFormData({
      company_id: company.company_id,
      company_name: company.company_name,
      registration_number: company.registration_number || '',
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      address: company.address || '',
      city: company.city || '',
      country: company.country || 'United States',
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Open Detail / History Modal
  const handleOpenDetail = async (company) => {
    setDetailModalCompany(company);
    setIsLoadingHistory(true);
    setHistoryData(null);
    try {
      const res = await fetchCompanyParticipationHistory(company.id, token);
      if (res.success && res.data) {
        const items = res.data.participations || res.data.history || [];
        setHistoryData({
          ...res.data,
          participations: items,
          total_participations: res.data.total_participations ?? items.length,
          total_won: res.data.total_won ?? items.filter((p) => p.participation_result === 'Won').length,
          total_lost: res.data.total_lost ?? items.filter((p) => p.participation_result === 'Lost').length,
          total_disqualified: res.data.total_disqualified ?? items.filter((p) => p.participation_result === 'Disqualified' || p.qualification_status === 'Not Qualified').length,
          total_pending: res.data.total_pending ?? items.filter((p) => p.participation_result === 'Pending' || p.qualification_status === 'Pending Review').length,
        });
      } else {
        setHistoryData({
          participations: [],
          total_participations: 0,
          total_won: 0,
          total_lost: 0,
          total_disqualified: 0,
          total_pending: 0,
        });
      }
    } catch (err) {
      console.error('Error loading company history:', err);
      setHistoryData({
        participations: [],
        total_participations: 0,
        total_won: 0,
        total_lost: 0,
        total_disqualified: 0,
        total_pending: 0,
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.company_name.trim()) errors.company_name = 'Company name is required';
    if (formMode === 'create' && !formData.company_id.trim()) {
      errors.company_id = 'Company ID is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      let res;
      if (formMode === 'create') {
        res = await createCompany(formData, token);
      } else {
        res = await updateCompany(formData.company_id, formData, token);
      }

      if (res.success) {
        setFormModalOpen(false);
        loadCompanies();
      } else {
        setFormErrors({ submit: res.error || 'Action failed.' });
      }
    } catch (err) {
      setFormErrors({ submit: err.message || 'Network error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteModalCompany) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteCompany(deleteModalCompany.id, token);
      if (res.success) {
        setDeleteModalCompany(null);
        loadCompanies();
      } else {
        setDeleteError(res.error || 'Failed to delete company.');
      }
    } catch (err) {
      setDeleteError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
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
      {/* Header */}
      <PageHeader
        title="Participating Companies Registry"
        subtitle="Catalog of registered corporations, suppliers, and contractor organizations participating in procurement tenders."
        category="Bidder & Company Directory"
        actions={
          <Button variant="primary" size="sm" iconLeft={Plus} onClick={handleOpenCreate}>
            + Register Company
          </Button>
        }
      />

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company name, registration number, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-brand-bg/60 border border-brand-border rounded-lg text-brand-charcoal placeholder-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
                loadCompanies();
              }}
              className="text-xs text-brand-muted"
            >
              Clear
            </Button>
          )}
        </form>

        <div className="text-xs text-brand-muted flex items-center gap-2">
          <span>Total registered companies:</span>
          <span className="font-mono font-bold text-brand-primary px-2 py-0.5 rounded bg-brand-accent-light">
            {totalCount}
          </span>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Retrieving registered companies registry..." />
        ) : error ? (
          <ErrorState title="Failed to Load Companies" message={error} onRetry={loadCompanies} />
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={searchQuery ? 'No matching companies' : 'No companies registered'}
            description={
              searchQuery
                ? 'Try a different search query or clear the filter.'
                : 'Get started by registering contractor organizations and participating bidders.'
            }
            actionText="+ Register Company"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-brand-charcoal">
              <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                <tr>
                  <th className="px-4 py-3.5">Company ID</th>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Registration No.</th>
                  <th className="px-4 py-3.5">Contact Email</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-brand-bg/60 transition-colors duration-150">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-brand-primary whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(company)}
                        className="hover:underline text-left"
                      >
                        {company.company_id}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-brand-charcoal max-w-xs truncate">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(company)}
                        className="hover:underline hover:text-brand-primary text-left font-medium transition-colors"
                        title="Click to view company profile & participation history"
                      >
                        {company.company_name}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-brand-muted whitespace-nowrap">
                      {company.registration_number || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-brand-charcoal/80 whitespace-nowrap">
                      {company.contact_email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-brand-muted" />
                          {company.contact_email}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-brand-charcoal/80 whitespace-nowrap">
                      {company.contact_phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-brand-muted" />
                          {company.contact_phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-brand-muted whitespace-nowrap">
                      {company.city ? `${company.city}, ${company.country}` : company.country || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(company)}
                          className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-accent-light/60 transition-colors"
                          title="View Participation History & Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(company)}
                          className="p-1.5 rounded-lg text-brand-secondary hover:bg-brand-accent-light/60 transition-colors"
                          title="Edit Company Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteModalCompany(company);
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-lg text-risk-high hover:bg-red-50 transition-colors"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && !error && companies.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border/60 bg-brand-bg/30 text-xs">
            <span className="text-brand-muted">
              Page <strong className="text-brand-charcoal">{currentPage}</strong> of{' '}
              <strong className="text-brand-charcoal">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ADD / EDIT COMPANY MODAL                              */}
      {/* ======================================================== */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={formMode === 'create' ? 'Register New Company' : `Edit Company: ${formData.company_name}`}
          subtitle="Corporate profile for procurement tender participation tracking"
          maxWidth="max-w-xl"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleFormSubmit}
              >
                {formMode === 'create' ? 'Register Company' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formErrors.submit && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-risk-high flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Company ID *"
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                placeholder="e.g. COMP-1029"
                error={formErrors.company_id}
                disabled={formMode === 'edit'}
                helperText={formMode === 'edit' ? 'ID is immutable' : 'Unique identifier'}
              />
              <Input
                label="Company Name *"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Apex Engineering Ltd"
                error={formErrors.company_name}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Registration / Tax Number"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="e.g. REG-US-992140"
              />
              <Input
                label="Contact Email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="e.g. bids@apex-eng.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contact Phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="e.g. +1 555 204 8820"
              />
              <Input
                label="City / Region"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Denver, CO"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Street Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 400 Corporate Blvd Suite 200"
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. United States"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 2. COMPANY PROFILE & TENDER PARTICIPATION HISTORY MODAL */}
      {/* ======================================================== */}
      {detailModalCompany && (
        <Modal
          isOpen={!!detailModalCompany}
          onClose={() => setDetailModalCompany(null)}
          title={`Company Profile: ${detailModalCompany.company_name}`}
          subtitle={`Identifier: ${detailModalCompany.company_id}`}
          maxWidth="max-w-3xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setDetailModalCompany(null)}>
              Close Profile
            </Button>
          }
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Profile Overview Card */}
            <div className="p-4 rounded-xl bg-brand-bg/50 border border-brand-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-brand-muted block text-[11px]">Registration No.</span>
                <span className="font-mono font-bold text-brand-charcoal block mt-0.5">
                  {detailModalCompany.registration_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Email</span>
                <span className="text-brand-charcoal font-medium block mt-0.5 truncate" title={detailModalCompany.contact_email}>
                  {detailModalCompany.contact_email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Phone</span>
                <span className="text-brand-charcoal font-medium block mt-0.5">
                  {detailModalCompany.contact_phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Location</span>
                <span className="text-brand-charcoal font-medium block mt-0.5">
                  {detailModalCompany.city ? `${detailModalCompany.city}, ${detailModalCompany.country}` : detailModalCompany.country || 'N/A'}
                </span>
              </div>
            </div>

            {/* Participation KPI Stats Banner */}
            {historyData && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-stone-100 border border-brand-border">
                  <span className="text-[10px] uppercase font-bold text-brand-muted block">Tenders</span>
                  <span className="font-mono text-base font-bold text-brand-charcoal">
                    {historyData.total_participations || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Won</span>
                  <span className="font-mono text-base font-bold text-emerald-900">
                    {historyData.total_won || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-600 block">Lost</span>
                  <span className="font-mono text-base font-bold text-stone-800">
                    {historyData.total_lost || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-[10px] uppercase font-bold text-red-800 block">Disqualified</span>
                  <span className="font-mono text-base font-bold text-red-900">
                    {historyData.total_disqualified || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Pending</span>
                  <span className="font-mono text-base font-bold text-blue-900">
                    {historyData.total_pending || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Participation History Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  Tender Participation History
                </h4>
                <span className="text-xs text-brand-muted">
                  Official bidding records across all tenders
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center">
                  <LoadingState message="Loading historical participation data..." />
                </div>
              ) : !historyData || !historyData.participations || historyData.participations.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-brand-border bg-brand-bg/40">
                  <p className="text-xs text-brand-muted">
                    This company has not participated in any tenders yet.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-brand-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-accent-light/50 border-b border-brand-border text-[11px] font-semibold uppercase text-brand-charcoal">
                      <tr>
                        <th className="px-3 py-2.5">Tender ID</th>
                        <th className="px-3 py-2.5">Tender Title</th>
                        <th className="px-3 py-2.5 text-right">Quoted Price</th>
                        <th className="px-3 py-2.5 text-center">Qualification</th>
                        <th className="px-3 py-2.5 text-center">Result</th>
                        <th className="px-3 py-2.5 text-right">Submission Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 bg-white">
                      {historyData.participations.map((part, pIdx) => (
                        <tr key={part.participation_id || part.id || pIdx} className="hover:bg-brand-bg/40">
                          <td className="px-3 py-2.5 font-mono font-bold text-brand-primary whitespace-nowrap">
                            {part.tender_id_code || part.tender_code || (part.tender_numeric_id ? `TND-${part.tender_numeric_id}` : '—')}
                          </td>
                          <td className="px-3 py-2.5 max-w-xs truncate text-brand-charcoal font-medium">
                            {part.tender_title || 'Procurement Tender'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-brand-charcoal whitespace-nowrap">
                            {formatCurrency(part.quoted_price, part.currency)}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                part.qualification_status === 'Qualified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : part.qualification_status === 'Not Qualified'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {part.qualification_status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                part.participation_result === 'Won'
                                  ? 'bg-emerald-600 text-white'
                                  : part.participation_result === 'Lost'
                                  ? 'bg-stone-200 text-stone-700'
                                  : part.participation_result === 'Disqualified'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {part.participation_result}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-brand-muted whitespace-nowrap">
                            {part.submission_date || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 3. SAFE DELETE CONFIRMATION MODAL                        */}
      {/* ======================================================== */}
      {deleteModalCompany && (
        <Modal
          isOpen={!!deleteModalCompany}
          onClose={() => setDeleteModalCompany(null)}
          title="Confirm Company Deletion"
          subtitle="Safe deletion check: companies with active tender participations cannot be removed"
          maxWidth="max-w-md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalCompany(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleDeleteConfirm}
              >
                Delete Company
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-risk-high flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Action Blocked:</span>
                  <span>{deleteError}</span>
                </div>
              </div>
            )}

            <p className="text-brand-charcoal">
              Are you sure you want to remove{' '}
              <strong className="text-brand-primary">{deleteModalCompany.company_name}</strong> (
              <span className="font-mono">{deleteModalCompany.company_id}</span>)?
            </p>
            <p className="text-brand-muted text-[11px] leading-relaxed">
              If this company has participated in any tenders, the system will prevent deletion to
              preserve procurement audit history.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
