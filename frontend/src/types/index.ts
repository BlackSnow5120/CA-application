export interface Client {
  id: number;
  name: string;
  pan: string;
  gstin?: string;
  email?: string;
  phone?: string;
  client_type: string;
  created_at: string;
}

export interface TDSReturn {
  id: number;
  client_id: number;
  form_type: string;
  quarter: string;
  financial_year: string;
  status: string;
  deductee_count: number;
  total_tds_amount: number;
  filed_at?: string;
  created_at: string;
}

export interface GSTInvoice {
  id: number;
  gst_period_id: number;
  invoice_type: string;
  invoice_number: string;
  invoice_date: string;
  party_gstin?: string;
  party_name?: string;
  taxable_amount: number;
  igst: number;
  cgst: number;
  sgst: number;
  direction: string;
  recon_status: string;
}

export interface GSTPeriod {
  id: number;
  client_id: number;
  period: string;
  gstr1_status: string;
  gstr3b_status: string;
  total_output_gst: number;
  total_itc_claimed: number;
  net_payable: number;
  invoices: GSTInvoice[];
}

export interface ITRReturn {
  id: number;
  client_id: number;
  financial_year: string;
  assessment_year: string;
  itr_form?: string;
  status: string;
  regime: string;
  gross_total_income: number;
  taxable_income: number;
  tax_liability: number;
  tds_credit: number;
  advance_tax_paid: number;
  self_assessment_tax: number;
  ai_review_notes?: string;
  gst_turnover_mismatch: boolean;
  created_at: string;
}

export interface LitigationCase {
  id: number;
  client_id: number;
  case_title: string;
  case_type: string;
  authority: string;
  notice_date?: string;
  hearing_date?: string;
  status: string;
  facts_of_case?: string;
  it_sections?: string[];
  case_laws?: CaseLaw[];
  draft_statement_of_facts?: string;
  draft_grounds_of_appeal?: string;
  draft_written_submissions?: string;
  draft_version: number;
  last_drafted_at?: string;
  created_at: string;
}

export interface CaseLaw {
  citation: string;
  court: string;
  year: number;
  holding: string;
}

export interface OllamaStatus {
  available: boolean;
  model: string;
  model_loaded: boolean;
  all_models?: string[];
}

export interface DashboardSummary {
  deadlines: Deadline[];
  clients: ClientSummary[];
  total_clients: number;
}

export interface Deadline {
  type: string;
  deadline_date: string;
  days_left: number;
  status: 'green' | 'amber' | 'red' | 'overdue';
}

export interface ClientSummary {
  id: number;
  name: string;
  pan: string;
  gstin?: string;
  client_type: string;
  gst_this_month: {
    period: string;
    gstr1_status: string;
    gstr3b_status: string;
    net_payable: number;
  };
  tds_latest: {
    quarter: string;
    status: string;
    total_tds: number;
  };
  itr_status: {
    fy: string;
    status: string;
  };
}

export interface DepreciationAsset {
  id: number;
  client_id: number;
  asset_name: string;
  asset_block: string;
  purchase_date: string;
  cost: number;
  companies_act_rate: number;
  income_tax_rate: number;
  opening_wdv_companies?: number;
  opening_wdv_tax?: number;
  depreciation_companies?: number;
  depreciation_tax?: number;
  closing_wdv_companies?: number;
  closing_wdv_tax?: number;
  financial_year: string;
}
