import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, Download } from 'lucide-react';

export default function FilterBar({ filters = {}, onChange, onReset, config = [], onExport, resultCount }) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = config.some(c => {
    const v = filters[c.key];
    return v && v !== '' && v !== 'All';
  });

  const activeCount = config.filter(c => {
    const v = filters[c.key];
    return v && v !== '' && v !== 'All';
  }).length;

  const searchFields = config.filter(c => c.type === 'text' && c.primary);
  const extraFields = config.filter(c => !(c.type === 'text' && c.primary));

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      marginBottom: '16px',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}>
      {/* Primary row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap' }}>
        {searchFields.map(field => (
          <div key={field.key} style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '13px', height: '38px' }}
              placeholder={field.placeholder || `Search ${field.label}...`}
              value={filters[field.key] || ''}
              onChange={e => onChange(field.key, e.target.value)}
            />
            {filters[field.key] && (
              <button onClick={() => onChange(field.key, '')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {extraFields.length > 0 && (
          <button onClick={() => setExpanded(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, height: '38px', whiteSpace: 'nowrap', cursor: 'pointer',
            border: hasActiveFilters ? '2px solid #1e3a8a' : '1px solid #e2e8f0',
            background: hasActiveFilters ? '#eff6ff' : '#f8fafc',
            color: hasActiveFilters ? '#1e3a8a' : '#64748b'
          }}>
            <Filter size={14} />
            Filters
            {activeCount > 0 && (
              <span style={{ background: '#1e3a8a', color: '#fff', borderRadius: '10px', fontSize: '11px', fontWeight: 800, padding: '0 6px', minWidth: '18px', textAlign: 'center' }}>
                {activeCount}
              </span>
            )}
            <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        )}

        {hasActiveFilters && (
          <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid #fca5a5', background: '#fff1f2', color: '#dc2626', cursor: 'pointer', height: '38px', whiteSpace: 'nowrap' }}>
            <X size={13} /> Clear All
          </button>
        )}

        {resultCount !== undefined && (
          <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}

        {onExport && (
          <button onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', height: '38px', whiteSpace: 'nowrap' }}>
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && extraFields.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', background: '#fafbfc' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
            {extraFields.map(field => (
              <div key={field.key} style={{ minWidth: '150px', flex: field.flex || '0 1 auto' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  {field.label}
                </label>

                {field.type === 'select' && (
                  <select className="form-select" style={{ fontSize: '13px', height: '36px' }}
                    value={filters[field.key] || 'All'}
                    onChange={e => onChange(field.key, e.target.value)}>
                    <option value="All">All</option>
                    {(field.options || []).map(opt => (
                      <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'date' && (
                  <input type="date" className="form-input" style={{ fontSize: '13px', height: '36px' }}
                    value={filters[field.key] || ''}
                    onChange={e => onChange(field.key, e.target.value)} />
                )}

                {field.type === 'amount' && (
                  <input type="number" className="form-input" style={{ fontSize: '13px', height: '36px' }}
                    placeholder={field.placeholder || '0'}
                    value={filters[field.key] || ''}
                    onChange={e => onChange(field.key, e.target.value)} />
                )}

                {(field.type === 'text' && !field.primary) && (
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" style={{ fontSize: '13px', height: '36px' }}
                      placeholder={field.placeholder || field.label}
                      value={filters[field.key] || ''}
                      onChange={e => onChange(field.key, e.target.value)} />
                    {filters[field.key] && (
                      <button onClick={() => onChange(field.key, '')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return alert('No data to export');
  const keys = Object.keys(data[0]);
  const rows = [
    keys.join(','),
    ...data.map(row => keys.map(k => {
      const v = row[k] === null || row[k] === undefined ? '' : String(row[k]);
      return (v.includes(',') || v.includes('"') || v.includes('\n')) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
