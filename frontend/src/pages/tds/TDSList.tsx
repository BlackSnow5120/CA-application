import { useEffect, useState } from 'react';
import { getTDSReturns } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { TDSReturn } from '../../types';

export default function TDSList() {
  const [returns, setReturns] = useState<TDSReturn[]>([]);
  const [clientId, setClientId] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTDSReturns(clientId)
      .then(r => setReturns(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  const statusBadge = (s: string) => ({
    filed: 'badge-green', validated: 'badge-blue', draft: 'badge-amber'
  }[s] || 'badge-gray');

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>TDS Returns</h2>
            <p>Form 24Q and 26Q management</p>
          </div>
          <Link to="/tds/new" className="btn btn-primary"><Plus size={15} /> New TDS Return</Link>
        </div>
      </div>
      <div className="page-body">
        <div className="flex items-center gap-3 mb-6">
          <label style={{ margin: 0 }}>Client ID:</label>
          <input type="number" value={clientId} onChange={e => setClientId(Number(e.target.value))}
            style={{ width: 100 }} />
        </div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quarter</th><th>Form</th><th>FY</th>
                  <th>Deductees</th><th>Total TDS</th><th>Status</th><th>Filed At</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.quarter}</td>
                    <td><span className="badge badge-purple">{r.form_type}</span></td>
                    <td>{r.financial_year}</td>
                    <td>{r.deductee_count}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(r.total_tds_amount)}</td>
                    <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td>{formatDate(r.filed_at)}</td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No TDS returns found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
