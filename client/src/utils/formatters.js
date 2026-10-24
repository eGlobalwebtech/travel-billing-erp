// Indian Currency Formatter (₹)
export function formatINR(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

// Clean date format (e.g., 25 Oct 2026)
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Inclusive date calculation (inclusive of start date)
export function calculateEndDate(startDateStr, durationDays) {
  if (!startDateStr || !durationDays || durationDays < 1) return startDateStr;
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + (Number(durationDays) - 1));
  return d.toISOString().split('T')[0];
}

// Calculate days difference between today and due date
export function getDaysDiff(dateStr) {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
