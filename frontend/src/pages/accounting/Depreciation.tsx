import { useEffect, useState, useRef } from 'react';
import { getDepreciationAssets, computeDepreciation } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import type { DepreciationAsset } from '../../types';
import { Plus } from 'lucide-react';
import { IT_DEP_BLOCKS } from '../../lib/constants';

const BLOCKS = [
  'Computers & software', 'Plant & Machinery', 'Motor vehicles',
  'Furniture & fittings', 'Buildings (residential)', 'Buildings (commercial)',
  'Intangibles',
];

const IT_RATES: Record<string, number> = {
  'Computers & software': 40, 'Plant & Machinery': 15, 'Motor vehicles': 15,
  'Furniture & fittings': 10, 'Buildings (residential)': 5, 'Buildings (commercial)': 10,
  'Intangibles': 25,
};

export default function Depreciation() {
  const [clientId, setClientId] = useState(1);
  const [assets, setAssets] = useState<DepreciationAsset[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    asset_name: '', asset_block: 'Computers & software',
    purchase_date: '', cost: 0, companies_act_rate: 33.33,
    income_tax_rate: 40, opening_wdv_companies: 0, opening_wdv_tax: 0,
    financial_year: '2024-25',
  });
  const [loading, setLoading] = useState(false);

  const load = () => {
    getDepreciationAssets(clientId)
      .then(r => setAssets(r.data))
      .catch(console.error);
  };

  useEffect(() => { load(); }, [clientId]);

  const handleBlockChange = (block: string) => {
    setForm(f => ({ ...f, asset_block: block, income_tax_rate: IT_RATES[block] || 15 }));
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      await computeDepreciation({ ...form, client_id: clientId });
      load();
      setShowAdd(false);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2>Depreciation Register</h2><p>WDV — IT Act + Companies Act dual register</p></div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add Asset</button>
        </div>
      </div>
      <div className="page-body">
        <div className="flex items-center gap-3 mb-6">
          <label style={{ margin: 0 }}>Client ID:</label>
          <input type="number" value={clientId} onChange={e => setClientId(Number(e.target.value))} style={{ width: 80 }} />
          <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th><th>Block</th><th>Purchase Date</th><th>Cost</th>
                <th>Opening WDV (IT)</th><th>Dep (IT Act)</th><th>Closing WDV (IT)</th>
                <th>Opening WDV (CA)</th><th>Dep (Co. Act)</th><th>Closing WDV (CA)</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.asset_name}</td>
                  <td><span className="badge badge-purple" style={{ fontSize: 10 }}>{a.asset_block}</span></td>
                  <td>{formatDate(a.purchase_date)}</td>
                  <td>{formatINR(a.cost)}</td>
                  <td>{formatINR(a.opening_wdv_tax || 0)}</td>
                  <td style={{ color: 'var(--red)' }}>{formatINR(a.depreciation_tax || 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(a.closing_wdv_tax || 0)}</td>
                  <td>{formatINR(a.opening_wdv_companies || 0)}</td>
                  <td style={{ color: 'var(--red)' }}>{formatINR(a.depreciation_companies || 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(a.closing_wdv_companies || 0)}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No assets</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: 500 }}>
              <div className="section-title mb-4">Add Depreciation Asset</div>
              <div className="form-group"><label>Asset Name</label><input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} /></div>
              <div className="form-group">
                <label>Asset Block (IT Act)</label>
                <select value={form.asset_block} onChange={e => handleBlockChange(e.target.value)}>
                  {BLOCKS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1"><label>Purchase Date</label><input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
                <div className="form-group flex-1"><label>Cost (₹)</label><input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1"><label>IT Act Rate (%)</label><input type="number" value={form.income_tax_rate} onChange={e => setForm(f => ({ ...f, income_tax_rate: Number(e.target.value) }))} /></div>
                <div className="form-group flex-1"><label>Companies Act Rate (%)</label><input type="number" value={form.companies_act_rate} onChange={e => setForm(f => ({ ...f, companies_act_rate: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1"><label>Opening WDV — IT Act (₹)</label><input type="number" value={form.opening_wdv_tax} onChange={e => setForm(f => ({ ...f, opening_wdv_tax: Number(e.target.value) }))} /></div>
                <div className="form-group flex-1"><label>Opening WDV — Co. Act (₹)</label><input type="number" value={form.opening_wdv_companies} onChange={e => setForm(f => ({ ...f, opening_wdv_companies: Number(e.target.value) }))} /></div>
              </div>
              <div className="form-group"><label>Financial Year</label><input value={form.financial_year} onChange={e => setForm(f => ({ ...f, financial_year: e.target.value }))} /></div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
                  {loading ? <span className="spinner" /> : null} Compute & Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
