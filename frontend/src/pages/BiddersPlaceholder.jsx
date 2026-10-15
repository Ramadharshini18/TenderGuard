import React from 'react';
import { Building2, UserPlus, Filter } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import DemoBanner from '../components/common/DemoBanner';

export default function BiddersPlaceholder() {
  return (
    <div className="space-y-6">
      <DemoBanner />
      <PageHeader
        title="Contractor & Bidder Profiles"
        subtitle="Catalog of registered corporations, joint ventures, and bidding consortiums participating in state tenders."
        category="Bidder Management"
        actions={
          <>
            <Button variant="outline" size="sm" iconLeft={Filter}>
              Filter Entities
            </Button>
            <Button variant="primary" size="sm" iconLeft={UserPlus}>
              Register Contractor
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
        <EmptyState
          icon={Building2}
          title="Bidder management directory."
          description="This section hosts contractor identity records, ownership hierarchies, shell company indicators, and cross-company bidding syndication histories."
          actionText="View Active Directory"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
