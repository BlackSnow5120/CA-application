import { useEffect, useState } from 'react';
import { getLitigationCases, createLitigationCase, draftAllSections, draftSection } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import type { LitigationCase, CaseLaw } from '../../types';
import { Plus, Wand2, Clock, AlertTriangle, History } from 'lucide-react';

const SECTION_KEYS = ['statement_of_facts', 'grounds_of_appeal', 'written_submissions'] as const;
const SECTION_LABELS: Record<string, string> = {
  statement_of_facts: 'Statement of Facts',
  grounds_of_appeal: 'Grounds of Appeal',
  written_submissions: 'Written Submissions',
};

export default function CaseList() {
  const [cases, setCases] = useState<LitigationCase[]>([]);
  const [selected, setSelected] = useState<LitigationCase | null>(null);
  const [draftTab, setDraftTab] = useState<typeof SECTION_KEYS[number]>('statement_of_facts');
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newCase, setNewCase] = useState({
    client_id: 1, case_title: '', case_type: 'appeal', authority: 'CIT(A)',
    facts_of_case: '', it_sections: '', case_laws: [] as CaseLaw[]
  });
  const [newCaseLaw, setNewCaseLaw] = useState({ citation: '', court: '', year: new Date().getFullYear(), holding: '' });

  const load = () => {
    getLitigationCases().then(r => setCases(r.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleDraftAll = async () => {
    if (!selected) return;
    setLoading(true);
    setDraftError(null);
    try {
      await draftAllSections(selected.id);
      const updated = await getLitigationCases();
      const updatedCase = updated.data.find((c: LitigationCase) => c.id === selected.id);
      if (updatedCase) setSelected(updatedCase);
      load();
    } catch {
      setDraftError('Drafting failed. Is Ollama running at localhost:11434?');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftOne = async (section: string) => {
    if (!selected) return;
    setDraftLoading(section);
    setDraftError(null);
    try {
      await draftSection(selected.id, section);
      const updated = await getLitigationCases();
      const updatedCase = updated.data.find((c: LitigationCase) => c.id === selected.id);
      if (updatedCase) setSelected(updatedCase);
      load();
    } catch {
      setDraftError(`Failed to draft "${section}". Is Ollama running?`);
    } finally {
      setDraftLoading(null);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createLitigationCase({
        ...newCase,
        it_sections: newCase.it_sections.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowNew(false);
      load();
    } catch {
      // Keep modal open so user doesn't lose their input
    } finally {
      setLoading(false);
    }
  };

  const addCaseLaw = () => {
    setNewCase(n => ({ ...n, case_laws: [...n.case_laws, { ...newCaseLaw }] }));
    setNewCaseLaw({ citation: '', court: '', year: new Date().getFullYear(), holding: '' });
  };

  const getDraft = (c: LitigationCase, key: string): string => {
    return (c as any)[`draft_${key}`] || '';
  };

  const getCaseTypeBadge = (t: string) => ({
    search_seizure: 'badge-red', benami: 'badge-red', appeal: 'badge-amber',
    scrutiny: 'badge-amber', survey: 'badge-purple',
  }[t] || 'badge-gray');

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Tax Litigation</h2>
            <p>Case management with AI-assisted document drafting</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={15} /> New Case</button>
        </div>
      </div>
      <div className="page-body">
        <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Case list */}
          <div style={{ width: 300, flexShrink: 0, overflowY: 'auto' }}>
            {cases.map(c => (
              <div key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  padding: 16, marginBottom: 8, borderRadius: 'var(--radius)',
                  background: selected?.id === c.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                  border: `1px solid ${selected?.id === c.id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, marginBottom: 4 }}>{c.case_title}</div>
                <div className="flex gap-2" style={{ marginBottom: 4 }}>
                  <span className={`badge ${getCaseTypeBadge(c.case_type)}`}>{c.case_type}</span>
                  <span className="badge badge-purple">{c.authority}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {c.hearing_date ? `Hearing: ${formatDate(c.hearing_date)}` : 'No hearing set'}
                </div>
                {c.draft_version > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                    v{c.draft_version} drafted · {formatDate(c.last_drafted_at)}
                  </div>
                )}
              </div>
            ))}
            {cases.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                No litigation cases.<br />Click "New Case" to add one.
              </div>
            )}
          </div>

          {/* Case detail + drafts */}
          {selected ? (
            <div className="card flex-1" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.case_title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {selected.authority} · Notice: {formatDate(selected.notice_date)} · Hearing: {formatDate(selected.hearing_date)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={handleDraftAll} disabled={loading}>
                    {loading ? <span className="spinner" /> : <Wand2 size={14} />}
                    Draft All (Ollama)
                  </button>
                </div>
              </div>

              {/* Prompt preview */}
              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>📋 Ollama Prompt Preview</div>
                Authority: {selected.authority} · Type: {selected.case_type}<br />
                Sections: {(selected.it_sections || []).join(', ') || 'none'}<br />
                Case Laws: {(selected.case_laws || []).length} provided<br />
                <span style={{ color: 'var(--amber)' }}>No internet call — model: llama3.1:8b @ localhost:11434</span>
              </div>

              {/* Warning */}
              <div className="alert alert-warning mb-4">
                <AlertTriangle size={14} />
                AI draft — verify all case laws independently before submission.
              </div>
              {draftError && (
                <div className="alert alert-warning mb-4">
                  <AlertTriangle size={14} /> {draftError}
                </div>
              )}

              {/* Draft tabs */}
              <div className="tabs">
                {SECTION_KEYS.map(k => (
                  <button key={k} className={`tab-btn ${draftTab === k ? 'active' : ''}`} onClick={() => setDraftTab(k)}>
                    {SECTION_LABELS[k]}
                    {getDraft(selected, k) && <span style={{ marginLeft: 6, color: 'var(--green)', fontSize: 10 }}>●</span>}
                  </button>
                ))}
              </div>

              {/* Draft content */}
              <div style={{ flex: 1, position: 'relative' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {getDraft(selected, draftTab) ? `${getDraft(selected, draftTab).split(' ').length} words` : 'Not yet drafted'}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDraftOne(draftTab)}
                    disabled={draftLoading === draftTab}>
                    {draftLoading === draftTab ? <span className="spinner" /> : <Wand2 size={12} />}
                    Regenerate
                  </button>
                </div>
                <textarea
                  style={{
                    width: '100%', minHeight: 300, background: 'var(--bg-secondary)',
                    fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.8,
                  }}
                  value={getDraft(selected, draftTab) || (draftLoading === draftTab ? 'Generating on local model…' : 'Click "Draft All" or "Regenerate" to generate this section.')}
                  onChange={e => {
                    const key = `draft_${draftTab}`;
                    setSelected(s => s ? { ...s, [key]: e.target.value } : null);
                  }}
                  placeholder="Draft will appear here after AI generation."
                />
              </div>
            </div>
          ) : (
            <div className="card flex-1 flex items-center" style={{ justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <Scale size={48} style={{ opacity: 0.2 }} />
              <div style={{ color: 'var(--text-muted)' }}>Select a case from the list to view or draft documents</div>
            </div>
          )}
        </div>

        {/* New Case Modal */}
        {showNew && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}>
            <div className="card" style={{ width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="section-title mb-4">New Litigation Case</div>
              <div className="form-group">
                <label>Client ID</label>
                <input type="number" value={newCase.client_id} onChange={e => setNewCase(n => ({ ...n, client_id: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>Case Title</label>
                <input value={newCase.case_title} onChange={e => setNewCase(n => ({ ...n, case_title: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <div className="form-group flex-1">
                  <label>Case Type</label>
                  <select value={newCase.case_type} onChange={e => setNewCase(n => ({ ...n, case_type: e.target.value }))}>
                    <option value="appeal">Appeal</option>
                    <option value="search_seizure">Search & Seizure</option>
                    <option value="benami">Benami</option>
                    <option value="scrutiny">Scrutiny</option>
                    <option value="survey">Survey</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Authority</label>
                  <select value={newCase.authority} onChange={e => setNewCase(n => ({ ...n, authority: e.target.value }))}>
                    <option>CIT(A)</option><option>ITAT</option><option>High Court</option><option>Supreme Court</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>IT Sections (comma-separated)</label>
                <input value={newCase.it_sections} onChange={e => setNewCase(n => ({ ...n, it_sections: e.target.value }))} placeholder="e.g. 132, 68, 263" />
              </div>
              <div className="form-group">
                <label>Facts of Case</label>
                <textarea rows={5} value={newCase.facts_of_case} onChange={e => setNewCase(n => ({ ...n, facts_of_case: e.target.value }))} />
              </div>

              {/* Case laws */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Case Laws (provided citations only — AI will not add others)</div>
                {newCase.case_laws.map((cl, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 4 }}>
                    <strong>{cl.citation}</strong> ({cl.court}, {cl.year}): {cl.holding}
                  </div>
                ))}
                <div className="grid grid-2 gap-2">
                  <input placeholder="Citation (e.g. CIT v. Smith)" value={newCaseLaw.citation} onChange={e => setNewCaseLaw(n => ({ ...n, citation: e.target.value }))} style={{ marginBottom: 0 }} />
                  <input placeholder="Court" value={newCaseLaw.court} onChange={e => setNewCaseLaw(n => ({ ...n, court: e.target.value }))} style={{ marginBottom: 0 }} />
                  <input type="number" placeholder="Year" value={newCaseLaw.year} onChange={e => setNewCaseLaw(n => ({ ...n, year: Number(e.target.value) }))} style={{ marginBottom: 0 }} />
                  <input placeholder="Holding / principle" value={newCaseLaw.holding} onChange={e => setNewCaseLaw(n => ({ ...n, holding: e.target.value }))} style={{ marginBottom: 0 }} />
                </div>
                <button className="btn btn-secondary btn-sm mt-2" onClick={addCaseLaw}>+ Add Case Law</button>
              </div>

              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                  {loading ? <span className="spinner" /> : null} Create Case
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Fix missing import
function Scale({ size, style }: { size: number, style?: any }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={style}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 21h6M3 7l9-4 9 4M3 7l6 2.5M21 7l-6 2.5M9 9.5l3 1.5 3-1.5M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" /></svg>;
}
