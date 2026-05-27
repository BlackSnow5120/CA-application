import { useState } from 'react';
import { saveITR, computeTax, gstCrosscheck, aiReviewITR } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import { Wand2, CheckCircle, AlertCircle } from 'lucide-react';

const STEPS = ['Client & FY', 'Salary', 'House Property', 'Capital Gains', 'Business Income', 'Other Sources', 'Deductions', 'Summary', 'AI Review'];

export default function ITRWizard() {
  const [step, setStep] = useState(0);
  const [regime, setRegime] = useState<'new' | 'old'>('new');
  const [clientId, setClientId] = useState(1);
  const [fy, setFy] = useState('2024-25');
  const [salary, setSalary] = useState({ gross_salary: 0 });
  const [houseProperty, setHouseProperty] = useState({ type: 'self_occupied', annual_rent: 0, municipal_tax: 0 });
  const [businessIncome, setBusinessIncome] = useState({ section: '44ADA', turnover: 0 });
  const [otherSources, setOtherSources] = useState({ interest: 0, dividends: 0 });
  const [deductions, setDeductions] = useState({ section_80c: 0, section_80d: 0 });
  const [capitalGains, setCapitalGains] = useState({ equity_ltcg: 0, equity_stcg: 0, property_ltcg: 0 });
  const [itrId, setItrId] = useState<number | null>(null);
  const [taxResult, setTaxResult] = useState<any>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [gstCheck, setGstCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const stdDed = 75000;
  const salaryNet = Math.max(0, salary.gross_salary - stdDed);
  const businessProfit = businessIncome.section === '44ADA'
    ? businessIncome.turnover * 0.5
    : businessIncome.section === '44AD'
      ? businessIncome.turnover * 0.08
      : businessIncome.turnover;
  const hpIncome = houseProperty.type === 'self_occupied'
    ? 0 : Math.max(0, houseProperty.annual_rent * 0.7 - houseProperty.municipal_tax);
  const totalIncome = salaryNet + businessProfit + hpIncome +
    (otherSources.interest + otherSources.dividends) +
    (capitalGains.equity_ltcg + capitalGains.equity_stcg + capitalGains.property_ltcg);
  const taxableIncome = regime === 'old'
    ? Math.max(0, totalIncome - (deductions.section_80c + deductions.section_80d))
    : totalIncome;

  const handleSaveAndCompute = async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const saveRes = await saveITR({
        client_id: clientId,
        financial_year: fy,
        assessment_year: `${parseInt(fy.split('-')[0]) + 1}-${parseInt(fy.split('-')[1]) + 1}`,
        itr_form: businessIncome.turnover > 0 ? 'ITR-3' : 'ITR-1',
        regime,
        salary_data: { gross_salary: salary.gross_salary, standard_deduction: stdDed },
        business_income_data: { ...businessIncome, profit: businessProfit },
        house_property_data: houseProperty,
        other_sources_data: otherSources,
        capital_gains_data: capitalGains,
        deductions_data: deductions,
        gross_total_income: totalIncome,
        taxable_income: taxableIncome,
      });
      const id = saveRes.data.id;
      setItrId(id);
      const taxRes = await computeTax(id, { taxable_income: taxableIncome, regime });
      setTaxResult(taxRes.data);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setSaveError(typeof detail === 'string' ? detail : 'Failed to save ITR. Check that the client ID exists and this FY has not already been filed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGSTCrosscheck = async () => {
    if (!itrId) return;
    try {
      const res = await gstCrosscheck(itrId);
      setGstCheck(res.data);
    } catch {
      // Non-critical — silently ignore if GST data unavailable
    }
  };

  const handleAIReview = async () => {
    if (!itrId) return;
    setLoading(true);
    setAiError(null);
    try {
      const res = await aiReviewITR(itrId);
      setAiNotes(res.data.review_notes);
    } catch {
      setAiError('AI review failed. Is Ollama running at localhost:11434?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>ITR Wizard — FY {fy}</h2>
        <p>All income heads → Tax computation → AI review</p>
      </div>
      <div className="page-body">
        {/* Stepper */}
        <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div onClick={() => i < step && setStep(i)} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--bg-card)',
                border: `1px solid ${i <= step ? (i < step ? 'var(--green)' : 'var(--accent)') : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, cursor: i < step ? 'pointer' : 'default',
                color: i <= step ? 'white' : 'var(--text-muted)', flexShrink: 0,
              }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: 11, color: i === step ? 'var(--accent-light)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
              {i < STEPS.length - 1 && <span style={{ color: 'var(--border)', margin: '0 2px', fontSize: 10 }}>›</span>}
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Form area */}
          <div className="card flex-1">
            {step === 0 && (
              <div>
                <div className="section-title mb-4">Client & Assessment Details</div>
                <div className="form-group">
                  <label>Client ID</label>
                  <input type="number" value={clientId} onChange={e => setClientId(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Financial Year</label>
                  <select value={fy} onChange={e => setFy(e.target.value)}>
                    <option>2024-25</option><option>2023-24</option><option>2022-23</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tax Regime</label>
                  <div className="flex gap-3">
                    {(['new', 'old'] as const).map(r => (
                      <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400 }}>
                        <input type="radio" checked={regime === r} onChange={() => setRegime(r)}
                          style={{ width: 'auto', accentColor: 'var(--accent)' }} />
                        {r === 'new' ? '🆕 New Regime (default)' : '📋 Old Regime'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="section-title mb-4">Salary Income</div>
                <div className="form-group">
                  <label>Gross Salary (₹)</label>
                  <input type="number" value={salary.gross_salary} onChange={e => setSalary({ gross_salary: Number(e.target.value) })} />
                </div>
                <div className="alert alert-info">
                  Standard Deduction: {formatINR(stdDed)} automatically applied
                  <br />Net Salary: <strong>{formatINR(Math.max(0, salary.gross_salary - stdDed))}</strong>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="section-title mb-4">House Property</div>
                <div className="form-group">
                  <label>Property Type</label>
                  <select value={houseProperty.type} onChange={e => setHouseProperty(h => ({ ...h, type: e.target.value }))}>
                    <option value="self_occupied">Self-Occupied</option>
                    <option value="let_out">Let Out</option>
                  </select>
                </div>
                {houseProperty.type === 'let_out' && (
                  <>
                    <div className="form-group">
                      <label>Annual Rent Received (₹)</label>
                      <input type="number" value={houseProperty.annual_rent} onChange={e => setHouseProperty(h => ({ ...h, annual_rent: Number(e.target.value) }))} />
                    </div>
                    <div className="form-group">
                      <label>Municipal Taxes Paid (₹)</label>
                      <input type="number" value={houseProperty.municipal_tax} onChange={e => setHouseProperty(h => ({ ...h, municipal_tax: Number(e.target.value) }))} />
                    </div>
                    <div className="alert alert-info">30% standard deduction applied. Net HP Income: <strong>{formatINR(hpIncome)}</strong></div>
                  </>
                )}
                {houseProperty.type === 'self_occupied' && (
                  <div className="alert alert-success">Self-occupied property — HP income = ₹0</div>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="section-title mb-4">Capital Gains</div>
                {[
                  { key: 'equity_ltcg', label: 'Equity LTCG (>₹1.25L exempt, 12.5%)' },
                  { key: 'equity_stcg', label: 'Equity STCG (20% — Budget 2024)' },
                  { key: 'property_ltcg', label: 'Property LTCG (20%)' },
                ].map(({ key, label }) => (
                  <div key={key} className="form-group">
                    <label>{label} (₹)</label>
                    <input type="number" value={(capitalGains as any)[key]}
                      onChange={e => setCapitalGains(cg => ({ ...cg, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="section-title mb-4">Business / Professional Income</div>
                <div className="form-group">
                  <label>Section</label>
                  <select value={businessIncome.section} onChange={e => setBusinessIncome(b => ({ ...b, section: e.target.value }))}>
                    <option value="44ADA">44ADA — Professionals (50% of receipts)</option>
                    <option value="44AD">44AD — Businesses (6% / 8% of turnover)</option>
                    <option value="normal">Normal Books</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gross Turnover / Receipts (₹)</label>
                  <input type="number" value={businessIncome.turnover} onChange={e => setBusinessIncome(b => ({ ...b, turnover: Number(e.target.value) }))} />
                </div>
                <div className="alert alert-info">Presumptive Profit: <strong>{formatINR(businessProfit)}</strong></div>
              </div>
            )}

            {step === 5 && (
              <div>
                <div className="section-title mb-4">Other Sources of Income</div>
                <div className="form-group">
                  <label>Interest Income (₹)</label>
                  <input type="number" value={otherSources.interest} onChange={e => setOtherSources(o => ({ ...o, interest: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Dividends (₹)</label>
                  <input type="number" value={otherSources.dividends} onChange={e => setOtherSources(o => ({ ...o, dividends: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <div className="section-title mb-4">
                  Deductions
                  {regime === 'new' && <span className="badge badge-amber" style={{ marginLeft: 12 }}>Not applicable in New Regime</span>}
                </div>
                <div className="form-group">
                  <label>Section 80C (max ₹1,50,000)</label>
                  <input type="number" value={deductions.section_80c} disabled={regime === 'new'}
                    onChange={e => setDeductions(d => ({ ...d, section_80c: Math.min(150000, Number(e.target.value)) }))} />
                </div>
                <div className="form-group">
                  <label>Section 80D — Health Insurance</label>
                  <input type="number" value={deductions.section_80d} disabled={regime === 'new'}
                    onChange={e => setDeductions(d => ({ ...d, section_80d: Number(e.target.value) }))} />
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <div className="section-title mb-4">Tax Summary</div>
                <table style={{ width: '100%', marginBottom: 20 }}>
                  <tbody>
                    {[
                      ['Gross Salary', formatINR(salary.gross_salary)],
                      ['Less: Standard Deduction', `(${formatINR(stdDed)})`],
                      ['Business / Professional Income', formatINR(businessProfit)],
                      ['House Property Income', formatINR(hpIncome)],
                      ['Other Sources', formatINR(otherSources.interest + otherSources.dividends)],
                      ['Capital Gains', formatINR(capitalGains.equity_ltcg + capitalGains.equity_stcg + capitalGains.property_ltcg)],
                      ['─── Gross Total Income', formatINR(totalIncome)],
                      regime === 'old' ? ['Less: Deductions (80C/80D)', `(${formatINR(deductions.section_80c + deductions.section_80d)})`] : null,
                      ['═══ Taxable Income', formatINR(taxableIncome)],
                    ].filter(Boolean).map(([k, v], i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 0', color: k!.startsWith('═') ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: k!.startsWith('═') ? 700 : 400 }}>{k}</td>
                        <td style={{ textAlign: 'right', fontWeight: k!.startsWith('═') ? 700 : 400, color: k!.startsWith('═') ? 'var(--text-primary)' : 'inherit' }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {taxResult && (
                  <div className="alert alert-success">
                    <CheckCircle size={14} />
                    Net Tax Liability: <strong>{formatINR(taxResult.net_tax_liability)}</strong>
                    {' '}(Rebate 87A: {formatINR(taxResult.rebate_87a)} · Cess: {formatINR(taxResult.cess)})
                  </div>
                )}
                {gstCheck && gstCheck.mismatch && (
                  <div className="alert alert-warning">
                    <AlertCircle size={14} />
                    GST Turnover Mismatch! ITR: {formatINR(gstCheck.itr_turnover)} vs GST: {formatINR(gstCheck.gst_turnover)} (diff: {formatINR(gstCheck.diff)})
                  </div>
                )}
                {saveError && (
                  <div className="alert alert-warning mt-3">
                    <AlertCircle size={14} /> {saveError}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-primary" onClick={handleSaveAndCompute} disabled={loading}>
                    {loading ? <span className="spinner" /> : null} Compute Tax
                  </button>
                  {itrId && <button className="btn btn-secondary" onClick={handleGSTCrosscheck}>GST Cross-Check</button>}
                </div>
              </div>
            )}

            {step === 8 && (
              <div>
                <div className="section-title mb-4">🤖 AI Review — Anomaly Detection</div>
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  Your ITR is sent to local Ollama for review with PAN and name removed.
                  No data leaves the LAN.
                </div>
                <button className="btn btn-primary" onClick={handleAIReview} disabled={loading || !itrId}>
                  {loading ? <span className="spinner" /> : <Wand2 size={14} />}
                  Run AI Review (Local Ollama)
                </button>
                {aiError && (
                  <div className="alert alert-warning mt-3">
                    <AlertCircle size={14} /> {aiError}
                  </div>
                )}
                {aiNotes && (
                  <div style={{
                    marginTop: 20, padding: 20, background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                    whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)'
                  }}>
                    {aiNotes}
                  </div>
                )}
                <div className="alert alert-warning" style={{ marginTop: 16 }}>
                  AI review is a tool — always verify conclusions before filing.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 mt-6">
              {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
              {step < STEPS.length - 1 && <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>}
            </div>
          </div>

          {/* Live summary sidebar */}
          <div style={{ width: 240, flexShrink: 0 }}>
            <div className="card" style={{ position: 'sticky', top: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Summary
              </div>
              {[
                ['Salary', formatINR(salaryNet)],
                ['Business', formatINR(businessProfit)],
                ['House Prop.', formatINR(hpIncome)],
                ['Other', formatINR(otherSources.interest + otherSources.dividends)],
                ['Cap. Gains', formatINR(capitalGains.equity_ltcg + capitalGains.equity_stcg + capitalGains.property_ltcg)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between" style={{ padding: '8px 0', marginTop: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Taxable Income</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-light)', fontSize: 13 }}>{formatINR(taxableIncome)}</span>
              </div>
              {taxResult && (
                <div style={{ marginTop: 8, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>Tax Liability</span>
                    <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 13 }}>{formatINR(taxResult.net_tax_liability)}</span>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${regime === 'new' ? 'badge-blue' : 'badge-purple'}`}>{regime} regime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
