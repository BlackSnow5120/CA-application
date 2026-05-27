import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import TDSList from './pages/tds/TDSList';
import TDSForm from './pages/tds/TDSForm';
import GSTR2B from './pages/gst/GSTR2B';
import ITRWizard from './pages/itr/ITRWizard';
import Depreciation from './pages/accounting/Depreciation';
import CaseList from './pages/litigation/CaseList';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/tds" element={<TDSList />} />
          <Route path="/tds/new" element={<TDSForm />} />
          <Route path="/gst" element={<GSTR2B />} />
          <Route path="/itr" element={<ITRWizard />} />
          <Route path="/accounting/depreciation" element={<Depreciation />} />
          <Route path="/litigation" element={<CaseList />} />
          <Route path="*" element={
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
              <div>Page not found</div>
            </div>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
