export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split('.');
  let formatted = '';
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    formatted = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    while (rest.length > 2) {
      formatted = rest.slice(-2) + ',' + formatted;
      rest = rest.slice(0, -2);
    }
    if (rest) formatted = rest + ',' + formatted;
  }
  return `${isNeg ? '-' : ''}₹${formatted}.${decPart}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case 'filed': return '#22c55e';
    case 'validated': return '#3b82f6';
    case 'draft': return '#f59e0b';
    case 'pending': return '#f59e0b';
    case 'active': return '#ef4444';
    case 'closed': return '#6b7280';
    default: return '#6b7280';
  }
}

export function deadlineColor(status: string): string {
  switch (status) {
    case 'green': return '#22c55e';
    case 'amber': return '#f59e0b';
    case 'red': return '#ef4444';
    case 'overdue': return '#7f1d1d';
    default: return '#6b7280';
  }
}
