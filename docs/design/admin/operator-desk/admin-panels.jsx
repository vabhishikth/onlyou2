// Queue table + Workforce + Revenue + Feed (right rail + bottom)

function QueueTable() {
  const [filter, setFilter] = React.useState('all');
  const rows = filter === 'all' ? LAB_ORDERS : LAB_ORDERS.filter(o => o.sla === filter);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, boxShadow: 'var(--shadow-card)', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="micro">
            <span style={{ display:'inline-block', width:6, height:6, borderRadius:6, background:'var(--amber)', marginRight:6, verticalAlign:'middle', animation:'pulse-dot 1.5s infinite' }}/>
            Live Queue · Lab Orders
          </div>
          <div className="serif" style={{ fontSize: 22, marginTop: 4, lineHeight: 1.1 }}>
            Needs your <span className="serif-i">eyes</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { k:'all',    label:'All',      n: LAB_ORDERS.length },
            { k:'breach', label:'Overdue',  n: LAB_ORDERS.filter(o=>o.sla==='breach').length, color:'var(--rose)' },
            { k:'warn',   label:'Due soon', n: LAB_ORDERS.filter(o=>o.sla==='warn').length,   color:'var(--honey)' },
            { k:'ok',     label:'On time',  n: LAB_ORDERS.filter(o=>o.sla==='ok').length,     color:'var(--green)' },
          ].map(f => {
            const on = filter === f.k;
            return (
              <div key={f.k} className="tap" onClick={()=>setFilter(f.k)} style={{
                padding: '6px 11px', borderRadius: 99, fontSize: 11.5,
                background: on ? 'var(--ink)' : 'var(--card-2)',
                color: on ? 'var(--bone)' : 'var(--ink-2)',
                border: on ? '1px solid var(--ink)' : '1px solid var(--line-2)',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: on ? 500 : 400,
              }}>
                {f.color && <span style={{ width:5, height:5, borderRadius:5, background: f.color }}/>}
                {f.label}
                <span className="mono" style={{ fontSize: 9.5, opacity: 0.7 }}>{f.n}</span>
              </div>
            );
          })}
          <div className="tap" style={{
            marginLeft: 6, padding: '6px 11px', borderRadius: 99, fontSize: 11.5,
            background: 'var(--amber)', color: 'var(--bone)',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
          }}>{I.plus('var(--bone)')} New order</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--line-2)' }}>
        {/* Table head */}
        <div className="queue-head" style={{
          display: 'grid',
          gridTemplateColumns: '110px 1.7fr 1.3fr 1.4fr 110px 100px 36px',
          gap: 14, padding: '10px 20px', background: 'var(--card-2)',
          borderBottom: '1px solid var(--line-2)',
        }}>
          {['Order','Patient','Stage','Partner · Test','SLA','City','' ].map((h,i) =>
            <div key={i} className="micro" style={{ fontSize: 8.5 }}>{h}</div>
          )}
        </div>

        {rows.map((o, i) => <QueueRow key={o.id} o={o} idx={i}/>)}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding: '10px 20px', background: 'var(--card-2)', borderTop: '1px solid var(--line-2)' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
            Showing {rows.length} of 47 · updated <span style={{ color: 'var(--green)' }}>just now</span>
          </div>
          <div className="tap" style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
            Open full queue {I.arrow('right','var(--amber)')}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ o, idx }) {
  const initials = o.patient.split(' ').map(n=>n[0]).slice(0,2).join('');
  return (
    <div className="tap queue-row" style={{
      display: 'grid',
      gridTemplateColumns: '110px 1.7fr 1.3fr 1.4fr 110px 100px 36px',
      gap: 14, padding: '13px 20px', alignItems: 'center',
      borderBottom: '1px solid var(--line-2)',
    }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', letterSpacing: 0.04, fontWeight: 500 }}>
        {o.id}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9,
          background: `linear-gradient(135deg, hsl(${25+idx*27}, 38%, 45%), hsl(${18+idx*27}, 45%, 28%))`,
          display: 'grid', placeItems: 'center',
          fontFamily: 'Instrument Serif', fontSize: 13, color: 'var(--bone)',
          border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0,
        }}>{initials}</div>
        <div style={{ minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.patient}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
            {o.test.length > 26 ? o.test.slice(0,24)+'…' : o.test}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, background: stageColor(o.stage),
          boxShadow: `0 0 5px ${stageColor(o.stage)}66` }}/>
        <span style={{ fontSize: 12.5, color: 'var(--ink-2)', textTransform: 'capitalize', fontWeight: 500 }}>
          {o.stage}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {o.partner}
      </div>
      <div>
        <span className={`sla ${o.sla}`}>
          <span className="d"/>{o.eta}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.04 }}>
        {o.city}
      </div>
      <div style={{ color: 'var(--muted)', display: 'grid', placeItems: 'end' }}>
        {I.more()}
      </div>
    </div>
  );
}

function RevenueCard() {
  const todayTotal = REV_HOUR.reduce((s,d)=>s+d.r, 0);
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '18px 20px 16px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="micro" style={{ color: 'var(--amber)' }}>Revenue · Today</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span className="serif" style={{ fontSize: 34, lineHeight: 1, letterSpacing: '-0.025em' }}>
              ₹{(todayTotal/1000).toFixed(1)}<span className="serif-i" style={{ color: 'var(--muted)' }}>k</span>
            </span>
            <span className="sla ok"><span className="d"/>+12.4%</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            126 consultations · 47 labs · 42 deliveries
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Day','Week','Month'].map((t,i) => (
            <div key={t} className="tap" style={{
              padding: '5px 10px', borderRadius: 99, fontSize: 10.5,
              background: i === 0 ? 'var(--ink)' : 'transparent',
              color: i === 0 ? 'var(--bone)' : 'var(--muted)',
              border: i === 0 ? '1px solid var(--ink)' : '1px solid var(--line-2)',
              fontWeight: i === 0 ? 500 : 400,
            }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, marginLeft: -4 }}>
        <RevChart data={REV_HOUR} w={540} h={120}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -8, padding: '0 2px' }}>
        {[6,9,12,15,18,22].map(h => (
          <span key={h} className="mono" style={{ fontSize: 9, color: h===15 ? 'var(--ink)' : 'var(--muted-2)',
            fontWeight: h===15 ? 600 : 400 }}>
            {h===15 ? 'NOW · 14:22' : `${String(h).padStart(2,'0')}:00`}
          </span>
        ))}
      </div>
    </div>
  );
}

function CoverageCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '18px 20px 14px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="micro">City Coverage</div>
          <div className="serif" style={{ fontSize: 20, marginTop: 2 }}>
            Where we <span className="serif-i">are</span>
          </div>
        </div>
        <span className="chip"><span style={{ width:5, height:5, borderRadius:5, background:'var(--honey)' }}/>3 gaps</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {COVERAGE.map(c => (
          <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 76, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{c.city}</div>
            <div style={{ flex: 1, display: 'flex', gap: 4 }}>
              {Array.from({length: 15}).map((_,i) => {
                const filled = i < (c.nurses + c.riders);
                const kind = i < c.nurses ? 'nurse' : i < c.nurses + c.riders ? 'rider' : 'gap';
                return <div key={i} style={{
                  flex: 1, height: 22, borderRadius: 3,
                  background: !filled ? 'var(--line-2)' :
                              kind === 'nurse' ? 'var(--amber)' : 'var(--honey)',
                  opacity: !filled ? 1 : 1,
                }}/>;
              })}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', width: 56, textAlign: 'right' }}>
              {c.nurses}+{c.riders}
              {c.gap > 0 && <span style={{ color: 'var(--rose)' }}> ·{c.gap}!</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line-2)',
        display: 'flex', gap: 14, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--amber)' }}/>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>NURSES</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--honey)' }}/>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>RIDERS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--line-2)' }}/>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>IDLE CAPACITY</span>
        </div>
      </div>
    </div>
  );
}

function WorkforceCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '16px 18px 14px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="micro">Workforce</div>
          <div className="serif" style={{ fontSize: 18, marginTop: 2 }}>Who's <span className="serif-i">on</span></div>
        </div>
        <div className="tap" style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Manage {I.arrow('right','var(--amber)')}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {WORKFORCE.map(w => {
          const pct = Math.round((w.online / w.total) * 100);
          return (
            <div key={w.role} style={{
              padding: '11px 12px', borderRadius: 11,
              background: 'var(--card-2)', border: '1px solid var(--line-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="micro" style={{ fontSize: 8.5, color: w.accent }}>{w.role}</div>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--green)',
                  boxShadow: '0 0 4px var(--green)', animation: 'pulse-dot 1.8s infinite' }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <span className="serif" style={{ fontSize: 22, lineHeight: 1 }}>{w.online}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>/ {w.total}</span>
              </div>
              <div style={{ marginTop: 7, height: 3, borderRadius: 3, background: 'var(--line-2)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: w.accent }}/>
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, letterSpacing: 0.04 }}>
                {w.verified}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: '16px 18px 6px', boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="micro">
            <span style={{ display:'inline-block', width:6, height:6, borderRadius:6, background:'var(--amber)', marginRight:6, verticalAlign:'middle', animation:'pulse-dot 1.5s infinite' }}/>
            Live Ops Feed
          </div>
          <div className="serif" style={{ fontSize: 18, marginTop: 2 }}>What <span className="serif-i">just</span> happened</div>
        </div>
        <div className="tap" style={{ color: 'var(--muted)' }}>{I.more()}</div>
      </div>
      {FEED.map((f, i) => {
        const sevC = { breach:'var(--rose)', warn:'var(--honey)', ok:'var(--green)' }[f.sev];
        const sevBg = { breach:'rgba(162,70,54,0.08)', warn:'rgba(181,122,47,0.08)', ok:'rgba(78,122,74,0.06)' }[f.sev];
        return (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '10px 2px',
            borderTop: i === 0 ? 'none' : '1px dashed var(--line-2)',
          }}>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 7, background: sevC,
                boxShadow: `0 0 6px ${sevC}` }}/>
              {i < FEED.length - 1 && (
                <div style={{ position: 'absolute', top: 12, left: 3, width: 1, height: 40,
                  background: 'var(--line-2)' }}/>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: 0.1, textTransform: 'uppercase', color: sevC, fontWeight: 500,
                  padding: '2px 7px', borderRadius: 99, background: sevBg, border: `1px solid ${sevC}33` }}>
                  {f.tag}
                </span>
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{f.t}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.4 }}>
                {f.text}
              </div>
              {f.cta && (
                <div className="tap" style={{
                  marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 99,
                  background: 'var(--ink)', color: 'var(--bone)',
                  fontSize: 10.5, fontWeight: 500,
                }}>
                  {f.cta} {I.arrow('right', 'var(--amber)')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { QueueTable, QueueRow, RevenueCard, CoverageCard, WorkforceCard, FeedCard });
