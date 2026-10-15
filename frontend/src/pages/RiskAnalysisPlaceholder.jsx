import React from 'react';
import { GitFork, Play } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import DemoBanner from '../components/common/DemoBanner';

export default function RiskAnalysisPlaceholder() {
  return (
    <div className="space-y-6">
      <DemoBanner />
      <PageHeader
        title="Graph Neural Network Risk Engine"
        subtitle="Multi-relational graph analysis detecting tender fraud, bidder collusion, and cartel behaviors."
        category="AI Risk Analysis & GNN"
        actions={
          <Button variant="primary" size="sm" iconLeft={Play} disabled>
            Run GNN Inference
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-brand-border/80 p-8 shadow-card">
        <EmptyState
          icon={GitFork}
          title="AI-powered tender risk analysis."
          description="Bipartite graph construction and Graph Neural Network models compute suspicion scores, structural embeddings, and explainable risk indicators."
          actionText="GNN Model Active"
          onAction={() => {}}
        />
      </div>
    </div>
  );
}
