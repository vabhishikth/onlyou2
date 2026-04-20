// ONLYOU Operator Night — top chrome (logo, nav, search, icons)

function NightLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'linear-gradient(135deg, var(--lime), var(--lime-2))',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: 'var(--glow)',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8L7 12L13 4" stroke="#0B0C0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ display:'flex', flexDirection:'column', lineHeight: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>ONLYOU</span>
        <span className="mono" style={{ fontSize: 9.5, color:'var(--muted)', letterSpacing:'0.2em', marginTop: 3 }}>OPERATOR · IN</span>
      </div>
    </div>
  );
}

function NightHeader() {
  const [active, setActive] = React.useState('Desk');
  const tabs = ['Desk', 'Orders', 'Fleet', 'Ledger', 'People'];
  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding: '18px 28px',
      borderBottom: '1px solid var(--hair)',
      background: 'rgba(11,12,15,0.6)',
      backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 40 }}>
        <NightLogo/>
        <nav style={{ display:'flex', gap: 26 }}>
          {tabs.map(t => (
            <div key={t}
              className={'nav-link ' + (active===t?'active':'')}
              onClick={() => setActive(t)}>
              {t}
            </div>
          ))}
        </nav>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        <label className="input" style={{ width: 320 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M20 20L17 17" strokeLinecap="round"/></svg>
          <input placeholder="Search orders, patients, riders…"/>
          <span className="mono" style={{ fontSize: 10, color:'var(--muted)', border:'1px solid var(--hair-2)', padding:'2px 6px', borderRadius: 4 }}>⌘K</span>
        </label>

        <button className="icon-btn" title="Shift">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>
        </button>
        <button className="icon-btn" title="Alerts" style={{ position:'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 004 0" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{
            position:'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 7,
            background: 'var(--rose)', boxShadow:'0 0 6px var(--rose)'
          }}/>
        </button>
        <div className="tap" style={{
          display:'flex', alignItems:'center', gap: 10,
          padding: '5px 12px 5px 5px', borderRadius: 99,
          border:'1px solid var(--hair-2)', background: 'var(--panel-2)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 28,
            background:'linear-gradient(135deg, #D4C29A, #7E6A44)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color: '#0B0C0F', fontWeight: 700, fontSize: 11,
          }}>AP</div>
          <div style={{ display:'flex', flexDirection:'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Ananya P.</span>
            <span className="mono" style={{ fontSize: 9.5, color:'var(--muted)' }}>Ops Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
}

window.NightHeader = NightHeader;
