// Sidebar — dark warm ink with editorial serif logo
function Sidebar({ collapsed, onToggle }) {
  const [active, setActive] = React.useState('overview');

  const groups = [
    { header: 'Operations', items: [
      { k:'overview',  label:'Overview',       icon: I.home,     badge: null },
      { k:'pipeline',  label:'Lab Pipeline',   icon: I.flask,    badge: '47' },
      { k:'delivery',  label:'Deliveries',     icon: I.box,      badge: '42' },
      { k:'queue',     label:'Live Queue',     icon: I.pipeline, badge: null, dot: 'var(--rose)' },
    ]},
    { header: 'Network', items: [
      { k:'doctors',   label:'Doctors',        icon: I.users,    badge: '42' },
      { k:'nurses',    label:'Nurses',         icon: I.users,    badge: '36' },
      { k:'partners',  label:'Labs & Pharmacy',icon: I.pin,      badge: '22' },
      { k:'patients',  label:'Patients',       icon: I.users,    badge: '8.4k' },
    ]},
    { header: 'Finance', items: [
      { k:'revenue',   label:'Revenue',        icon: I.rupee,    badge: null },
      { k:'payouts',   label:'Payouts',        icon: I.rupee,    badge: '14' },
      { k:'refunds',   label:'Refunds',        icon: I.rupee,    badge: '2', dot: 'var(--honey)' },
    ]},
  ];

  if (collapsed) return (
    <aside style={{
      width: 64, background: 'var(--sidebar)', borderRight: '1px solid rgba(244,236,225,0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0', flexShrink: 0,
      color: 'rgba(244,236,225,0.8)',
    }}>
      <Logo compact/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 24, width: '100%', padding: '0 10px' }}>
        {groups.flatMap(g => g.items).slice(0, 9).map(it => (
          <div key={it.k} className="tap" onClick={()=>setActive(it.k)} title={it.label} style={{
            width: 44, height: 44, borderRadius: 10,
            display: 'grid', placeItems: 'center',
            background: active === it.k ? 'rgba(180,100,31,0.18)' : 'transparent',
            color: active === it.k ? 'var(--amber)' : 'rgba(244,236,225,0.55)',
            border: active === it.k ? '1px solid rgba(232,160,76,0.25)' : '1px solid transparent',
          }}>{it.icon('currentColor')}</div>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div className="tap" onClick={onToggle} style={{
        width: 36, height: 36, borderRadius: 8, color: 'rgba(244,236,225,0.5)',
        display: 'grid', placeItems: 'center', border: '1px solid rgba(244,236,225,0.08)',
      }}>{I.arrow('right')}</div>
    </aside>
  );

  return (
    <aside style={{
      width: 232, background: 'var(--sidebar)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      color: 'rgba(244,236,225,0.75)',
      borderRight: '1px solid rgba(244,236,225,0.06)',
      position: 'relative',
    }}>
      {/* Logo + org */}
      <div style={{ padding: '18px 18px 14px' }}>
        <Logo/>
        <div style={{ marginTop: 16, padding: '8px 10px', borderRadius: 10,
          background: 'rgba(244,236,225,0.04)', border: '1px solid rgba(244,236,225,0.06)',
          display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--amber), var(--amber-2))',
            display: 'grid', placeItems: 'center',
            fontFamily: 'Instrument Serif', color: 'var(--bone)', fontSize: 13 }}>S</div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
            <div style={{ fontSize: 12.5, color: 'var(--bone)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Shashank P.</div>
            <div className="mono" style={{ fontSize: 9, color: 'rgba(244,236,225,0.4)', letterSpacing: 0.08, textTransform: 'uppercase' }}>Lead Operator</div>
          </div>
          {I.arrow('down', 'rgba(244,236,225,0.4)')}
        </div>
      </div>

      {/* Nav groups */}
      <div className="scroll-y" style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
        {groups.map(g => (
          <div key={g.header} style={{ marginBottom: 18 }}>
            <div className="micro" style={{ fontSize: 8.5, padding: '6px 10px 8px', color: 'rgba(244,236,225,0.35)' }}>
              {g.header}
            </div>
            {g.items.map(it => {
              const on = active === it.k;
              return (
                <div key={it.k} className="tap" onClick={() => setActive(it.k)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 1,
                  background: on ? 'rgba(180,100,31,0.18)' : 'transparent',
                  color: on ? 'var(--bone)' : 'rgba(244,236,225,0.7)',
                  borderLeft: on ? '2px solid var(--amber)' : '2px solid transparent',
                  paddingLeft: on ? 8 : 10,
                }}>
                  <span style={{ color: on ? 'var(--amber)' : 'rgba(244,236,225,0.55)' }}>{it.icon('currentColor')}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: on ? 500 : 400 }}>{it.label}</span>
                  {it.dot && <span style={{ width: 6, height: 6, borderRadius: 6, background: it.dot,
                    boxShadow: `0 0 5px ${it.dot}`, animation: 'pulse-dot 1.4s infinite' }}/>}
                  {it.badge && <span className="mono" style={{ fontSize: 9.5,
                    padding: '1px 7px', borderRadius: 99, letterSpacing: 0.02,
                    background: on ? 'rgba(244,236,225,0.12)' : 'rgba(244,236,225,0.06)',
                    color: on ? 'var(--bone)' : 'rgba(244,236,225,0.55)' }}>{it.badge}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer controls */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(244,236,225,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--green)',
            boxShadow: '0 0 5px var(--green)', animation: 'pulse-dot 2s infinite' }}/>
          <span className="mono" style={{ fontSize: 9.5, color: 'rgba(244,236,225,0.55)', letterSpacing: 0.05, textTransform: 'uppercase' }}>
            All systems nominal
          </span>
        </div>
        <div className="tap" onClick={onToggle} style={{
          marginTop: 6, padding: '7px 10px', borderRadius: 8,
          border: '1px solid rgba(244,236,225,0.08)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: 'rgba(244,236,225,0.55)',
        }}>
          {I.arrow('left')} <span>Collapse</span>
        </div>
      </div>
    </aside>
  );
}

function Logo({ compact=false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 0 : 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9,
        background: 'radial-gradient(circle at 30% 30%, var(--amber), var(--amber-2))',
        display: 'grid', placeItems: 'center',
        boxShadow: '0 4px 10px rgba(180,100,31,0.35), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
        <span className="serif" style={{ fontSize: 16, color: 'var(--bone)', lineHeight: 1 }}>o</span>
      </div>
      {!compact && (
        <div style={{ lineHeight: 1.1 }}>
          <div className="serif" style={{ fontSize: 18, color: 'var(--bone)' }}>
            onlyou<span className="serif-i" style={{ color: 'var(--amber)' }}>.life</span>
          </div>
          <div className="mono" style={{ fontSize: 8.5, color: 'rgba(244,236,225,0.4)', letterSpacing: 0.12, textTransform: 'uppercase', marginTop: 1 }}>
            Operator Desk
          </div>
        </div>
      )}
    </div>
  );
}

window.Sidebar = Sidebar;
