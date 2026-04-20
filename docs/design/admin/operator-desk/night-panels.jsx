// ONLYOU Operator Night — bottom row panels (workforce, CTA, shift-performance)

const WF_NIGHT = [
  { name:'Vivek K.',    role:'Nurse · L2',       status:'On visit',   avatar:'VK', tone:'#8BB4D8' },
  { name:'Deepa S.',    role:'Rider · Zone E',   status:'In transit', avatar:'DS', tone:'#D8A88B' },
  { name:'Dr. S. Rao',  role:'MD · Internal Med',status:'Reviewing',  avatar:'SR', tone:'#A5D88B' },
];

function WorkforcePanel() {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, letterSpacing:'-0.01em' }}>On shift now</h3>
        <div className="tap" style={{ fontSize: 11.5, color:'var(--lime)' }}>See all</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        {WF_NIGHT.map((w,i) => (
          <div key={i} className="panel" style={{
            padding: 12, display:'flex', alignItems:'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 38,
              background: `linear-gradient(135deg, ${w.tone}, color-mix(in oklch, ${w.tone} 60%, #000))`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#0B0C0F', fontWeight: 700, fontSize: 12,
              flexShrink: 0,
            }}>{w.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{w.name}</span>
                <span style={{
                  fontSize: 9.5, padding:'2px 7px', borderRadius: 99,
                  background:'color-mix(in oklch, var(--lime) 18%, transparent)',
                  color:'var(--lime)', fontWeight: 600, letterSpacing: '0.02em',
                }}>{w.status}</span>
              </div>
              <div style={{ fontSize: 11.5, color:'var(--muted)', marginTop: 2 }}>{w.role}</div>
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- CTA panel ---------- */

function CTAPanel() {
  return (
    <div className="panel-2" style={{
      padding: 22, position:'relative', overflow:'hidden',
      background:'linear-gradient(135deg, #1A1D24, #0F1115)',
      border:'1px solid var(--hair-2)',
    }}>
      {/* dotted mesh decoration */}
      <svg style={{ position:'absolute', right: -10, bottom: -20, opacity: 0.4 }}
        width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <pattern id="meshPat" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill="var(--lime)"/>
          </pattern>
          <radialGradient id="meshFade" cx="100%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <mask id="meshMask"><rect width="180" height="180" fill="url(#meshFade)"/></mask>
        </defs>
        <rect width="180" height="180" fill="url(#meshPat)" mask="url(#meshMask)"/>
      </svg>

      <span className="chip" style={{ background:'#0B0C0F', color:'var(--lime)', border:'1px solid color-mix(in oklch, var(--lime) 35%, transparent)' }}>
        <span className="dot" style={{ background:'var(--lime)', boxShadow:'0 0 6px var(--lime)' }}/>
        Upgrade
      </span>
      <h3 style={{ margin:'14px 0 6px', fontSize: 19, fontWeight: 500, letterSpacing:'-0.015em', lineHeight: 1.2 }}>
        Enable route optimiser
      </h3>
      <p style={{ margin:'0 0 18px', fontSize: 12.5, color:'var(--muted)', lineHeight: 1.5, maxWidth: 240 }}>
        Cut rider idle time by ~22% with AI-assigned delivery routes for the Bengaluru fleet.
      </p>

      <button className="btn primary" style={{ width:'100%', justifyContent:'space-between' }}>
        Activate now
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

/* ---------- Shift performance panel (3 stats + bar viz) ---------- */

function BarViz({ seed, peak, color }) {
  // deterministic pseudo-random bars
  const bars = React.useMemo(() => {
    const arr = [];
    let s = seed;
    for (let i = 0; i < 48; i++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const dist = Math.abs(i - peak) / 24;
      const amp = Math.exp(-dist*dist*2) * 0.8 + 0.15;
      arr.push(0.2 + r * 0.3 + amp * 0.6);
    }
    return arr;
  }, [seed, peak]);

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap: 2, height: 44, width:'100%' }}>
      {bars.map((h,i) => (
        <div key={i} style={{
          flex: 1, height: `${h*100}%`,
          background: color,
          borderRadius: 1.5,
          opacity: 0.35 + h*0.65,
        }}/>
      ))}
    </div>
  );
}

function ShiftPerfPanel() {
  const stats = [
    { label:'Orders closed',  value:203, viz:{ seed:  7, peak: 28, color:'var(--lime)'  } },
    { label:'Avg TAT (min)',  value:162, viz:{ seed: 42, peak: 20, color:'var(--cyan)'  } },
    { label:'SLA breaches',   value:  3, viz:{ seed: 91, peak: 36, color:'var(--rose)'  } },
  ];
  return (
    <div className="panel" style={{ padding: 22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, letterSpacing:'-0.01em' }}>Shift performance</h3>
        <div className="chip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round"/></svg>
          Today · 18 Apr
          <window.Caret/>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 22 }}>
        {stats.map((s,i) => (
          <div key={i} style={{
            paddingRight: i<2 ? 22 : 0,
            borderRight: i<2 ? '1px solid var(--hair)' : 'none',
          }}>
            <div className="micro" style={{ marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 34, fontWeight: 500, letterSpacing:'-0.025em', lineHeight: 1, color: s.viz.color, marginBottom: 14 }}>
              {s.value.toString().padStart(2,'0')}
            </div>
            <BarViz {...s.viz}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6 }}>
              <span className="mono" style={{ fontSize: 9.5, color:'var(--muted)' }}>06:00</span>
              <span className="mono" style={{ fontSize: 9.5, color:'var(--muted)' }}>NOW</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { WorkforcePanel, CTAPanel, ShiftPerfPanel });
