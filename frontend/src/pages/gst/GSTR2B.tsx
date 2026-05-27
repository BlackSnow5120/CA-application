import { useEffect, useState } from 'react';
import { getGSTPeriod, getGSTR3B, reconAction } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import type { GSTPeriod, GSTInvoice } from '../../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function GSTR2B() {
  const [clientId, setClientId] = useState(1);
  const [period, setPeriod] = useState('Oct-2024');
  const [gstData, setGstData] = useState<GSTPeriod | null>(null);
  const [threeB, setThreeB] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('invoices');

  const load = () => {
    setLoading(true);
    Promise.all([
      getGSTPeriod(clientId, period),
      getGSTR3B(clientId, period),
    ])
      .then(([gst, b3]) => { setGstData(gst.data); setThreeB(b3.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [clientId, period]);

  const handleAction = async (invoiceId: number, action: string) => {
    await reconAction({ invoice_id: invoiceId, action });
    load();
  };

  const statusBadge = (s: string) => ({
    matched: 'badge-green', mismatch: 'badge-red',
    pending: 'badge-amber', rejected: 'badge-gray',
    extra_in_2b: 'badge-blue', missing_in_2b: 'badge-amber',
  }[s] || 'badge-gray');

  return (
    <>
      <div className="page-header">
        <h2>GST Reconciliation</h2>
        <p>GSTR-2B reconciliation and ITC management</p>
      </div>
      <div className="page-body">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Client ID:</label>
            <input type="number" value={clientId} onChange={e => setClientId(Number(e.target.value))} style={{ width: 80 }} />
          </div>
          <div className="flex items-center gap-2">
            <label style={{ margin: 0 }}>Period:</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Oct-2024" style={{ width: 120 }} />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Load'}
          </button>
        </div>

        {/* 3B Summary */}
        {threeB && (
          <div className="grid grid-3 mb-6">
            <div className="card card-sm">
              <div className="card-title">Output GST</div>
              <div className="card-value" style={{ color: 'var(--red)' }}>{formatINR(threeB.output_gst?.total || 0)}</div>
            </div>
            <div className="card card-sm">
              <div className="card-title">Eligible ITC</div>
              <div className="card-value" style={{ color: 'var(--green)' }}>{formatINR(threeB.eligible_itc?.total || 0)}</div>
            </div>
            <div className="card card-sm">
              <div className="card-title">Net Payable</div>
              <div className="card-value">{formatINR(threeB.net_payable?.total || 0)}</div>
              {(threeB.credit_balance || 0) > 0 && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>Credit: {formatINR(threeB.credit_balance)}</div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {['invoices', 'gstr1', 'gstr3b'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'invoices' ? 'Invoice Reconciliation' : t === 'gstr1' ? 'GSTR-1 Status' : 'GSTR-3B Summary'}
            </button>
          ))}
        </div>

        {tab === 'invoices' && gstData && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice No.</th><th>Party</th><th>Date</th>
                  <th>Taxable Amt</th><th>IGST</th><th>CGST</th><th>SGST</th>
                  <th>Direction</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gstData.invoices.map((inv: GSTInvoice) => (
                  <tr key={inv.id}>
                    <td className="mono">{inv.invoice_number}</td>
                    <td>
                      <div>{inv.party_name || '—'}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inv.party_gstin || ''}</div>
                    </td>
                    <td>{formatDate(inv.invoice_date)}</td>
                    <td>{formatINR(inv.taxable_amount)}</td>
                    <td>{formatINR(inv.igst)}</td>
                    <td>{formatINR(inv.cgst)}</td>
                    <td>{formatINR(inv.sgst)}</td>
                    <td>
                      <span className={`badge ${inv.direction === 'sale' ? 'badge-blue' : 'badge-purple'}`}>
                        {inv.direction}
                      </span>
                    </td>
                    <td><span className={`badge ${statusBadge(inv.recon_status)}`}>{inv.recon_status}</span></td>
                    <td>
                      {inv.direction === 'purchase' && (
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-success" onClick={() => handleAction(inv.id, 'matched')}>
                            <CheckCircle size={11} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleAction(inv.id, 'rejected')}>
                            <XCircle size={11} />
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleAction(inv.id, 'pending')}>
                            <Clock size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'gstr3b' && threeB && (
          <div className="card">
            <table>
              <thead><tr><th>Head</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Total</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Output GST (Sales)</td>
                  <td>{formatINR(threeB.output_gst?.igst || 0)}</td>
                  <td>{formatINR(threeB.output_gst?.cgst || 0)}</td>
                  <td>{formatINR(threeB.output_gst?.sgst || 0)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--red)' }}>{formatINR(threeB.output_gst?.total || 0)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>ITC (Matched Purchases)</td>
                  <td>{formatINR(threeB.eligible_itc?.igst || 0)}</td>
                  <td>{formatINR(threeB.eligible_itc?.cgst || 0)}</td>
                  <td>{formatINR(threeB.eligible_itc?.sgst || 0)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--green)' }}>{formatINR(threeB.eligible_itc?.total || 0)}</td>
                </tr>
                <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                  <td style={{ fontWeight: 700 }}>Net Tax Payable</td>
                  <td>{formatINR(threeB.net_payable?.igst || 0)}</td>
                  <td>{formatINR(threeB.net_payable?.cgst || 0)}</td>
                  <td>{formatINR(threeB.net_payable?.sgst || 0)}</td>
                  <td style={{ fontWeight: 800, fontSize: 16 }}>{formatINR(threeB.net_payable?.total || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
