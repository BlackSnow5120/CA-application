import { useEffect, useState } from 'react';
import { getDashboard } from '../lib/api';
import { formatINR, formatDate } from '../lib/formatters';
import type { DashboardSummary } from '../types';
import { Users, TrendingUp, FileText, AlertCircle, Calendar } from 'lucide-react';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    filed: 'badge-green', validated: 'badge-blue',
    draft: 'badge-amber', pending: 'badge-amber',
    no_data: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading dashboard…</p>
    </div>
  );

  if (!data) return (
    <div style={{ padding: 40 }}>
      <div className="alert alert-warning">
        <AlertCircle size={16} />
        Could not load dashboard. Is the backend running on port 8000?
      </div>
    </div>
  );

  const gstDeadlines = data.deadlines.filter(d => d.type.startsWith('GSTR'));
  const tdsDeadlines = data.deadlines.filter(d => d.type.startsWith('TDS'));

  return (
    <>
      <div className="page-header">
        <h2>Compliance Dashboard</h2>
        <p>Live compliance status for all clients</p>
      </div>
      <div className="page-body">
        {/* Stats row */}
        <div className="grid grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Users size={20} color="var(--accent-light)" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Clients</div>
              <div className="stat-value">{data.total_clients}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <FileText size={20} color="var(--green)" />
            </div>
            <div className="stat-info">
              <div className="stat-label">GST Filed</div>
              <div className="stat-value">
                {data.clients.filter(c => c.gst_this_month.gstr1_status === 'filed').length}
              </div>
              <div className="stat-sub">of {data.total_clients} this month</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <TrendingUp size={20} color="var(--amber)" />
            </div>
            <div className="stat-info">
              <div className="stat-label">TDS Pending</div>
              <div className="stat-value">
                {data.clients.filter(c => c.tds_latest.status === 'draft').length}
              </div>
              <div className="stat-sub">returns not filed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Calendar size={20} color="var(--red)" />
            </div>
            <div className="stat-info">
              <div className="stat-label">Overdue</div>
              <div className="stat-value">
                {data.deadlines.filter(d => d.status === 'overdue').length}
              </div>
              <div className="stat-sub">deadlines missed</div>
            </div>
          </div>
        </div>

        {/* Deadline tiles */}
        <div className="section-header">
          <div className="section-title">Filing Deadlines — Current Month</div>
        </div>
        <div className="grid grid-4 mb-6">
          {gstDeadlines.map(d => (
            <div key={d.type} className={`deadline-card ${d.status}`}>
              <div className="deadline-type">{d.type}</div>
              <div className="deadline-date">{formatDate(d.deadline_date)}</div>
              <div className={`deadline-days ${d.status}`}>
                {d.days_left < 0 ? `${Math.abs(d.days_left)}d overdue` : `${d.days_left}d left`}
              </div>
            </div>
          ))}
          {tdsDeadlines.slice(0, 2).map(d => (
            <div key={d.type} className={`deadline-card ${d.status}`}>
              <div className="deadline-type">{d.type}</div>
              <div className="deadline-date">{formatDate(d.deadline_date)}</div>
              <div className={`deadline-days ${d.status}`}>
                {d.days_left < 0 ? `${Math.abs(d.days_left)}d overdue` : `${d.days_left}d left`}
              </div>
            </div>
          ))}
        </div>

        {/* Client table */}
        <div className="section-header">
          <div className="section-title">Client Status</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>GST This Month</th>
                <th>GSTR-1</th>
                <th>GSTR-3B</th>
                <th>TDS Quarter</th>
                <th>TDS Status</th>
                <th>ITR Status</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.pan}</div>
                  </td>
                  <td><span className="badge badge-purple">{c.client_type}</span></td>
                  <td>{formatINR(c.gst_this_month.net_payable)}</td>
                  <td><span className={`badge ${statusBadge(c.gst_this_month.gstr1_status)}`}>{c.gst_this_month.gstr1_status}</span></td>
                  <td><span className={`badge ${statusBadge(c.gst_this_month.gstr3b_status)}`}>{c.gst_this_month.gstr3b_status}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.tds_latest.quarter}</td>
                  <td><span className={`badge ${statusBadge(c.tds_latest.status)}`}>{c.tds_latest.status}</span></td>
                  <td><span className={`badge ${statusBadge(c.itr_status.status)}`}>{c.itr_status.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
