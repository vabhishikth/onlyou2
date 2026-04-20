// Visual primitives + icons for operator portal

const I = {
  home: (c='currentColor') => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{color:c}}><path d="M2 7l6-5 6 5v7H2V7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6.5 14v-4h3v4" stroke="currentColor" strokeWidth="1.2"/></svg>,
  flask: (c='currentColor') => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{color:c}}><path d="M6 1.5v4L2.5 12A1.5 1.5 0 003.8 14h8.4a1.5 1.5 0 001.3-2L10 5.5v-4M4.5 1.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  box: (c='currentColor') => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{color:c}}><path d="M8 1.5L14 4v8l-6 2.5L2 12V4l6-2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M2 4l6 2.5m0 0L14 4M8 6.5v8" stroke="currentColor" strokeWidth="1.2"/></svg>,
  users: (c='currentColor') => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{color:c}}><circle cx="6" cy="5.5" r="2.6" stroke="currentColor" strokeWidth="1.2"/><path d="M1.8 14c0-2.3 1.9-4.2 4.2-4.2S10.2 11.7 10.2 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="12" cy="6.5" r="1.9" stroke="currentColor" strokeWidth="1" opacity="0.55"/><path d="M10 14c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" strokeWidth="1" opacity="0.55" strokeLinecap="round"/></svg>,
  rupee: (c='currentColor') => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{color:c}}><path d="M5 3h7M5 6h7M6.5 3c2.2 0 3.5 1.2 3.5 3 0 1.7-1.3 3-3.5 3H5l6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell: (c='currentColor') => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:c}}><path d="M3 10V6a4 4 0 018 0v4l1 2H2l1-2z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round"/><path d="M5.5 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.15"/></svg>,
  search: (c='currentColor') => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:c}}><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  filter: (c='currentColor') => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{color:c}}><path d="M1 2h11M2.5 6h8M4.5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  arrow: (dir='right', c='currentColor') => { const r = { up:-90, down:90, right:0, left:180 }[dir]; return <svg width="10" height="10" viewBox="0 0 10 10" style={{transform:`rotate(${r}deg)`, color:c}}><path d="M2 2 L7 5 L2 8" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>; },
  more: (c='currentColor') => <svg width="14" height="14" viewBox="0 0 14 14" style={{color:c}}><circle cx="3" cy="7" r="1.1" fill="currentColor"/><circle cx="7" cy="7" r="1.1" fill="currentColor"/><circle cx="11" cy="7" r="1.1" fill="currentColor"/></svg>,
  plus: (c='currentColor') => <svg width="12" height="12" viewBox="0 0 12 12" style={{color:c}}><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  clock: (c='currentColor') => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{color:c}}><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/><path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  pin: (c='currentColor') => <svg width="11" height="12" viewBox="0 0 11 12" fill="none" style={{color:c}}><path d="M5.5 11s4-4 4-6.5a4 4 0 00-8 0C1.5 7 5.5 11 5.5 11z" stroke="currentColor" strokeWidth="1.1"/><circle cx="5.5" cy="4.5" r="1.3" stroke="currentColor" strokeWidth="1"/></svg>,
  check: (c='currentColor') => <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{color:c}}><path d="M2 5.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spark: (c='currentColor') => <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{color:c}}><path d="M6.5 1l1.2 3.2L11 5.5 7.7 6.8 6.5 10l-1.2-3.2L2 5.5l3.3-1.3L6.5 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>,
  settings: (c='currentColor') => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:c}}><circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.1"/><path d="M7 1v1.6M7 11.4V13M1 7h1.6M11.4 7H13M2.8 2.8l1.2 1.2M10 10l1.2 1.2M11.2 2.8L10 4M4 10l-1.2 1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  pipeline: (c='currentColor') => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:c}}><circle cx="2" cy="7" r="1.4" stroke="currentColor" strokeWidth="1.1"/><circle cx="12" cy="7" r="1.4" stroke="currentColor" strokeWidth="1.1"/><circle cx="7" cy="2.5" r="1.4" stroke="currentColor" strokeWidth="1.1"/><circle cx="7" cy="11.5" r="1.4" stroke="currentColor" strokeWidth="1.1"/><path d="M3.4 7h7.2M7 3.9v6.2" stroke="currentColor" strokeWidth="1.1"/></svg>,
};

// Sparkline w/ halo
function Spark({ data, color='var(--amber)', w=70, h=22, filled=false }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data), rng = max-min || 1;
  const pts = data.map((d,i) => [ (i/(data.length-1))*(w-4)+2, h-2 - ((d-min)/rng)*(h-4) ]);
  const path = pts.map((p,i) => (i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = path + ` L${pts[pts.length-1][0]},${h} L${pts[0][0]},${h} Z`;
  const last = pts[pts.length-1];
  return <svg width={w} height={h} style={{display:'block', overflow:'visible'}}>
    {filled && <><defs><linearGradient id="spf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#spf)"/></>}
    <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={last[0]} cy={last[1]} r={5} fill={color} opacity="0.18"><animate attributeName="r" values="3;8;3" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.02;0.25" dur="2.2s" repeatCount="indefinite"/></circle>
    <circle cx={last[0]} cy={last[1]} r="2" fill={color}/>
  </svg>;
}

// Pipeline bar — horizontal stepped funnel
function PipelineBar({ stages, w=340, h=40, compact=false }) {
  const gap = 4;
  const total = stages.reduce((s,st)=>s+st.count,0);
  let x = 0;
  return (
    <div style={{width:'100%'}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
        {stages.map((st, i) => {
          const segW = Math.max(34, (st.count/total) * (w - gap*(stages.length-1)));
          const cur = x;
          x += segW + gap;
          return (
            <g key={i}>
              <rect x={cur} y={0} width={segW} height={h-16} rx={6} fill={st.color} opacity={0.85}/>
              <rect x={cur} y={0} width={segW} height={h-16} rx={6} fill="url(#pipe-shine)" />
              <text x={cur+8} y={h-22} fill="var(--bone)" fontSize="11" fontFamily="Instrument Serif">{st.count}</text>
              <text x={cur+segW-7} y={h-22} fill="var(--bone)" fontSize="8" fontFamily="JetBrains Mono" textAnchor="end" opacity="0.7">{st.avg}</text>
              <text x={cur+4} y={h-3} fill="var(--muted)" fontSize="8.5" fontFamily="JetBrains Mono" letterSpacing="0.5">{st.label.toUpperCase()}</text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="pipe-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Revenue area chart (tiny)
function RevChart({ data, w=340, h=90 }) {
  if (!data?.length) return null;
  const pad={l:6,r:6,t:8,b:16};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const max = Math.max(...data.map(d=>d.r));
  const toX = i => pad.l + (i/(data.length-1))*iw;
  const toY = v => pad.t + ih - (v/max)*ih;
  const pts = data.map((d,i)=>[toX(i), toY(d.r)]);
  const line = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = line + ` L${pts[pts.length-1][0]},${pad.t+ih} L${pts[0][0]},${pad.t+ih} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--amber)" stopOpacity="0.32"/><stop offset="100%" stopColor="var(--amber)" stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#rev)"/>
      <path d={line} stroke="var(--amber)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {[6,10,14,18,22].map(h=>(
        <text key={h} x={toX(data.findIndex(d=>d.h===h))} y={h+60+8} fontSize="8.5" fontFamily="JetBrains Mono" fill="var(--muted-2)" textAnchor="middle" style={{display: data.find(d=>d.h===h) ? 'block' : 'none'}}>
          {h}{h===22?'':''}
        </text>
      ))}
      {pts.map((p,i)=>i===pts.length-1 && (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="6" fill="var(--amber)" opacity="0.15"><animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite"/></circle>
          <circle cx={p[0]} cy={p[1]} r="2.4" fill="var(--amber)"/>
        </g>
      ))}
    </svg>
  );
}

Object.assign(window, { I, Spark, PipelineBar, RevChart });
