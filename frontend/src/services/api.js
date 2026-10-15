/**
 * Centralized API service for communicating with TenderGuard FastAPI backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function getAuthHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to connect to backend server',
    };
  }
}

/**
 * Submits administrator login credentials to backend JWT authentication endpoint.
 */
export async function loginRequest(email, password, rememberMe = false) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        remember_me: rememberMe,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data.detail || 'Authentication failed. Please check credentials.';
      return { success: false, error: errorMessage };
    }

    return {
      success: true,
      data: {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        user: data.user,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error: Backend server is offline or unreachable.',
    };
  }
}

/**
 * Validates active JWT token and retrieves current administrator profile.
 */
export async function fetchCurrentUser(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    if (!res.ok) {
      return { success: false, error: 'Session expired or invalid.' };
    }

    const user = await res.json();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Signals session termination to backend.
 */
export async function logoutRequest(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    return await res.json().catch(() => ({ success: true }));
  } catch (error) {
    return { success: true };
  }
}

// ==========================================
// TENDER MANAGEMENT API
// ==========================================

/**
 * Retrieves paginated, filtered, and sorted tenders from backend.
 */
export async function fetchTenders(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.min_value !== undefined && params.min_value !== null && params.min_value !== '') query.append('min_value', params.min_value);
    if (params.max_value !== undefined && params.max_value !== null && params.max_value !== '') query.append('max_value', params.max_value);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const res = await fetch(`${API_BASE_URL}/api/v1/tenders?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Server error (${res.status})`);
    }

    return {
      success: true,
      data: data.data || { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve tenders from registry.',
    };
  }
}

/**
 * Retrieves a single tender by ID or tender_id.
 */
export async function fetchTenderById(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Tender not found (${res.status})`);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to load tender details.' };
  }
}

/**
 * Creates a new tender.
 */
export async function createTender(payload, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to register tender.';
      throw new Error(err);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing tender.
 */
export async function updateTender(tenderId, payload, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to update tender.';
      throw new Error(err);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Soft deletes a tender.
 */
export async function deleteTender(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to delete tender.');
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Backward compatibility alias
export const mockLoginRequest = loginRequest;

// ==========================================
// PARTICIPATING COMPANIES API
// ==========================================

/**
 * Retrieves paginated and searchable companies list.
 */
export async function fetchCompanies(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const res = await fetch(`${API_BASE_URL}/api/v1/companies?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Server error (${res.status})`);
    }

    return {
      success: true,
      data: data.data || { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve companies.',
    };
  }
}

/**
 * Retrieves single company details.
 */
export async function fetchCompanyById(companyId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companies/${encodeURIComponent(companyId)}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Company not found (${res.status})`);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to load company profile.' };
  }
}

/**
 * Registers a new company.
 */
export async function createCompany(payload, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companies`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to register company.';
      throw new Error(err);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing company.
 */
export async function updateCompany(companyId, payload, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companies/${encodeURIComponent(companyId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to update company.';
      throw new Error(err);
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a company (fails if participations exist).
 */
export async function deleteCompany(companyId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companies/${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to delete company.');
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves the full tender bidding history for a specific company.
 */
export async function fetchCompanyParticipationHistory(companyId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companies/${encodeURIComponent(companyId)}/participation-history`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to retrieve company bidding history.');
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// TENDER PARTICIPATIONS API
// ==========================================

/**
 * Retrieves participants and summary stats for a specific tender.
 */
export async function fetchTenderParticipants(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}/participants`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to retrieve tender participants.');
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Adds a participating company to a tender.
 */
export async function addTenderParticipant(tenderId, payload, overrideWinner = false, token) {
  try {
    const query = overrideWinner ? '?override_winner=true' : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}/participants${query}`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to add participant.';
      const isWinnerConflict = res.status === 409 && (data.detail && data.detail.includes('already has a designated winner'));
      return { success: false, error: err, isWinnerConflict, winnerConflictDetails: data.detail };
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates a tender participant entry.
 */
export async function updateTenderParticipant(tenderId, participationId, payload, overrideWinner = false, token) {
  try {
    const query = overrideWinner ? '?override_winner=true' : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}/participants/${encodeURIComponent(participationId)}${query}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data.detail ? (Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : data.detail) : 'Failed to update participant.';
      const isWinnerConflict = res.status === 409 && (data.detail && data.detail.includes('already has a designated winner'));
      return { success: false, error: err, isWinnerConflict, winnerConflictDetails: data.detail };
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Removes a participant from a tender.
 */
export async function deleteTenderParticipant(tenderId, participationId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tenders/${encodeURIComponent(tenderId)}/participants/${encodeURIComponent(participationId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to remove participant.');
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// PATTERN ANALYSIS API
// ==========================================

/**
 * Checks if sufficient historical data exists in the database.
 */
export async function fetchDataSufficiency(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/data-sufficiency`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to check data sufficiency.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves summary metrics for pattern analysis dashboard.
 */
export async function fetchPatternSummary(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.threshold_pct) query.append('threshold_pct', params.threshold_pct);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);

    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/summary?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve pattern summary.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves repeated company co-bidding relationships.
 */
export async function fetchCompanyRelationships(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.min_shared) query.append('min_shared', params.min_shared);
    if (params.threshold_pct) query.append('threshold_pct', params.threshold_pct);
    if (params.company_id) query.append('company_id', params.company_id);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);

    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/company-relationships?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve company relationships.');
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves tender-by-tender breakdown for a specific pair of companies.
 */
export async function fetchCompanyPairDetail(companyAId, companyBId, thresholdPct = 5.0, token) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/patterns/company-relationships/${encodeURIComponent(companyAId)}/${encodeURIComponent(companyBId)}?threshold_pct=${thresholdPct}`,
      {
        method: 'GET',
        headers: getAuthHeaders(token),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve company pair detail.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves participation frequency and win rates per company.
 */
export async function fetchCompanyFrequencies(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/company-frequencies`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve company frequencies.');
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves catalog of unusual patterns flagged for AI review.
 */
export async function fetchUnusualPatterns(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.threshold_pct) query.append('threshold_pct', params.threshold_pct);
    if (params.pattern_type && params.pattern_type !== 'All') query.append('pattern_type', params.pattern_type);
    if (params.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);

    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/unusual?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve unusual patterns.');
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves tender-specific pattern and co-bidding summary.
 */
export async function fetchTenderPatternSummary(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/patterns/tender/${encodeURIComponent(tenderId)}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve tender pattern summary.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// RISK ANALYSIS & ALERTS API
// ==========================================

/**
 * Runs deterministic AI risk analysis on a tender.
 */
export async function runRiskAnalysis(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/risk-analysis/tenders/${encodeURIComponent(tenderId)}/run`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to execute risk analysis.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves the latest stored risk analysis for a tender.
 */
export async function fetchLatestRiskAnalysis(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/risk-analysis/tenders/${encodeURIComponent(tenderId)}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve risk analysis.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves list of recently analyzed tenders.
 */
export async function fetchRecentRiskAnalyses(limit = 10, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/risk-analysis/recent?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve recent risk analyses.');
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves active risk alerts with optional filtering.
 */
export async function fetchAlerts(params = {}, token) {
  try {
    const query = new URLSearchParams();
    if (params.status_filter && params.status_filter !== 'All') query.append('status_filter', params.status_filter);
    if (params.severity_filter && params.severity_filter !== 'All') query.append('severity_filter', params.severity_filter);
    if (params.pattern_filter && params.pattern_filter !== 'All') query.append('pattern_filter', params.pattern_filter);

    const res = await fetch(`${API_BASE_URL}/api/v1/alerts?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve alerts.');
    return { success: true, data: data.data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates an alert's triage status (New -> Under Review -> Resolved / Dismissed) and notes.
 */
export async function updateAlertStatus(alertId, payload, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/alerts/${encodeURIComponent(alertId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to update alert.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// REPORTS API
// ==========================================

/**
 * Generates an exhaustive Tender Risk Report.
 */
export async function fetchTenderRiskReport(tenderId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/tender/${encodeURIComponent(tenderId)}`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to generate tender risk report.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generates an overall portfolio risk summary.
 */
export async function fetchOverallRiskSummary(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/overview`, {
      method: 'GET',
      headers: getAuthHeaders(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to retrieve overall risk summary.');
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


