import React from 'react';
import { FileSpreadsheet, Plus, Upload, Filter } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import DemoBanner from '../components/common/DemoBanner';

export default function TendersPlaceholder() {
  return (
    <div className="space-y-6">
      <DemoBanner />
      <PageHeader
        title="Tender Registry & Management"
        subtitle="Comprehensive database of public procurement notices, technical specifications, and historical lots."
        category="Tender Management"
        actions={
          <>
            <Button variant="outline" size="sm" iconLeft={Upload}>
              Import Notices
            </Button>
            <Button variant="primary" size="sm" iconLeft={Plus}>
              Register Tender
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
        <EmptyState
          icon={FileSpreadsheet}
          title="Tender management directory."
          description="Administrators can ingest tender dossiers, configure tender categories, record procurement dates, and inspect bidder participant pools."
          actionText="View Tender Registry"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
