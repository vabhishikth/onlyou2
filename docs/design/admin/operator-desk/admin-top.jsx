// Header + KPI strip + Pipelines section

function Header({ onMenu }) {
  return (
    <header style={{
      height: 60, flexShrink: 0, display: 'flex', alignItems: 'center',
      padding: '0 22px', gap: 14,
      background: 'var(--shell)', borderBottom: '1px solid var(--line)',
      position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(8px)',
    }}>
      {onMenu && (
        <div className="tap mobile-menu" onClick={onMenu} style={{
          width: 36, height: 36, borderRadius: 9, background: 'var(--card)',
          border: '1px solid var(--line-2)', display: 'none', placeItems: 'center',
        }}>
          <svg width="14" height="10" viewBox="0 0 14 10"><path d="M1 1h12M1 5h12M1 9h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </div>
      )}
      {/* Title */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div className="micro" style={{ fontSize: 9 }}>Operator · Tue 14 Apr · 14:22 IST</div>
        <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.015em', marginTop: 2 }}>
          Good afternoon, <span className="serif-i">Shashank</span>.
        </div>
      </div>

      <div style={{ flex: 1 }}/>

      {/* Search */}
      <div className="search-bar" style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 13px', minWidth: 280, maxWidth: 380, flex: '0 1 340px',
        background: 'var(--card)', borderRadius: 10,
        border: '1px solid var(--line-2)',
        color: 'var(--muted)',
      }}>
        {I.search()}
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Search patient, LO-ID, partner…</span>
        <span style={{ flex: 1 }}/>
        <span className="mono" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4,
          background: 'var(--card-2)', border: '1px solid var(--line-2)', color: 'var(--muted)' }}>⌘K</span>
      </div>

      {/* Actions */}
      <div className="tap header-btn" style={{
        padding: '8px 12px', borderRadius: 10, background: 'var(--card)',
        border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500,
      }}>
        {I.filter()} <span>Today</span> {I.arrow('down','var(--muted)')}
      </div>
      <div className="tap header-icon" style={{
        width: 38, height: 38, borderRadius: 10, background: 'var(--card)',
        border: '1px solid var(--line-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
        position: 'relative',
      }}>
        {I.bell()}
        <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 7,
          background: 'var(--rose)', boxShadow: '0 0 0 2px var(--shell)', animation: 'pulse-dot 1.5s infinite' }}/>
      </div>
      <div className="tap" style={{
        padding: '7px 14px 7px 8px', borderRadius: 99, background: 'var(--ink)',
        color: 'var(--bone)', display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12.5, fontWeight: 500,
      }}>
        <div style={{ width: 24, height: 24, borderRadius: 99,
          background: 'linear-gradient(135deg, var(--amber), var(--amber-2))',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Instrument Serif', fontSize: 13 }}>S</div>
        <span className="header-name">Shashank</span>
        {I.arrow('down', 'rgba(244,236,225,0.5)')}
      </div>
    </header>
  );
}

function KPIStrip() {
  return (
    <div className="kpi-strip" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
    }}>
      {TODAY_KPIS.map((k, i) => {
        const goodDir = k.sev === 'breach' ? k.delta < 0 : k.delta > 0;
        const deltaColor = goodDir ? 'var(--green)' : 'var(--rose)';
        const accent = k.k === 'revenue' ? 'var(--amber)' : k.sev === 'breach' ? 'var(--rose)' : 'var(--ink-2)';
        return (
          <div key={k.k} className="rise" style={{
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '16px 18px 14px',
            boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden',
            animationDelay: `${i*60}ms`, opacity: 0,
          }}>
            {/* corner accent */}
            <div style={{ position:'absolute', top:0, right:0, width:44, height:44,
              background:`radial-gradient(circle at top right, ${accent}22, transparent 70%)`}}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="micro" style={{ color: k.sev === 'breach' ? 'var(--rose)' : 'var(--muted)' }}>
                {k.sev === 'breach' && <span style={{ display:'inline-block', width:5, height:5, borderRadius:5, background:'var(--rose)', marginRight:6, verticalAlign:'middle', animation:'pulse-dot 1s infinite' }}/>}
                {k.label}
              </div>
              <Spark data={k.spark} color={accent} w={52} h={18} filled/>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span className="serif" style={{ fontSize: 36, lineHeight: 1, letterSpacing: '-0.025em' }}>{k.value}</span>
              {k.suffix && <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{k.suffix}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
              <span style={{ color: deltaColor, display: 'inline-flex', alignItems: 'center' }}>
                {I.arrow(k.delta > 0 ? 'up' : 'down', 'currentColor')}
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: deltaColor, fontWeight: 500 }}>
                {k.delta > 0 ? '+' : ''}{k.delta}{k.k === 'revenue' ? '%' : ''}
              </span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>vs yesterday</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({ title, flavor, stages, accent, badge }) {
  const total = stages.reduce((s,st)=>s+st.count, 0);
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '18px 20px 18px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="micro" style={{ color: accent }}>{flavor}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>{title}</div>
            <span className="serif-i" style={{ fontSize: 14, color: 'var(--muted)' }}>
              · {total} active
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="chip"><span style={{ width:5, height:5, borderRadius:5, background:'var(--green)' }}/>94% on-time</span>
          <div className="tap" style={{ width:28, height:28, display:'grid', placeItems:'center', borderRadius:7, color:'var(--muted)', border:'1px solid var(--line-2)' }}>{I.more()}</div>
        </div>
      </div>

      {/* Pipeline funnel */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', marginBottom: 4 }}>
        {stages.map((st, i) => {
          const isLast = i === stages.length - 1;
          return (
            <React.Fragment key={i}>
              <div className="tap" style={{ flex: 1, position: 'relative', padding: '10px 12px 12px',
                borderRadius: 10,
                background: `linear-gradient(135deg, ${st.color}, ${st.color})`,
                color: 'var(--bone)', minWidth: 0, overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(0,0,0,0.06))', pointerEvents:'none' }}/>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 0.08, textTransform: 'uppercase', opacity: 0.75 }}>{st.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, position:'relative' }}>
                  <span className="serif" style={{ fontSize: 26, lineHeight: 1 }}>{st.count}</span>
                  <span className="mono" style={{ fontSize: 10, opacity: 0.75 }}>{st.avg}</span>
                </div>
              </div>
              {!isLast && (
                <div style={{ width: 16, display: 'grid', placeItems: 'center', color: 'var(--muted-2)' }}>
                  {I.arrow('right')}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Metric footer */}
      <div style={{ marginTop: 14, display: 'flex', gap: 24,
        borderTop: '1px dashed var(--line-2)', paddingTop: 12 }}>
        <Metric label="Avg end-to-end" value="32.4" unit="hrs"/>
        <Metric label="SLA breaches"   value="2"    unit="today" color="var(--rose)"/>
        <Metric label="Throughput"     value="+18%" unit="wow"   color="var(--green)"/>
        <div style={{ flex: 1 }}/>
        <div className="tap" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: accent, fontWeight: 500, alignSelf: 'center' }}>
          Open full pipeline {I.arrow('right', accent)}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, color='var(--ink)' }) {
  return (
    <div style={{ lineHeight: 1.1 }}>
      <div className="micro" style={{ fontSize: 8.5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span className="serif" style={{ fontSize: 18, color, letterSpacing: '-0.015em' }}>{value}</span>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{unit}</span>
      </div>
    </div>
  );
}

Object.assign(window, { Header, KPIStrip, PipelineCard, Metric });
