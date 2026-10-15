import React from 'react';
import { BellRing, CheckSquare, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import DemoBanner from '../components/common/DemoBanner';

export default function AlertsPlaceholder() {
  return (
    <div className="space-y-6">
      <DemoBanner />
      <PageHeader
        title="Fraud & Collusion Early Warnings"
        subtitle="Real-time triaging, auditor escalation queues, and automated incident flags."
        category="Alerts System"
        actions={
          <>
            <Button variant="outline" size="sm" iconLeft={CheckSquare}>
              Acknowledge All
            </Button>
            <Button variant="primary" size="sm" iconLeft={AlertTriangle}>
              Configure Alert Thresholds
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
        <EmptyState
          icon={BellRing}
          title="Suspicious tender alerts will appear here."
          description="Automated alerts triggered by anomaly thresholds and rule triggers are dispatched here for procurement investigator review."
          actionText="Alert Engine Active"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
