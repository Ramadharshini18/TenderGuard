import React from 'react';
import { Info } from 'lucide-react';

export default function DemoBanner({ className = '' }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 bg-brand-accent-light/70 border border-brand-accent/50 rounded-lg text-xs md:text-sm text-brand-charcoal/80 ${className}`}
      role="note"
      aria-label="Demonstration Notice"
    >
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
        <Info className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <span className="font-semibold text-brand-primary">Demonstration Notice: </span>
        <span>
          The displayed KPI statistics and sample tender records on this dashboard are demonstration data and do not reflect real procurement results. Use the Tender Registry and AI Risk Analysis for live data.
        </span>
      </div>
      <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium tracking-wide bg-brand-accent text-brand-charcoal uppercase">
        Demo
      </span>
    </div>
  );
}
