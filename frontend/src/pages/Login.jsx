import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Network,
  Cpu,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import DemoBanner from '../components/common/DemoBanner';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState('admin@tenderguard.gov');
  const [password, setPassword] = useState('Admin@TenderGuard2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Please enter your administrator email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        setLocalError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setLocalError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofillDemo = () => {
    setEmail('admin@tenderguard.gov');
    setPassword('Admin@TenderGuard2026');
    setLocalError('');
    clearAuthError();
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen flex bg-brand-bg text-brand-charcoal">
      {/* Left Column: Login Form */}
      <div className="flex-1 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        {/* Top Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-brand-accent shadow-md">
            <Shield className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <span className="font-bold text-lg text-brand-primary leading-none block">
              Tender<span className="text-brand-secondary">Guard</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">
              E-Procurement Intelligence
            </span>
          </div>
        </div>

        {/* Center: Login Form Card */}
        <div className="max-w-md w-full mx-auto my-8">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-accent-light text-brand-primary border border-brand-accent/50 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrative Portal • Verified Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-charcoal tracking-tight">
              Administrator Sign In
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted leading-relaxed">
              Authenticate with your verified credentials to access real-time procurement graph analytics and tender fraud monitoring.
            </p>
          </div>

          {/* Error Notice Banner */}
          {activeError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-risk-high flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{activeError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Official Administrator Email"
              type="email"
              id="admin-email"
              icon={Mail}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError('');
              }}
              placeholder="admin@tenderguard.gov"
              required
              disabled={isSubmitting}
            />

            <div>
              <div className="relative">
                <Input
                  label="Administrative Password"
                  type={showPassword ? 'text' : 'password'}
                  id="admin-password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError('');
                  }}
                  placeholder="Enter administrator password"
                  required
                  disabled={isSubmitting}
                />
                {/* Show / Hide Password Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-brand-muted hover:text-brand-charcoal transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary accent-brand-primary"
                    disabled={isSubmitting}
                  />
                  <span className="text-xs text-brand-muted">Remember this terminal (7 days)</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                iconRight={ArrowRight}
                className="w-full shadow-md"
              >
                Sign In & Authorize Token
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Autofill Banner */}
          <div className="mt-6 p-4 rounded-xl bg-brand-accent-light/40 border border-brand-accent/40 text-xs text-brand-muted">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-brand-primary">
                <KeyRound className="w-3.5 h-3.5" />
                Configured Administrator Credentials:
              </div>
              <button
                type="button"
                onClick={handleAutofillDemo}
                className="text-[11px] font-semibold text-brand-secondary hover:underline"
              >
                Autofill
              </button>
            </div>
            <div className="space-y-0.5 font-mono text-[11px] text-brand-charcoal/90">
              <div>Email: <span className="font-semibold">admin@tenderguard.gov</span></div>
              <div>Password: <span className="font-semibold">Admin@TenderGuard2026</span></div>
            </div>
            <p className="mt-2 text-[10px] text-brand-muted leading-relaxed">
              *Verified against PostgreSQL / SQLite database with cryptographic bcrypt hash & JWT token generation.
            </p>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="max-w-md w-full mx-auto">
          <DemoBanner className="text-[11px] py-2" />
          <p className="mt-3 text-[11px] text-center text-brand-muted/70">
            © 2026 TenderGuard Integrity Framework. Strict Confidentiality & Audit Log Enforced.
          </p>
        </div>
      </div>

      {/* Right Column: Hero Visual & Value Proposition */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-brand-primary-dark via-brand-primary to-brand-secondary p-12 text-white flex-col justify-between overflow-hidden border-l border-brand-primary">
        {/* Subtle decorative grid/graph lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D8CAB6_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top Info */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-brand-accent">
            <Cpu className="w-3.5 h-3.5" />
            Graph Neural Network Monitoring Suite
          </div>
          <span className="text-xs font-mono text-white/60">Secure Access</span>
        </div>

        {/* Center Abstract Procurement Analytics Illustration */}
        <div className="relative z-10 my-auto py-8">
          <div className="max-w-lg">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Protecting Public Procurement with Graph Intelligence
            </h1>
            <p className="text-sm xl:text-base text-white/80 leading-relaxed mb-8">
              TenderGuard monitors multi-party bidding relationships, historical bidder collusion patterns, and irregular tender awards across state and enterprise procurement platforms.
            </p>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent mb-2.5">
                  <Network className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Bipartite Graph Modeling
                </h4>
                <p className="mt-1 text-xs text-white/70">
                  Maps tenders, contractor syndicates, and pricing bids.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent mb-2.5">
                  <Building className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Collusion & Risk Detection
                </h4>
                <p className="mt-1 text-xs text-white/70">
                  Surfaces anomalous bidding clusters and shell corporations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/60">
          <span>Official Public Oversight Portal</span>
          <span className="flex items-center gap-1.5 text-brand-accent">
            <CheckCircle2 className="w-3.5 h-3.5" />
            JWT & Bcrypt Security Verified
          </span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary-dark/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-brand-border">
            <h3 className="text-base font-bold text-brand-charcoal mb-2">
              Password Reset Notice
            </h3>
            <p className="text-xs text-brand-muted leading-relaxed mb-5">
              Self-service password resets are restricted to Department Security Officers. To reset administrator credentials, run the seed command on the server terminal:
              <br /><br />
              <code className="block bg-brand-bg p-2 rounded text-[11px] font-mono text-brand-primary border border-brand-border">
                python seed_admin.py --password NewPassword123
              </code>
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setShowForgotModal(false)}
            >
              Understood
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
