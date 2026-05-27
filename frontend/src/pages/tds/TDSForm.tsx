import { useEffect, useState, useRef } from 'react';
import { Upload, Wand2, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { uploadTDSExcel, validateTDS, generateTDSJson, suggestTDSSection } from '../../lib/api';

const STEPS = ['Client & Form', 'Upload Excel', 'Validate', 'Generate JSON'];
const EXPECTED = ['deductee_pan', 'deductee_name', 'section_code', 'payment_date', 'gross_amount', 'tds_amount', 'challan_number'];

export default function TDSForm() {
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ client_id: '', form_type: '26Q', quarter: 'Q1-2024-25', financial_year: '2024-25' });
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [jsonResult, setJsonResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sectionSuggest, setSectionSuggest] = useState('');
  const [sectionResult, setSectionResult] = useState<any>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const res = await uploadTDSExcel(file);
      setUploadResult(res.data);
      // Default mapping (exact match)
      const defaultMap: Record<string, string> = {};
      res.data.headers.forEach((h: string) => {
        const match = EXPECTED.find(f => h.toLowerCase().replace(/\s/g, '_') === f);
        if (match) defaultMap[h] = match;
      });
      setMapping(defaultMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const autoMapWithAI = async () => {
    if (!uploadResult) return;
    setLoading(true);
    try {
      const res = await import('../../lib/api').then(m => m.mapColumns({
        headers: uploadResult.headers,
        sample_rows: uploadResult.sample_rows,
        expected_fields: EXPECTED,
      }));
      setMapping(res.data.mapping || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyMappingAndValidate = async () => {
    if (!uploadResult) return;
    setLoading(true);
    try {
      // Apply mapping
      const rows = uploadResult.all_rows.map((row: any) => {
        const mapped: any = {};
        Object.entries(mapping).forEach(([excelCol, stdField]) => {
          if (stdField && row[excelCol] !== undefined) mapped[stdField] = row[excelCol];
        });
        return mapped;
      });
      setMappedRows(rows);
      const valRes = await validateTDS(rows);
      setErrors(valRes.data.errors || []);
      setStep(2);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateTDSJson(mappedRows, meta);
      setJsonResult(res.data);
      setStep(3);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(jsonResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TDS_${meta.quarter}_${meta.form_type}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const suggestSection = async () => {
    if (!sectionSuggest.trim()) return;
    setLoading(true);
    try {
      const res = await suggestTDSSection(sectionSuggest);
      setSectionResult(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <h2>TDS Return — New Filing</h2>
        <p>Upload Excel → Map Columns → Validate → Generate JSON</p>
      </div>
      <div className="page-body">
        {/* Stepper */}
        <div className="flex gap-2 mb-6" style={{ alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i <= step ? 'var(--accent)' : 'var(--bg-card)',
                border: `1px solid ${i <= step ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: i <= step ? 'white' : 'var(--text-muted)'
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
              {i < STEPS.length - 1 && <span style={{ color: 'var(--border)', margin: '0 4px' }}>›</span>}
            </div>
          ))}
        </div>

        {/* Step 0: Meta */}
        {step === 0 && (
          <div className="card" style={{ maxWidth: 540 }}>
            <div className="section-title mb-4">Filing Details</div>
            <div className="form-group">
              <label>Client ID</label>
              <input type="number" value={meta.client_id}
                onChange={e => setMeta(m => ({ ...m, client_id: e.target.value }))}
                placeholder="Enter client ID" />
            </div>
            <div className="form-group">
              <label>Form Type</label>
              <select value={meta.form_type} onChange={e => setMeta(m => ({ ...m, form_type: e.target.value }))}>
                <option value="26Q">26Q (Non-Salary)</option>
                <option value="24Q">24Q (Salary)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <div className="form-group flex-1">
                <label>Quarter</label>
                <select value={meta.quarter} onChange={e => setMeta(m => ({ ...m, quarter: e.target.value }))}>
                  {['Q1-2024-25','Q2-2024-25','Q3-2024-25','Q4-2024-25'].map(q => <option key={q}>{q}</option>)}
                </select>
              </div>
              <div className="form-group flex-1">
                <label>Financial Year</label>
                <input value={meta.financial_year} onChange={e => setMeta(m => ({ ...m, financial_year: e.target.value }))} />
              </div>
            </div>

            {/* AI Section Suggester */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <div className="section-title mb-3" style={{ fontSize: 13 }}>🤖 AI Section Suggester</div>
              <div className="flex gap-2">
                <input value={sectionSuggest} onChange={e => setSectionSuggest(e.target.value)}
                  placeholder="Describe the payment (e.g. 'payment to architect for building design')" />
                <button className="btn btn-secondary" onClick={suggestSection} disabled={loading}>
                  {loading ? <span className="spinner" /> : <Wand2 size={14} />}
                </button>
              </div>
              {sectionResult && (
                <div className="alert alert-info mt-2">
                  Section: <strong>{sectionResult.section || 'Unknown'}</strong>
                  {sectionResult.rate && <> · Rate: <strong>{sectionResult.rate}%</strong></>}
                  {sectionResult.reason && <div style={{ marginTop: 4, fontSize: 12 }}>{sectionResult.reason}</div>}
                </div>
              )}
            </div>

            <button className="btn btn-primary mt-4" onClick={() => setStep(1)}>
              Next: Upload Excel →
            </button>
          </div>
        )}

        {/* Step 1: Upload & Map */}
        {step === 1 && (
          <div className="card">
            <div className="section-title mb-4">Upload TDS Excel</div>
            <div className="dropzone mb-4" onClick={() => fileInput.current?.click()}>
              <Upload size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600 }}>Click to upload Excel (.xlsx)</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Supports Tally export, NSDL format, custom layouts</div>
            </div>
            <input ref={fileInput} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />

            {uploadResult && (
              <>
                <div className="alert alert-success">
                  <CheckCircle size={14} />
                  Parsed {uploadResult.row_count} rows · {uploadResult.headers.length} columns found
                </div>

                {/* Sample preview */}
                <div className="section-title mb-3" style={{ fontSize: 13 }}>5-Row Preview</div>
                <div className="table-wrap mb-4" style={{ maxHeight: 200, overflow: 'auto' }}>
                  <table>
                    <thead><tr>{uploadResult.headers.map((h: string) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {uploadResult.sample_rows.map((row: any, i: number) => (
                        <tr key={i}>{uploadResult.headers.map((h: string) => <td key={h}>{row[h] ?? ''}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Column mapping */}
                <div className="flex items-center justify-between mb-3">
                  <div className="section-title" style={{ fontSize: 13 }}>Column Mapping</div>
                  <button className="btn btn-secondary btn-sm" onClick={autoMapWithAI} disabled={loading}>
                    {loading ? <span className="spinner" /> : <Wand2 size={13} />}
                    Auto-Map with AI
                  </button>
                </div>
                <div className="grid grid-2">
                  {uploadResult.headers.map((h: string) => (
                    <div key={h} className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 160, flexShrink: 0 }}>{h}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <select style={{ flex: 1 }} value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}>
                        <option value="">— skip —</option>
                        {EXPECTED.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
                  <button className="btn btn-primary" onClick={applyMappingAndValidate} disabled={loading}>
                    {loading ? <span className="spinner" /> : null}
                    Validate Rows →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Validation */}
        {step === 2 && (
          <div className="card">
            <div className="section-title mb-4">Validation Results</div>
            {errors.length === 0 ? (
              <div className="alert alert-success"><CheckCircle size={14} /> All {mappedRows.length} rows validated successfully!</div>
            ) : (
              <>
                <div className="alert alert-warning">
                  <AlertCircle size={14} /> {errors.length} error{errors.length !== 1 ? 's' : ''} found
                </div>
                <div className="table-wrap mb-4">
                  <table>
                    <thead><tr><th>Row</th><th>Field</th><th>Issue</th></tr></thead>
                    <tbody>
                      {errors.map((e, i) => (
                        <tr key={i}>
                          <td>{e.row}</td>
                          <td className="mono">{e.field}</td>
                          <td style={{ color: 'var(--red)' }}>{e.issue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || errors.length > 0}>
                {loading ? <span className="spinner" /> : null}
                Generate JSON →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Download */}
        {step === 3 && jsonResult && (
          <div className="card" style={{ maxWidth: 500 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>JSON Generated!</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                {jsonResult.deductee_count} deductees · ₹{jsonResult.total_tds_amount.toLocaleString()} TDS
              </div>
              <button className="btn btn-success mt-4" onClick={downloadJson}>
                <Download size={15} /> Download TDS JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
