import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import DemoBanner from '../components/common/DemoBanner';

export default function ReportsPlaceholder() {
  return (
    <div className="space-y-6">
      <DemoBanner />
      <PageHeader
        title="Oversight Reports & Dossiers"
        subtitle="Forensic audit exports, court-admissible dossiers, and executive procurement risk summaries."
        category="Reports & Exports"
        actions={
          <>
            <Button variant="outline" size="sm" iconLeft={Calendar}>
              Select Date Range
            </Button>
            <Button variant="primary" size="sm" iconLeft={Download}>
              Export Summary Dossier
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
        <EmptyState
          icon={FileText}
          title="Investigation and analysis reports repository."
          description="Formal forensic audit reports, PDF risk dossiers with subgraph visual evidence, and statistical summaries are compiled and exported."
          actionText="View Active Reports"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
