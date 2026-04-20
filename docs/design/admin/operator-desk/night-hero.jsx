// ONLYOU Operator Night — hero (throughput chart) + recent orders list

// Throughput by hour — last 24h of lab orders completed
const THROUGHPUT_DAYS = ['S','M','T','W','T','F','S'];
const THROUGHPUT_VAL  = [142, 168, 184, 203, 176, 158, 131];
const THROUGHPUT_SEL  = 3; // Wed highlighted

function Spark({ points, width=38, height=60, color='var(--ink-2)' }) {
  const max = Math.max(...points), min = Math.min(...points);
  const rng = Math.max(1, max - min);
  const step = width / (points.length - 1);
  const d = points.map((v,i) => {
    const x = i * step;
    const y = height - ((v - min) / rng) * (height - 4) - 2;
    return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

function ThroughputChart() {
  const W = 560, H = 240;
  const pad = 40;
  const n = THROUGHPUT_VAL.length;
  const max = Math.max(...THROUGHPUT_VAL);
  const step = (W - pad*2) / (n - 1);

  const pts = THROUGHPUT_VAL.map((v,i) => ({
    x: pad + i*step,
    y: H - 72 - (v/max) * (H - 140),
    v, i,
  }));

  return (
    <div style={{ position:'relative', height: H, marginTop: 8 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="var(--lime)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--lime)" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(236,237,239,0.35)"/>
            <stop offset="50%" stopColor="var(--lime)"/>
            <stop offset="100%" stopColor="rgba(236,237,239,0.35)"/>
          </linearGradient>
        </defs>

        {/* horizontal grid */}
        {[0.25, 0.5, 0.75].map((t,i) => (
          <line key={i} x1={pad} x2={W-pad} y1={H-72-(H-140)*t} y2={H-72-(H-140)*t}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="3 5"/>
        ))}

        {/* area */}
        <path
          d={`M${pts[0].x} ${H-72} ${pts.map(p=>`L${p.x} ${p.y}`).join(' ')} L${pts[n-1].x} ${H-72} Z`}
          fill="url(#areaGrad)"/>
        {/* line */}
        <path d={pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')}
          fill="none" stroke="url(#lineGrad)" strokeWidth="2"/>

        {/* vertical drop from selected */}
        <line
          x1={pts[THROUGHPUT_SEL].x} x2={pts[THROUGHPUT_SEL].x}
          y1={pts[THROUGHPUT_SEL].y + 8} y2={H-66}
          stroke="var(--hair-3)" strokeDasharray="3 3"/>

        {/* dots */}
        {pts.map((p,i) => {
          const sel = i === THROUGHPUT_SEL;
          return (
            <g key={i}>
              {sel && <circle cx={p.x} cy={p.y} r="10" fill="var(--lime)" opacity="0.15"/>}
              <circle cx={p.x} cy={p.y} r={sel?5:3.5}
                fill={sel?'var(--lime)':'var(--ink)'}
                stroke={sel?'#0B0C0F':'var(--bg)'} strokeWidth={sel?2:1.5}/>
            </g>
          );
        })}

        {/* selected label */}
        <g transform={`translate(${pts[THROUGHPUT_SEL].x}, ${pts[THROUGHPUT_SEL].y - 30})`}>
          <rect x="-34" y="-14" width="68" height="26" rx="13" fill="#0B0C0F" stroke="var(--lime)" strokeWidth="1"/>
          <text x="0" y="4" textAnchor="middle" fill="var(--lime)" fontSize="12.5" fontWeight="600"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            203 ord.
          </text>
        </g>
      </svg>

      {/* day pills — positioned under chart */}
      <div style={{
        position:'absolute', left: 0, right: 0, bottom: 10,
        display:'flex', justifyContent:'space-between',
        paddingLeft: pad * (100/W) + '%', paddingRight: pad * (100/W) + '%',
      }}>
        {THROUGHPUT_DAYS.map((d, i) => {
          const sel = i === THROUGHPUT_SEL;
          return (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: 32,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 12, fontWeight: 600,
              background: sel ? 'var(--ink)' : 'transparent',
              color: sel ? '#0B0C0F' : 'var(--muted)',
              border: sel ? 'none' : '1px solid var(--hair-2)',
            }}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="panel-2" style={{ padding: 28, position:'relative', overflow:'hidden' }}>
      {/* corner decoration */}
      <div className="dot-grid" style={{
        position:'absolute', top: -20, right: -20, width: 180, height: 180,
        opacity: 0.5, pointerEvents:'none',
        maskImage:'radial-gradient(circle at top right, #000 10%, transparent 70%)',
      }}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'var(--panel-3)', border:'1px solid var(--hair-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round"/><path d="M7 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="micro">SLA · LAB THROUGHPUT</span>
          </div>
          <h1 style={{
            margin: 0, fontSize: 42, fontWeight: 500, letterSpacing:'-0.025em', lineHeight: 1.05,
          }}>Order Throughput</h1>
          <p style={{ margin:'10px 0 0', color: 'var(--muted)', fontSize: 13.5, maxWidth: 420, lineHeight: 1.5 }}>
            Lab orders closed per day this week. Hover a node to inspect by city, partner, and turnaround time.
          </p>
        </div>

        <button className="btn" style={{ whiteSpace:'nowrap' }}>
          This week
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <ThroughputChart/>

      {/* footer: delta + pills */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        marginTop: 18, paddingTop: 18, borderTop:'1px solid var(--hair)',
      }}>
        <div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 500, letterSpacing:'-0.03em', color:'var(--lime)' }}>+18%</span>
            <span className="mono" style={{ fontSize: 11, color:'var(--muted)' }}>vs last wk</span>
          </div>
          <p style={{ margin:'6px 0 0', color:'var(--ink-2)', fontSize: 12.5, lineHeight: 1.4 }}>
            1,162 orders closed · avg TAT <span className="mono" style={{ color:'var(--ink)' }}>13h 48m</span>
          </p>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <span className="chip"><span className="dot" style={{ background:'var(--lime)' }}/> Healthians · 412</span>
          <span className="chip"><span className="dot" style={{ background:'var(--cyan)' }}/> Apex · 338</span>
          <span className="chip"><span className="dot" style={{ background:'var(--amber)' }}/> Metropolis · 287</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Right column: recent lab orders ---------- */

const RECENT_ORDERS = [
  {
    id: 'LO-8821', title: 'Lab Order · CBC + Thyroid', rate: '₹1,240',
    paid: 'Paid', accent: 'var(--lime)', expanded: true,
    tags: ['Bengaluru','Nurse visit'],
    body: 'Nurse Vivek K. dispatched 08:42 · ETA 23m. Sample requires fasting; patient confirmed. Insurance pre-auth cleared.',
    meta: ['Bengaluru', '2h ago'],
  },
  {
    id: 'LO-8820', title: 'Lab Order · Lipid · Vit D', rate: '₹2,480',
    paid: 'Unpaid', accent: 'var(--amber)', expanded: false,
  },
  {
    id: 'LO-8819', title: 'Delivery · Thyronorm 50', rate: '₹320',
    paid: 'Paid', accent: 'var(--cyan)', expanded: false,
  },
];

function Caret({ dir='down' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"
      style={{ transform: dir==='up' ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>
      <path d="M4 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RecentOrderRow({ o }) {
  const [open, setOpen] = React.useState(o.expanded);
  return (
    <div className="panel" style={{
      padding: 14, background: open ? 'var(--panel-2)' : 'var(--panel)',
      transition:'background .2s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `color-mix(in oklch, ${o.accent} 20%, var(--panel))`,
          border: `1px solid color-mix(in oklch, ${o.accent} 40%, transparent)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: o.accent,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="3" width="16" height="18" rx="3"/>
            <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{o.title}</span>
            <span className={'chip ' + (o.paid==='Paid'?'solid':'dark')} style={{ fontSize: 10, padding:'2px 8px' }}>{o.paid}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color:'var(--muted)', marginTop: 3 }}>
            {o.id} · {o.rate}
          </div>
        </div>
        <button className="icon-btn" style={{ width: 32, height: 32, color:'var(--muted)' }} onClick={() => setOpen(v=>!v)}>
          <Caret dir={open?'up':'down'}/>
        </button>
      </div>

      {open && o.tags && (
        <div className="rise" style={{ marginTop: 14 }}>
          <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
            {o.tags.map(t => <span key={t} className="chip" style={{ fontSize: 10.5 }}>{t}</span>)}
          </div>
          <p style={{ margin:'10px 0 0', color:'var(--ink-2)', fontSize: 12.5, lineHeight: 1.5 }}>
            {o.body}
          </p>
          <div style={{ display:'flex', alignItems:'center', gap: 16, marginTop: 10 }}>
            {o.meta.map((m,i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap: 5, color:'var(--muted)', fontSize: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {i===0
                    ? <><path d="M12 22s-8-7-8-13a8 8 0 1116 0c0 6-8 13-8 13z"/><circle cx="12" cy="9" r="3"/></>
                    : <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></>
                  }
                </svg>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentOrders() {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14 }}>
        <div>
          <div className="micro" style={{ marginBottom: 6 }}>LIVE QUEUE · 47 CASES</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing:'-0.015em' }}>Active cases</h2>
        </div>
        <div className="tap" style={{ fontSize: 12.5, color:'var(--lime)', display:'flex', alignItems:'center', gap: 4 }}>
          See all <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 3l4 3-4 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        {RECENT_ORDERS.map(o => <RecentOrderRow key={o.id} o={o}/>)}
      </div>
    </div>
  );
}

Object.assign(window, { HeroCard, RecentOrders, Caret });
