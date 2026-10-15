import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtitle,
  keyExtractor = (item, index) => item.id || index,
  className = '',
  onRowClick,
}) {
  if (isLoading) {
    return <LoadingState message="Loading table records..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptySubtitle || 'There are no items matching this criteria.'}
      />
    );
  }

  return (
    <div className={`w-full overflow-hidden border border-brand-border/80 rounded-xl bg-white shadow-card ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-brand-charcoal">
          <thead className="bg-brand-accent-light/50 border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wider text-brand-charcoal/80">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/40">
            {data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row, rowIndex)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-brand-accent-light/30' : 'hover:bg-brand-bg/60'
                }`}
              >
                {columns.map((col, colIndex) => {
                  const cellValue = col.accessor
                    ? typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : row[col.accessor]
                    : null;

                  return (
                    <td
                      key={col.key || colIndex}
                      className={`px-4 py-3.5 whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row, rowIndex) : cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
