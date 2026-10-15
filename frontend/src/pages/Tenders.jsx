import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  X,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building,
  MapPin,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import DemoBanner from '../components/common/DemoBanner';
import { useAuth } from '../context/AuthContext';
import {
  fetchTenders,
  fetchTenderById,
  createTender,
  updateTender,
  deleteTender,
  fetchTenderParticipants,
  addTenderParticipant,
  deleteTenderParticipant,
  fetchCompanies,
  fetchTenderPatternSummary,
} from '../services/api';

const CATEGORIES = [
  'Infrastructure',
  'Transportation',
  'Healthcare & Medical Supplies',
  'Education',
  'Information Technology',
  'Public Utilities',
  'Energy & Power',
  'Civil Works',
  'Environmental Services',
  'Other',
];

const STATUSES = [
  'Draft',
  'Published',
  'Closed',
  'Under Evaluation',
  'Awarded',
  'Cancelled',
];

const SORT_OPTIONS = [
  { label: 'Recently Created (Newest)', sort_by: 'created_at', sort_order: 'desc' },
  { label: 'Highest Estimated Value', sort_by: 'estimated_value', sort_order: 'desc' },
  { label: 'Lowest Estimated Value', sort_by: 'estimated_value', sort_order: 'asc' },
  { label: 'Submission Deadline (Soonest)', sort_by: 'submission_deadline', sort_order: 'asc' },
  { label: 'Tender ID (A-Z)', sort_by: 'tender_id', sort_order: 'asc' },
];

export default function Tenders() {
  const { token, user } = useAuth();

  // Data state
  const [tenders, setTenders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedValueRange, setSelectedValueRange] = useState('All');
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);

  // Modals state
  const [detailModalTender, setDetailModalTender] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingTender, setEditingTender] = useState(null);
  const [deleteModalTender, setDeleteModalTender] = useState(null);

  // Participation and pattern state
  const [participantsSummary, setParticipantsSummary] = useState(null);
  const [tenderPatternSummary, setTenderPatternSummary] = useState(null);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [addParticipantModalOpen, setAddParticipantModalOpen] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [participantFormData, setParticipantFormData] = useState({
    company_id: '',
    quoted_price: '',
    qualification_status: 'Qualified',
    participation_result: 'Pending',
    notes: '',
  });
  const [participantError, setParticipantError] = useState(null);
  const [winnerConflictPrompt, setWinnerConflictPrompt] = useState(null); // holds error detail and allows user override
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState(false);

  // Form State
  const initialFormState = {
    tender_id: '',
    title: '',
    description: '',
    category: CATEGORIES[0],
    sub_category: '',
    procurement_authority: '',
    location: '',
    estimated_value: '',
    currency: 'USD',
    publication_date: new Date().toISOString().split('T')[0],
    submission_deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    opening_date: new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0],
    status: 'Published',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load tenders from API
  const loadTenders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let min_value = '';
    let max_value = '';
    if (selectedValueRange === 'under1m') {
      max_value = 1000000;
    } else if (selectedValueRange === '1m_to_10m') {
      min_value = 1000000;
      max_value = 10000000;
    } else if (selectedValueRange === 'over10m') {
      min_value = 10000000;
    }

    const params = {
      search: debouncedSearch,
      category: selectedCategory,
      status: selectedStatus,
      min_value,
      max_value,
      sort_by: selectedSort.sort_by,
      sort_order: selectedSort.sort_order,
      page: currentPage,
      page_size: pageSize,
    };

    const res = await fetchTenders(params, token);
    if (res.success) {
      setTenders(res.data.items);
      setTotalCount(res.data.total);
      setTotalPages(res.data.total_pages);
    } else {
      setError(res.error);
    }
    setIsLoading(false);
  }, [debouncedSearch, selectedCategory, selectedStatus, selectedValueRange, selectedSort, currentPage, pageSize, token]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  // Value formatting helper
  const formatCurrency = (val, currency = 'USD') => {
    if (!val && val !== 0) return 'N/A';
    const num = parseFloat(val);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedValueRange('All');
    setSelectedSort(SORT_OPTIONS[0]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedCategory !== 'All' ||
    selectedStatus !== 'All' ||
    selectedValueRange !== 'All';

  // Open Create Form
  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingTender(null);
    // Generate a suggested sequential ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setFormData({
      ...initialFormState,
      tender_id: `TND-${new Date().getFullYear()}-${randomSuffix}`,
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (t) => {
    setFormMode('edit');
    setEditingTender(t);
    setFormData({
      tender_id: t.tender_id,
      title: t.title,
      description: t.description || '',
      category: t.category,
      sub_category: t.sub_category || '',
      procurement_authority: t.procurement_authority,
      location: t.location,
      estimated_value: t.estimated_value.toString(),
      currency: t.currency || 'USD',
      publication_date: t.publication_date,
      submission_deadline: t.submission_deadline,
      opening_date: t.opening_date,
      status: t.status,
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  // Validate form fields
  const validateForm = () => {
    const errs = {};
    if (!formData.tender_id.trim()) errs.tender_id = 'Tender ID is required.';
    if (!formData.title.trim()) errs.title = 'Tender Title is required.';
    else if (formData.title.trim().length < 5) errs.title = 'Title must be at least 5 characters.';

    if (!formData.procurement_authority.trim()) errs.procurement_authority = 'Procurement Authority is required.';
    if (!formData.location.trim()) errs.location = 'Location is required.';

    const val = parseFloat(formData.estimated_value);
    if (!formData.estimated_value || isNaN(val) || val <= 0) {
      errs.estimated_value = 'Estimated value must be a valid positive number.';
    }

    if (!formData.publication_date) errs.publication_date = 'Publication date is required.';
    if (!formData.submission_deadline) errs.submission_deadline = 'Submission deadline is required.';
    if (!formData.opening_date) errs.opening_date = 'Opening date is required.';

    if (formData.publication_date && formData.submission_deadline) {
      if (formData.submission_deadline < formData.publication_date) {
        errs.submission_deadline = 'Submission deadline must be on or after publication date.';
      }
    }
    if (formData.submission_deadline && formData.opening_date) {
      if (formData.opening_date < formData.submission_deadline) {
        errs.opening_date = 'Opening date must be on or after submission deadline.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    const payload = {
      ...formData,
      tender_id: formData.tender_id.trim().toUpperCase(),
      estimated_value: parseFloat(formData.estimated_value),
    };

    let res;
    if (formMode === 'create') {
      res = await createTender(payload, token);
    } else {
      res = await updateTender(editingTender.tender_id, payload, token);
    }

    setIsSubmitting(false);

    if (res.success) {
      setFormModalOpen(false);
      loadTenders();
      if (detailModalTender && detailModalTender.id === res.data.id) {
        setDetailModalTender(res.data);
      }
    } else {
      setFormErrors({ submit: res.error || 'Failed to save tender.' });
    }
  };

  // Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteModalTender) return;
    setIsSubmitting(true);
    const res = await deleteTender(deleteModalTender.tender_id, token);
    setIsSubmitting(false);
    if (res.success) {
      setDeleteModalTender(null);
      if (detailModalTender && detailModalTender.id === deleteModalTender.id) {
        setDetailModalTender(null);
      }
      loadTenders();
    } else {
      alert(res.error || 'Failed to delete tender.');
    }
  };

  // ==========================================
  // PARTICIPATION ACTIONS
  // ==========================================

  // Load participants for the active tender in detail modal
  const loadParticipants = async (tenderId) => {
    setIsLoadingParticipants(true);
    setWinnerConflictPrompt(null);
    setParticipantError(null);
    try {
      const res = await fetchTenderParticipants(tenderId, token);
      if (res.success) {
        setParticipantsSummary(res.data);
      } else {
        setParticipantsSummary({
          tender_id: tenderId,
          total_participants: 0,
          qualified_count: 0,
          not_qualified_count: 0,
          pending_count: 0,
          has_winner: false,
          winner_company_name: null,
          participants: [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  // Open detail modal and fetch participants and pattern summary
  const handleOpenDetailModal = (t) => {
    setDetailModalTender(t);
    loadParticipants(t.id);
    setTenderPatternSummary(null);
    fetchTenderPatternSummary(t.tender_id || t.id, token)
      .then((res) => {
        if (res.success) setTenderPatternSummary(res.data);
      })
      .catch((err) => console.error(err));
  };

  // Load companies for dropdown when adding a participant
  const handleOpenAddParticipant = async () => {
    setParticipantError(null);
    setWinnerConflictPrompt(null);
    setParticipantFormData({
      company_id: '',
      quoted_price: '',
      qualification_status: 'Qualified',
      participation_result: 'Pending',
      notes: '',
    });
    setAddParticipantModalOpen(true);

    try {
      const res = await fetchCompanies({ page_size: 100 }, token);
      if (res.success) {
        setAvailableCompanies(res.data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit adding participant (supports override_winner if conflict detected)
  const handleAddParticipantSubmit = async (overrideWinner = false) => {
    if (!participantFormData.company_id) {
      setParticipantError('Please select a participating company.');
      return;
    }
    if (!participantFormData.quoted_price || parseFloat(participantFormData.quoted_price) <= 0) {
      setParticipantError('Please enter a valid quoted price greater than 0.');
      return;
    }

    setIsSubmittingParticipant(true);
    setParticipantError(null);

    const payload = {
      company_id: parseInt(participantFormData.company_id, 10),
      quoted_price: parseFloat(participantFormData.quoted_price),
      currency: detailModalTender?.currency || 'USD',
      submission_date: new Date().toISOString().split('T')[0],
      qualification_status: participantFormData.qualification_status,
      participation_result: participantFormData.participation_result,
      notes: participantFormData.notes || null,
    };

    const res = await addTenderParticipant(detailModalTender.id, payload, overrideWinner, token);
    setIsSubmittingParticipant(false);

    if (res.success) {
      setAddParticipantModalOpen(false);
      setWinnerConflictPrompt(null);
      loadParticipants(detailModalTender.id);
      loadTenders(); // update bidders_count in list
    } else if (res.isWinnerConflict) {
      setWinnerConflictPrompt(res.winnerConflictDetails);
    } else {
      setParticipantError(res.error || 'Failed to record participation.');
    }
  };

  // Remove participant from tender
  const handleDeleteParticipant = async (participationId) => {
    if (!confirm('Are you sure you want to remove this participating company from this tender?')) {
      return;
    }
    const res = await deleteTenderParticipant(detailModalTender.id, participationId, token);
    if (res.success) {
      loadParticipants(detailModalTender.id);
      loadTenders();
    } else {
      alert(res.error || 'Failed to remove participant.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Demonstration Banner */}
      <DemoBanner />

      {/* Page Header */}
      <PageHeader
        title="Tender Management"
        subtitle="Monitor and manage procurement tenders across the platform. Clean structured records prepared for bidder graph analysis."
        category="Tender Registry"
        actions={
          <Button
            variant="primary"
            size="sm"
            iconLeft={Plus}
            onClick={handleOpenCreate}
          >
            Create New Tender
          </Button>
        }
      />

      {/* Search, Filter & Sorting Bar */}
      <div className="bg-white rounded-xl border border-brand-border/80 p-4 shadow-card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Field */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, authority, location, or sector..."
              className="w-full pl-9 pr-8 py-2 text-xs lg:text-sm bg-brand-bg border border-brand-border rounded-lg text-brand-charcoal placeholder-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-muted hover:text-brand-charcoal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Value Range Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedValueRange}
              onChange={(e) => {
                setSelectedValueRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="All">All Values</option>
              <option value="under1m">&lt; $1,000,000</option>
              <option value="1m_to_10m">$1M – $10M</option>
              <option value="over10m">&gt; $10,000,000</option>
            </select>
          </div>
        </div>

        {/* Second Row: Sort selector & Active filters reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-brand-muted flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
            </span>
            <select
              value={`${selectedSort.sort_by}_${selectedSort.sort_order}`}
              onChange={(e) => {
                const match = SORT_OPTIONS.find(
                  (opt) => `${opt.sort_by}_${opt.sort_order}` === e.target.value
                );
                if (match) setSelectedSort(match);
              }}
              className="py-1 px-2.5 bg-brand-bg/70 border border-brand-border rounded-md text-xs text-brand-charcoal font-medium"
            >
              {SORT_OPTIONS.map((opt) => (
                <option
                  key={`${opt.sort_by}_${opt.sort_order}`}
                  value={`${opt.sort_by}_${opt.sort_order}`}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-brand-muted">
              Total registered: <strong className="text-brand-charcoal font-mono">{totalCount}</strong>
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                iconLeft={X}
                onClick={handleResetFilters}
                className="text-xs text-risk-high hover:text-red-700 py-1"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tender List Table Area */}
      <div className="bg-white rounded-xl border border-brand-border/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Retrieving procurement tenders registry..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Tenders"
            message={error}
            onRetry={loadTenders}
          />
        ) : tenders.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title={hasActiveFilters ? 'No matching tenders' : 'No tenders found'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search criteria, category, or budget filters.'
                : 'There are currently no active tenders in the registry. Create your first procurement notice.'
            }
            actionText={hasActiveFilters ? 'Reset Filters' : '+ Create New Tender'}
            onAction={hasActiveFilters ? handleResetFilters : handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-brand-charcoal">
              <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
                <tr>
                  <th className="px-4 py-3.5">Tender ID</th>
                  <th className="px-4 py-3.5">Tender Title</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Procurement Authority</th>
                  <th className="px-4 py-3.5 text-right">Estimated Value</th>
                  <th className="px-4 py-3.5 text-center">Bidders</th>
                  <th className="px-4 py-3.5">Deadline</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Risk</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {tenders.map((tender) => (
                  <tr
                    key={tender.id}
                    className="hover:bg-brand-bg/60 transition-colors duration-150 group"
                  >
                    {/* Tender ID */}
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-brand-primary whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(tender)}
                        className="hover:underline flex items-center gap-1 text-left"
                      >
                        {tender.tender_id}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-xs xl:max-w-sm truncate font-medium text-brand-charcoal">
                      <span title={tender.title}>{tender.title}</span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-xs text-brand-muted whitespace-nowrap">
                      {tender.category}
                    </td>

                    {/* Authority */}
                    <td className="px-4 py-3.5 text-xs text-brand-charcoal/80 max-w-[180px] truncate" title={tender.procurement_authority}>
                      {tender.procurement_authority}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-brand-charcoal whitespace-nowrap">
                      {formatCurrency(tender.estimated_value, tender.currency)}
                    </td>

                    {/* Bidders Count */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-accent-light text-brand-charcoal"
                      >
                        <Users className="w-3 h-3 text-brand-muted" />
                        {tender.bidders_count || 0} bidders
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3.5 text-xs text-brand-muted font-mono whitespace-nowrap">
                      {tender.submission_deadline}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={tender.status} />
                    </td>

                    {/* Risk Badge */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <RiskBadge level={tender.risk_status || 'Not Analyzed'} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(tender)}
                          className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-accent-light/60 transition-colors"
                          title="View Tender Dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tender)}
                          className="p-1.5 rounded-lg text-brand-secondary hover:bg-brand-accent-light/60 transition-colors"
                          title="Edit Tender Specifications"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModalTender(tender)}
                          className="p-1.5 rounded-lg text-risk-high hover:bg-red-50 transition-colors"
                          title="Delete Tender"
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
        {!isLoading && !error && tenders.length > 0 && (
          <div className="px-4 py-3 border-t border-brand-border/60 bg-brand-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-brand-muted">
              <span>Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1 px-2 rounded border border-brand-border bg-white text-brand-charcoal text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tenders
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                iconLeft={ChevronLeft}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-3 py-1 rounded bg-white border border-brand-border font-semibold text-brand-charcoal">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                iconRight={ChevronRight}
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
      {/* 1. TENDER DETAILS DOSSIER MODAL (5 Structured Sections)  */}
      {/* ======================================================== */}
      {detailModalTender && (
        <Modal
          isOpen={!!detailModalTender}
          onClose={() => setDetailModalTender(null)}
          title={`Tender Dossier: ${detailModalTender.tender_id}`}
          subtitle="Comprehensive procurement specification and participation overview"
          maxWidth="max-w-2xl"
          footer={
            <div className="w-full flex items-center justify-between">
              <div className="text-xs text-brand-muted">
                Audit: Created by{' '}
                <span className="font-semibold text-brand-charcoal">
                  {detailModalTender.creator?.name || 'Administrator'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModalTender(null)}
                >
                  Close
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={Edit2}
                  onClick={() => {
                    const target = detailModalTender;
                    setDetailModalTender(null);
                    handleOpenEdit(target);
                  }}
                >
                  Edit Dossier
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-sm text-brand-charcoal max-h-[70vh] overflow-y-auto pr-1">
            {/* Section 1: Tender Overview */}
            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border/70 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                    Section 1 • Tender Overview
                  </span>
                  <h4 className="text-base font-bold text-brand-charcoal mt-0.5">
                    {detailModalTender.title}
                  </h4>
                </div>
                <StatusBadge status={detailModalTender.status} />
              </div>
              <p className="text-xs text-brand-charcoal/80 leading-relaxed pt-1">
                {detailModalTender.description || 'No detailed scope description provided.'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-brand-border/40">
                <div>
                  <span className="text-brand-muted block text-[11px]">Primary Sector:</span>
                  <span className="font-semibold">{detailModalTender.category}</span>
                </div>
                <div>
                  <span className="text-brand-muted block text-[11px]">Sub-Category:</span>
                  <span className="font-semibold">{detailModalTender.sub_category || 'General'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Procurement Details */}
            <div className="p-4 rounded-xl border border-brand-border/70 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                Section 2 • Procurement & Financial Authority
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-brand-bg/50 border border-brand-border/40">
                  <span className="text-[10px] text-brand-muted uppercase block">Estimated Value</span>
                  <span className="font-bold text-brand-charcoal font-mono text-sm block mt-0.5">
                    {formatCurrency(detailModalTender.estimated_value, detailModalTender.currency)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-brand-bg/50 border border-brand-border/40">
                  <span className="text-[10px] text-brand-muted uppercase block">Currency</span>
                  <span className="font-bold text-brand-charcoal text-xs block mt-0.5">
                    {detailModalTender.currency || 'USD'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-brand-bg/50 border border-brand-border/40 col-span-2">
                  <span className="text-[10px] text-brand-muted uppercase block">Issuing Authority</span>
                  <span className="font-semibold text-xs text-brand-charcoal block mt-0.5 truncate" title={detailModalTender.procurement_authority}>
                    {detailModalTender.procurement_authority}
                  </span>
                </div>
              </div>
              <div className="text-xs text-brand-muted flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                <span>Jurisdiction / Location: <strong>{detailModalTender.location}</strong></span>
              </div>
            </div>

            {/* Section 3: Important Dates Timeline */}
            <div className="p-4 rounded-xl border border-brand-border/70 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                Section 3 • Procurement Lifecycle Dates
              </span>
              <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
                  <span className="text-[10px] text-emerald-800 font-semibold block">1. Publication Date</span>
                  <span className="font-mono text-xs font-bold text-emerald-950 block mt-0.5">
                    {detailModalTender.publication_date}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-200/60">
                  <span className="text-[10px] text-amber-800 font-semibold block">2. Submission Deadline</span>
                  <span className="font-mono text-xs font-bold text-amber-950 block mt-0.5">
                    {detailModalTender.submission_deadline}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-200/60">
                  <span className="text-[10px] text-blue-800 font-semibold block">3. Opening Date</span>
                  <span className="font-mono text-xs font-bold text-blue-950 block mt-0.5">
                    {detailModalTender.opening_date}
                  </span>
                </div>
              </div>
            </div>

            {/* Participating Companies & Bid Management */}
            <div className="p-4 rounded-xl border border-brand-border bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                    Participating Companies & Quoted Prices
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={Plus}
                    onClick={handleOpenAddParticipant}
                    className="text-xs py-1"
                  >
                    + Add Company
                  </Button>
                </div>
              </div>

              {/* Participation Stats Summary Banner */}
              {participantsSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-stone-50 border border-brand-border/60">
                    <span className="text-[10px] text-brand-muted block uppercase font-bold">Total Companies</span>
                    <span className="font-mono text-sm font-bold text-brand-charcoal">
                      {participantsSummary.total_participants}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block uppercase font-bold">Qualified</span>
                    <span className="font-mono text-sm font-bold text-emerald-900">
                      {participantsSummary.qualified_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <span className="text-[10px] text-red-800 block uppercase font-bold">Not Qualified</span>
                    <span className="font-mono text-sm font-bold text-red-900">
                      {participantsSummary.not_qualified_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-[10px] text-blue-800 block uppercase font-bold">Tender Outcome</span>
                    <span className="font-mono text-xs font-bold text-blue-900 truncate block">
                      {participantsSummary.has_winner
                        ? `Winner: ${participantsSummary.winner_company_name}`
                        : 'No Winner Declared'}
                    </span>
                  </div>
                </div>
              )}

              {/* Participants Table */}
              {isLoadingParticipants ? (
                <div className="py-4 text-center">
                  <LoadingState message="Loading participating companies..." />
                </div>
              ) : !participantsSummary || participantsSummary.participants.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-brand-border bg-brand-bg/40 text-center">
                  <p className="text-xs text-brand-muted">
                    No companies have been recorded for this tender yet. Click "+ Add Company" to record participating bidders.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-brand-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-accent-light/50 border-b border-brand-border text-[11px] font-semibold uppercase text-brand-charcoal">
                      <tr>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2 text-right">Quoted Price</th>
                        <th className="px-3 py-2 text-center">Qualification</th>
                        <th className="px-3 py-2 text-center">Result</th>
                        <th className="px-3 py-2 text-right">Submission Date</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 bg-white">
                      {participantsSummary.participants.map((p) => (
                        <tr key={p.id} className="hover:bg-brand-bg/30">
                          <td className="px-3 py-2">
                            <span className="font-semibold text-brand-charcoal block">
                              {p.company_name}
                            </span>
                            <span className="font-mono text-[10px] text-brand-muted">
                              {p.company_code}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-brand-charcoal whitespace-nowrap">
                            {formatCurrency(p.quoted_price, p.currency)}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                p.qualification_status === 'Qualified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.qualification_status === 'Not Qualified'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.qualification_status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.participation_result === 'Won'
                                  ? 'bg-emerald-600 text-white'
                                  : p.participation_result === 'Lost'
                                  ? 'bg-stone-200 text-stone-700'
                                  : p.participation_result === 'Disqualified'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {p.participation_result}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-brand-muted whitespace-nowrap">
                            {p.submission_date || '—'}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteParticipant(p.id)}
                              className="p-1 rounded text-risk-high hover:bg-red-50 transition-colors"
                              title="Remove Company from Tender"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Pattern Summary */}
            {tenderPatternSummary && (
              <div className="p-4 rounded-xl border border-brand-border bg-stone-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary block">
                    Historical Co-Bidding Pattern Summary
                  </span>
                  <span className="text-[10px] font-mono text-brand-muted bg-white px-2 py-0.5 rounded border border-brand-border">
                    Pattern Intelligence
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-white border border-brand-border/60">
                    <span className="text-[10px] text-brand-muted block uppercase">Bidders</span>
                    <span className="font-mono font-bold text-brand-charcoal text-xs">
                      {tenderPatternSummary.participating_companies_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-brand-border/60">
                    <span className="text-[10px] text-brand-muted block uppercase">Prior Co-Bidders</span>
                    <span className="font-mono font-bold text-brand-charcoal text-xs">
                      {tenderPatternSummary.companies_with_previous_shared_participation}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-brand-border/60">
                    <span className="text-[10px] text-amber-800 block uppercase">Similar Prices (&le;5%)</span>
                    <span className="font-mono font-bold text-amber-900 text-xs">
                      {tenderPatternSummary.similar_price_pairs_count} pairs
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-brand-border/60">
                    <span className="text-[10px] text-blue-800 block uppercase">Prior Winners</span>
                    <span className="font-mono font-bold text-blue-900 text-xs">
                      {tenderPatternSummary.previous_winner_relationships_count}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-brand-muted leading-relaxed pt-1">
                  {tenderPatternSummary.pattern_notes}
                </p>
              </div>
            )}

            {/* AI Risk Analysis */}
            <div className="p-4 rounded-xl border border-brand-border bg-brand-accent-light/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                    Graph Neural Network Risk Analysis
                  </span>
                </div>
                <RiskBadge level="Not Analyzed" />
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Risk analysis has not been performed yet. A risk score indicates how strongly the observed bidding patterns resemble suspicious patterns. It is not proof that fraud occurred.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-60 cursor-not-allowed text-xs"
                >
                  Analyze Tender
                </Button>
                <span className="text-[11px] text-brand-muted italic">
                  *Use the AI Risk Analysis page for full analysis
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 2. CREATE / EDIT TENDER FORM MODAL                       */}
      {/* ======================================================== */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={formMode === 'create' ? 'Create New Tender Notice' : `Edit Tender: ${formData.tender_id}`}
          subtitle="All fields will be validated and mapped to the procurement graph registry"
          maxWidth="max-w-2xl"
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
                {formMode === 'create' ? 'Register Tender Notice' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {formErrors.submit && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-risk-high flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block border-b border-brand-border/60 pb-1">
                1. Basic Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Tender ID *"
                  value={formData.tender_id}
                  onChange={(e) => setFormData({ ...formData, tender_id: e.target.value })}
                  placeholder="e.g. TND-2026-1042"
                  error={formErrors.tender_id}
                  disabled={formMode === 'edit'}
                  helperText={formMode === 'edit' ? 'Tender ID is immutable' : 'Unique identifier'}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Tender Title *"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Regional Highway Modernization Phase 2"
                    error={formErrors.title}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
                  Scope & Technical Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed specifications, lot breakdowns, and procurement notice scope..."
                  className="block w-full rounded-lg border border-brand-border p-2.5 text-xs text-brand-charcoal placeholder-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Category / Sector *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Sub-Category"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  placeholder="e.g. Road Construction & Asphalt"
                />
              </div>
            </div>

            {/* Procurement Authority & Financials */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block border-b border-brand-border/60 pb-1">
                2. Procurement Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Procurement Authority *"
                  value={formData.procurement_authority}
                  onChange={(e) => setFormData({ ...formData, procurement_authority: e.target.value })}
                  placeholder="e.g. Ministry of Transportation"
                  error={formErrors.procurement_authority}
                />
                <Input
                  label="Location / Jurisdiction *"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Northern Province"
                  error={formErrors.location}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Estimated Budget Value *"
                    type="number"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    placeholder="e.g. 5000000"
                    error={formErrors.estimated_value}
                    icon={DollarSign}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Important Dates */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block border-b border-brand-border/60 pb-1">
                3. Lifecycle Dates (Sequential Verification)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Publication Date *"
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                  error={formErrors.publication_date}
                />
                <Input
                  label="Submission Deadline *"
                  type="date"
                  value={formData.submission_deadline}
                  onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                  error={formErrors.submission_deadline}
                />
                <Input
                  label="Opening Date *"
                  type="date"
                  value={formData.opening_date}
                  onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                  error={formErrors.opening_date}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider block border-b border-brand-border/60 pb-1">
                4. Operational Status
              </span>
              <div>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full py-2.5 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 3. DELETE CONFIRMATION DIALOG MODAL                      */}
      {/* ======================================================== */}
      {deleteModalTender && (
        <Modal
          isOpen={!!deleteModalTender}
          onClose={() => setDeleteModalTender(null)}
          title="Delete Tender Notice?"
          subtitle="Confirm removal from active procurement registry"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalTender(null)}
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
                Delete Tender
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-brand-charcoal">
            <p>
              You are about to delete tender notice:
            </p>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="font-mono text-xs font-bold text-risk-high">
                {deleteModalTender.tender_id}
              </div>
              <div className="text-xs font-semibold text-brand-charcoal mt-0.5">
                {deleteModalTender.title}
              </div>
            </div>
            <p className="text-xs text-brand-muted">
              This tender will be removed from the active registry. Its record is preserved safely in the database via soft-deletion to ensure graph and bidder integrity are not corrupted.
            </p>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 4. ADD PARTICIPATING COMPANY MODAL                       */}
      {/* ======================================================== */}
      {addParticipantModalOpen && (
        <Modal
          isOpen={addParticipantModalOpen}
          onClose={() => setAddParticipantModalOpen(false)}
          title={`Add Participating Company: ${detailModalTender?.tender_id}`}
          subtitle="Record bidding price, qualification status, and preliminary result"
          maxWidth="max-w-lg"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddParticipantModalOpen(false)}
                disabled={isSubmittingParticipant}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmittingParticipant}
                onClick={() => handleAddParticipantSubmit(false)}
              >
                Record Participation
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {participantError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-risk-high flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{participantError}</span>
              </div>
            )}

            {/* Winner Conflict Override Warning Banner */}
            {winnerConflictPrompt && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Winner Conflict Warning:</span>
                    <p className="text-[11px] leading-relaxed mt-0.5">
                      {winnerConflictPrompt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWinnerConflictPrompt(null)}
                    className="text-[11px] py-1"
                  >
                    Keep Existing Winner
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddParticipantSubmit(true)}
                    className="text-[11px] py-1 bg-amber-700 hover:bg-amber-800"
                  >
                    Override & Designate This Company
                  </Button>
                </div>
              </div>
            )}

            {/* Company Selection */}
            <div>
              <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                Select Company *
              </label>
              <select
                value={participantFormData.company_id}
                onChange={(e) =>
                  setParticipantFormData({ ...participantFormData, company_id: e.target.value })
                }
                className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                <option value="">-- Choose from Registered Companies --</option>
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.company_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Quoted Price */}
            <div>
              <Input
                label="Quoted Price ($) *"
                type="number"
                step="0.01"
                value={participantFormData.quoted_price}
                onChange={(e) =>
                  setParticipantFormData({ ...participantFormData, quoted_price: e.target.value })
                }
                placeholder="e.g. 14250000"
                helperText="Actual financial bid amount submitted by the company"
              />
            </div>

            {/* Qualification Status & Result */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                  Qualification Status
                </label>
                <select
                  value={participantFormData.qualification_status}
                  onChange={(e) =>
                    setParticipantFormData({
                      ...participantFormData,
                      qualification_status: e.target.value,
                    })
                  }
                  className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                >
                  <option value="Qualified">Qualified</option>
                  <option value="Not Qualified">Not Qualified</option>
                  <option value="Pending Review">Pending Review</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                  Participation Result
                </label>
                <select
                  value={participantFormData.participation_result}
                  onChange={(e) =>
                    setParticipantFormData({
                      ...participantFormData,
                      participation_result: e.target.value,
                    })
                  }
                  className="w-full py-2 px-3 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                >
                  <option value="Pending">Pending</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                  <option value="Disqualified">Disqualified</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1">
                Auditor Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={participantFormData.notes}
                onChange={(e) =>
                  setParticipantFormData({ ...participantFormData, notes: e.target.value })
                }
                placeholder="Technical evaluations, bid bond validation, notes..."
                className="w-full p-2.5 text-xs bg-white border border-brand-border rounded-lg text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
