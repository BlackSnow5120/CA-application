import { useEffect, useState } from 'react';
import { getClients, createClient } from '../lib/api';
import type { Client } from '../types';
import { Plus, Building2, User, Users } from 'lucide-react';
import { formatDate } from '../lib/formatters';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', pan: '', gstin: '', email: '', phone: '', client_type: 'individual' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getClients().then(r => setClients(r.data)).catch(console.error);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createClient(form);
      const res = await getClients();
      setClients(res.data);
      setShowNew(false);
      setForm({ name: '', pan: '', gstin: '', email: '', phone: '', client_type: 'individual' });
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error creating client');
    } finally {
      setLoading(false);
    }
  };

  const typeIcon = (t: string) => {
    if (t === 'company') return <Building2 size={14} />;
    if (t === 'firm' || t === 'llp') return <Users size={14} />;
    return <User size={14} />;
  };

  const typeBadge = (t: string) => ({
    individual: 'badge-blue', company: 'badge-purple', firm: 'badge-green', llp: 'badge-amber'
  }[t] || 'badge-gray');

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2>Clients</h2><p>All registered clients</p></div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={15} /> Add Client</button>
        </div>
      </div>
      <div className="page-body">
        <div className="grid grid-4 mb-6">
          {['individual', 'company', 'firm', 'llp'].map(t => (
            <div key={t} className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.08)' }}>
                {typeIcon(t)}
              </div>
              <div className="stat-info">
                <div className="stat-label">{t}s</div>
                <div className="stat-value">{clients.filter(c => c.client_type === t).length}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>PAN</th><th>GSTIN</th><th>Type</th><th>Email</th><th>Added</th></tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                  <td className="mono">{c.pan}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{c.gstin || '—'}</td>
                  <td><span className={`badge ${typeBadge(c.client_type)}`}>{c.client_type}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No clients yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 480 }}>
            <div className="section-title mb-4">Add New Client</div>
            {[
              { key: 'name', label: 'Full Name', placeholder: 'e.g. Ramesh Traders' },
              { key: 'pan', label: 'PAN', placeholder: 'AABCR1234F' },
              { key: 'gstin', label: 'GSTIN (optional)', placeholder: '27AABCR1234F1Z5' },
              { key: 'email', label: 'Email', placeholder: 'client@firm.in' },
              { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="form-group">
                <label>{label}</label>
                <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div className="form-group">
              <label>Client Type</label>
              <select value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="firm">Partnership Firm</option>
                <option value="llp">LLP</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? <span className="spinner" /> : null} Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
