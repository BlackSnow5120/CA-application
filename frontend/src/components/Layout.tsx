import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Receipt, Building2, Scale, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { getOllamaStatus } from '../lib/api';
import type { OllamaStatus } from '../types';

const NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Clients', to: '/clients', icon: Users },
  { section: 'Compliance' },
  { label: 'TDS Returns', to: '/tds', icon: FileText },
  { label: 'GST Returns', to: '/gst', icon: Receipt },
  { label: 'Income Tax', to: '/itr', icon: Building2 },
  { section: 'Accounting' },
  { label: 'Depreciation', to: '/accounting/depreciation', icon: Building2 },
  { label: 'Bank Import', to: '/accounting/bank', icon: Receipt },
  { section: 'Litigation' },
  { label: 'Cases', to: '/litigation', icon: Scale },
];

function OllamaIndicator() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    const check = () => getOllamaStatus().then(r => setStatus(r.data)).catch(() =>
      setStatus({ available: false, model: '', model_loaded: false })
    );
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  if (!status) return null;
  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, color: status.available ? 'var(--green)' : 'var(--amber)'
    }}>
      {status.available
        ? <><Wifi size={12} /><span>AI Online · {status.model}</span></>
        : <><WifiOff size={12} /><span>AI Offline</span></>
      }
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    getOllamaStatus().then(r => setOllamaStatus(r.data)).catch(() =>
      setOllamaStatus({ available: false, model: '', model_loaded: false })
    );
  }, []);

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>⚖️ CA Firm</h1>
          <p>Compliance Platform</p>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if ('section' in item) {
              return <div key={i} className="nav-section-label">{item.section}</div>;
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <OllamaIndicator />
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Ollama status banner */}
        {ollamaStatus && !ollamaStatus.available && (
          <div className="ollama-banner offline">
            <WifiOff size={14} />
            Local AI is offline — drafting and column mapping unavailable.
            All compliance features work normally.
            To enable: <code style={{ marginLeft: 6, fontFamily: 'monospace' }}>docker-compose up -d ollama</code>
          </div>
        )}
        {ollamaStatus?.available && !ollamaStatus.model_loaded && (
          <div className="ollama-banner loading">
            <span className="spinner" style={{ width: 12, height: 12 }} />
            Ollama running — loading model {ollamaStatus.model} (first run may take a few minutes)
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
