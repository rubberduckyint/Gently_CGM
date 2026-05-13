// Gently dashboard variations
// Aesthetic: refined iOS-inspired, warm neutrals, three semantic accents.

const G = {
  // Cool neutrals — matched to the brand sheet's pale cool off-white
  bg:        '#F2F4F7',
  bgDeep:    '#E6EAF0',
  card:      '#FFFFFF',
  inkH:      '#0C141C', // headings / brand dark ink
  ink:       '#1A222C',
  ink2:      '#4E5A68',
  ink3:      '#8390A0',
  rule:      'rgba(12,20,28,0.06)',
  rule2:     'rgba(12,20,28,0.10)',

  // Brand
  cyan:      '#16BCE9',
  cyanDeep:  '#0E8FB6',
  cyanBg:    '#E4F5FB',
  cyanBgSoft:'#F1FAFD',

  // Semantic — clinical scannability, retuned slightly cooler to harmonize with cyan
  sage:      '#0E8FB6', // in-range — brand cyan (deepened for AA on white)
  sageBg:    '#E4F5FB',
  sageBgSoft:'#F1FAFD',
  amber:     '#C07A1C', // watch
  amberBg:   '#FAEBD3',
  coral:     '#C24A4A', // act
  coralBg:   '#F8DCD9',
  slate:     '#0E8FB6', // brand-aligned cool accent
};

// Tiny inline icons (no external deps). Stroke-based, hairline.
const Icon = {
  Watch: ({c='currentColor', s=22}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="6" width="10" height="12" rx="2.4"/>
      <path d="M9 6V3.5h6V6M9 18v2.5h6V18"/>
      <circle cx="12" cy="12" r="1.2" fill={c} stroke="none"/>
    </svg>
  ),
  Cloud: ({c='currentColor', s=22}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17h10a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.7-1A3.8 3.8 0 0 0 7 17z"/>
    </svg>
  ),
  Bell: ({c='currentColor', s=22}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16h12l-1.4-2V11a4.6 4.6 0 0 0-9.2 0v3L6 16z"/>
      <path d="M10.5 19a1.6 1.6 0 0 0 3 0"/>
    </svg>
  ),
  Chev: ({c='currentColor', s=18}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  ),
  Check: ({c='currentColor', s=14}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7"/>
    </svg>
  ),
  TrendFlat: ({c='currentColor', s=28}) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 14h16"/>
      <path d="M17 10l4 4-4 4"/>
    </svg>
  ),
  TrendUp: ({c='currentColor', s=28}) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19l14-10"/>
      <path d="M13 9h6v6"/>
    </svg>
  ),
  TrendDown: ({c='currentColor', s=28}) => (
    <svg width={s} height={s} viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l14 10"/>
      <path d="M13 19h6v-6"/>
    </svg>
  ),
  Menu: ({c='currentColor', s=22}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16"/>
    </svg>
  ),
  Dot: ({c='currentColor', s=8}) => (
    <svg width={s} height={s} viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={c}/></svg>
  ),
  Pulse: ({c='currentColor', s=18}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-5 4 10 2-5h6"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Shared header — replaces stock app bar
// ─────────────────────────────────────────────────────────────
// Gently brand glyph — cyan dot + two arcs ("•))")
function GentlyMark({ size=22, dark=false, mono=false }) {
  const dot = mono ? (dark?'#F4F6F8':G.inkH) : G.cyan;
  const arc = mono ? (dark?'#F4F6F8':G.inkH) : (dark? '#5DCBED' : G.inkH);
  const arcOpacity = mono ? 0.6 : (dark? 0.85 : 0.85);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Gently">
      <circle cx="13" cy="20" r="5.4" fill={dot}/>
      <path d="M22 13.5 C26 16, 26 24, 22 26.5" stroke={arc} strokeOpacity={arcOpacity} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
      <path d="M28 10 C34 14, 34 26, 28 30" stroke={arc} strokeOpacity={arcOpacity*0.7} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function GentlyWordmark({ dark=false, color }) {
  const c = color || (dark? '#F4F6F8' : G.inkH);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <GentlyMark size={27} dark={dark}/>
      <span style={{
        fontFamily:'"SF Pro Rounded", "SF Pro Display", -apple-system, system-ui, sans-serif',
        fontSize:24, fontWeight:500, color:c, letterSpacing:'-0.01em',
      }}>gently</span>
    </div>
  );
}

function GentlyHeader({ dark = false, subtle }) {
  const ink = dark ? '#F4F6F8' : G.inkH;
  const ink2 = dark ? '#A9B3BF' : G.ink3;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 22px 6px' }}>
      <GentlyWordmark dark={dark}/>
      <div style={{ width:34, height:34, display:'grid', placeItems:'center', borderRadius:17, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(12,20,28,0.04)' }}>
        <Icon.Menu c={ink} />
      </div>
    </div>
  );
}

// Small status pill used in B / C
function StatusPill({ icon, label, value, ok=true, dark=false }) {
  const ink = dark ? '#F4F6F8' : G.inkH;
  const ink2 = dark ? '#A9B3BF' : G.ink3;
  const bg = dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
  const dot = ok ? G.sage : G.amber;
  return (
    <div style={{
      flex:1, background:bg, borderRadius:18,
      padding:'12px 12px 12px 14px',
      boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : '0 1px 0 rgba(12,20,28,0.03), 0 1px 2px rgba(12,20,28,0.04)',
      display:'flex', alignItems:'center', gap:10,
    }}>
      <div style={{ color: dark ? '#D8D2C7' : G.ink2 }}>{icon}</div>
      <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15, minWidth:0 }}>
        <div style={{ fontSize:10.5, color:ink2, letterSpacing:'0.07em', textTransform:'uppercase', fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:13.5, color:ink, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{value}</div>
      </div>
      <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:4, background:dot, boxShadow:`0 0 0 4px ${dot}22` }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// A · Calm Hero
// Range-tinted ambient bg, massive glucose value, status row,
// three alarm summary cards
// ─────────────────────────────────────────────────────────────
function VariantA({ value=124, trend='flat', minsAgo=2 }) {
  // Tint by range
  const inRange = value >= 80 && value <= 180;
  const low     = value < 80;
  const tintTop = inRange ? G.cyanBg : low ? G.coralBg : G.amberBg;
  const tintBot = G.bg;
  const accent  = inRange ? G.sage : low ? G.coral : G.amber;

  const Trend = trend==='up'? Icon.TrendUp : trend==='down'? Icon.TrendDown : Icon.TrendFlat;

  return (
    <div style={{ background: `linear-gradient(180deg, ${tintTop} 0%, ${tintBot} 60%)`, minHeight:'100%', paddingBottom:24 }}>
      <GentlyHeader />
      {/* Hero */}
      <div style={{ padding:'18px 24px 28px', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, color:G.ink2, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>Current glucose</div>
          <div style={{ fontSize:12, color:G.ink3, fontWeight:500 }} className="tnum">{minsAgo} min ago</div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:14, marginTop:4 }}>
          <div className="tnum" style={{
            fontSize:140, lineHeight:0.92, fontWeight:300, color:G.inkH, letterSpacing:'-0.05em',
            fontFamily:'"SF Pro Display", -apple-system, sans-serif',
          }}>{value}</div>
          <div style={{ paddingBottom:18, display:'flex', flexDirection:'column', alignItems:'flex-start', gap:6 }}>
            <Trend c={accent} s={32}/>
            <div style={{ fontSize:12, color:G.ink2, fontWeight:600, letterSpacing:'0.04em' }}>mg/dL</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
          <span style={{ width:6, height:6, borderRadius:3, background:accent }}/>
          <span style={{ fontSize:14, color:G.ink, fontWeight:600 }}>
            {inRange? 'In range' : low? 'Below range' : 'Above range'}
          </span>
          <span style={{ fontSize:14, color:G.ink3 }}>· steady</span>
        </div>

        {/* Range bar */}
        <RangeBar value={value} />
      </div>

      {/* Status row */}
      <div style={{ padding:'0 22px', display:'flex', gap:10 }}>
        <StatusPill icon={<Icon.Watch s={20}/>} label="Bracelet" value="Connected · 84%" ok={true} />
        <StatusPill icon={<Icon.Cloud s={20}/>} label="Dexcom" value="Syncing" ok={true} />
      </div>

      {/* Alarms section */}
      <div style={{ padding:'22px 22px 8px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div style={{ fontSize:13, color:G.ink2, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>Alarms armed</div>
        <div style={{ fontSize:13, color:G.slate, fontWeight:600 }}>Edit</div>
      </div>
      <div style={{ padding:'0 22px', display:'flex', flexDirection:'column', gap:10 }}>
        <AlarmCardA tier="High"          threshold="≥ 220"  tint={G.amberBg} accent={G.amber} vibe={3} audio={2} light="Amber"/>
        <AlarmCardA tier="Low"           threshold="≤ 75"   tint={G.coralBg} accent={G.coral} vibe={4} audio={3} light="Red"/>
        <AlarmCardA tier="Critical low"  threshold="≤ 55"   tint={G.coralBg} accent={G.coral} vibe={4} audio={4} light="Red" critical/>
      </div>
    </div>
  );
}

function RangeBar({ value }) {
  // 40..260 scale, mark thresholds at 75, 180
  const min=40, max=260, w = ((value-min)/(max-min))*100;
  const low = 75, high = 180;
  const lowPct  = ((low-min)/(max-min))*100;
  const highPct = ((high-min)/(max-min))*100;
  return (
    <div style={{ marginTop:18 }}>
      <div style={{ position:'relative', height:8, borderRadius:4, background:'rgba(12,20,28,0.06)', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:`${lowPct}%`, width:`${highPct-lowPct}%`, top:0, bottom:0, background:G.sage, opacity:0.35 }}/>
        <div style={{ position:'absolute', left:`calc(${w}% - 6px)`, top:-2, width:12, height:12, borderRadius:6, background:G.inkH, boxShadow:`0 0 0 3px ${G.bg}`}}/>
      </div>
      <div className="tnum" style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:G.ink3, fontWeight:600 }}>
        <span>40</span><span style={{color:G.sage}}>75</span><span style={{color:G.sage}}>180</span><span>260</span>
      </div>
    </div>
  );
}

function AlarmCardA({ tier, threshold, tint, accent, vibe, audio, light, critical }) {
  return (
    <div style={{
      background:G.card, borderRadius:20, padding:'14px 16px',
      boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
      display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:42, height:42, borderRadius:21, background:tint, color:accent,
        display:'grid', placeItems:'center', flexShrink:0,
      }}>
        <Icon.Bell c={accent} s={20}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', minWidth:0, flex:1 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:700, color:G.inkH, letterSpacing:'-0.005em' }}>{tier}</span>
          {critical && <span style={{ fontSize:10, color:G.coral, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:4, background:G.coralBg }}>floor 50</span>}
        </div>
        <div className="tnum" style={{ fontSize:13, color:G.ink2, marginTop:2 }}>
          {threshold} mg/dL  ·  <span style={{ color:G.ink3 }}>vib {vibe} · vol {audio} · {light}</span>
        </div>
      </div>
      <Icon.Chev c={G.ink3}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// B · Settings-Sectioned
// Smaller hero, then grouped lists for Devices + Alarms
// (most scannable / editable)
// ─────────────────────────────────────────────────────────────
function VariantB() {
  const value = 142, trend='up', minsAgo=1;
  const inRange = true;
  return (
    <div style={{ background:G.bg, minHeight:'100%', paddingBottom:28 }}>
      <GentlyHeader subtle="Gently"/>

      {/* Compact glucose hero */}
      <div style={{ margin:'10px 18px 0', background:G.card, borderRadius:24, padding:'20px 22px',
        boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div style={{ fontSize:11.5, color:G.ink3, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>Glucose</div>
          <div className="tnum" style={{ fontSize:12, color:G.ink3, fontWeight:500 }}>{minsAgo} min · 8:27 AM</div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginTop:6 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <div className="tnum" style={{ fontSize:88, lineHeight:0.92, fontWeight:300, color:G.inkH, letterSpacing:'-0.04em' }}>{value}</div>
            <div style={{ paddingBottom:14, fontSize:13, color:G.ink2, fontWeight:600 }}>mg/dL</div>
          </div>
          <div style={{ paddingBottom:10, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <Icon.TrendUp c={G.sage} s={26}/>
            <span style={{ fontSize:12, color:G.sage, fontWeight:700, letterSpacing:'0.04em' }}>IN RANGE</span>
          </div>
        </div>
        {/* mini range bar */}
        <div style={{ marginTop:14, height:6, borderRadius:3, background:'rgba(12,20,28,0.06)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:`${(75-40)/220*100}%`, width:`${(180-75)/220*100}%`, top:0, bottom:0, background:G.sage, opacity:0.35 }}/>
          <div style={{ position:'absolute', left:`calc(${(value-40)/220*100}% - 4px)`, top:-2, width:10, height:10, borderRadius:5, background:G.inkH, boxShadow:'0 0 0 2.5px #fff' }}/>
        </div>
      </div>

      {/* DEVICES group */}
      <GroupLabel>Devices</GroupLabel>
      <Group>
        <RowB icon={<Icon.Watch s={20} c={G.slate}/>} title="Gently bracelet" sub="Test Gently · SN…T-001" right={
          <RightStack ok>Connected<small>84%</small></RightStack>
        }/>
        <RowB icon={<Icon.Cloud s={20} c={G.slate}/>} title="Dexcom Share" sub="dave@…  ·  US · mg/dL" right={
          <RightStack ok>Syncing<small>1m</small></RightStack>
        } last/>
      </Group>

      {/* ALARMS group */}
      <GroupHeader title="Alarms" action="Test all"/>
      <Group>
        <RowAlarm tier="High"         threshold="220" sub="vib 3 · vol 2 · amber" tint={G.amberBg} accent={G.amber} />
        <RowAlarm tier="Low"          threshold="75"  sub="vib 4 · vol 3 · red"   tint={G.coralBg} accent={G.coral} />
        <RowAlarm tier="Critical low" threshold="55"  sub="vib 4 · vol 4 · red · floor 50" tint={G.coralBg} accent={G.coral} critical last/>
      </Group>

      <div style={{ padding:'18px 26px 0', fontSize:11.5, color:G.ink3, lineHeight:1.5 }}>
        Gently is a <span style={{ color:G.ink2, fontWeight:600 }}>secondary alert accessory</span>. Keep Dexcom's own alerts on.
      </div>
    </div>
  );
}

function GroupLabel({ children }) {
  return <div style={{ padding:'22px 28px 8px', fontSize:11.5, color:G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:600 }}>{children}</div>;
}
function GroupHeader({ title, action }) {
  return (
    <div style={{ padding:'22px 28px 8px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
      <span style={{ fontSize:11.5, color:G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:600 }}>{title}</span>
      <span style={{ fontSize:13, color:G.slate, fontWeight:600 }}>{action}</span>
    </div>
  );
}
function Group({ children }) {
  return (
    <div style={{ margin:'0 18px', background:G.card, borderRadius:18,
      boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)', overflow:'hidden' }}>
      {children}
    </div>
  );
}
function RowB({ icon, title, sub, right, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: last? 'none' : `1px solid ${G.rule}` }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'#F2EEE7', display:'grid', placeItems:'center' }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:600, color:G.inkH }}>{title}</div>
        <div style={{ fontSize:12.5, color:G.ink3, marginTop:2 }}>{sub}</div>
      </div>
      {right}
      <Icon.Chev c={G.ink3}/>
    </div>
  );
}
function RightStack({ children, ok }) {
  // Expects [text, <small>...</small>]
  const arr = React.Children.toArray(children);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color: ok? G.sage : G.ink2, fontWeight:600 }}>
        <span style={{ width:6, height:6, borderRadius:3, background: ok? G.sage : G.amber }}/>
        {arr[0]}
      </div>
      {arr[1] && <div className="tnum" style={{ fontSize:11.5, color:G.ink3 }}>{arr[1].props.children}</div>}
    </div>
  );
}
function RowAlarm({ tier, threshold, sub, tint, accent, critical, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: last? 'none' : `1px solid ${G.rule}` }}>
      <div style={{ width:36, height:36, borderRadius:18, background:tint, display:'grid', placeItems:'center' }}>
        <Icon.Bell c={accent} s={18}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:600, color:G.inkH }}>{tier}</span>
          {critical && <span style={{ fontSize:10, color:G.coral, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>·  floor 50</span>}
        </div>
        <div className="tnum" style={{ fontSize:12.5, color:G.ink3, marginTop:2 }}>{sub}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
        <div className="tnum" style={{ fontSize:18, fontWeight:600, color:G.inkH, letterSpacing:'-0.01em' }}>{threshold}</div>
        <div style={{ fontSize:10.5, color:G.ink3, letterSpacing:'0.05em' }}>mg/dL</div>
      </div>
      <Icon.Chev c={G.ink3}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// C · Ring Hero  (light + dark night variant)
// Glucose inside arc showing position in range; alarm tiles 3-col
// ─────────────────────────────────────────────────────────────
function VariantC({ dark=false, value=96, trend='down', minsAgo=3 }) {
  const ink   = dark ? '#F4F6F8' : G.inkH;
  const ink2  = dark ? '#A9B3BF' : G.ink2;
  const ink3  = dark ? '#8A95A4' : G.ink3;
  const bg    = dark ? '#0E141B' : G.bg;
  const card  = dark ? 'rgba(255,255,255,0.04)' : G.card;
  const tile  = dark ? 'rgba(255,255,255,0.04)' : G.card;
  const inRange = value >= 80 && value <= 180;
  const accent = inRange ? G.sage : value < 80 ? G.coral : G.amber;

  return (
    <div style={{ background:bg, minHeight:'100%', paddingBottom:26, color:ink }}>
      <GentlyHeader dark={dark} subtle={dark?'Gently · Night':'Gently'} />

      {/* Ring hero */}
      <div style={{ display:'grid', placeItems:'center', padding:'10px 0 6px' }}>
        <Ring value={value} dark={dark} accent={accent} trend={trend} minsAgo={minsAgo} />
      </div>

      {/* Status pills */}
      <div style={{ padding:'12px 18px 4px', display:'flex', gap:10 }}>
        <StatusPill dark={dark} icon={<Icon.Watch s={20} c={dark?'#D8D2C7':G.ink2}/>} label="Bracelet" value="Connected" ok/>
        <StatusPill dark={dark} icon={<Icon.Cloud s={20} c={dark?'#D8D2C7':G.ink2}/>} label="Dexcom" value="Syncing" ok/>
      </div>

      {/* Alarm tiles */}
      <div style={{ padding:'18px 18px 0', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div style={{ fontSize:11.5, color:ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:600 }}>Alarms</div>
        <div style={{ fontSize:13, color:G.slate, fontWeight:600 }}>Tune</div>
      </div>
      <div style={{ padding:'10px 18px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <AlarmTile dark={dark} label="High"          value="220" accent={G.amber}/>
        <AlarmTile dark={dark} label="Low"           value="75"  accent={G.coral}/>
        <AlarmTile dark={dark} label="Crit. low"     value="55"  accent={G.coral} floor/>
      </div>

      {/* Test alarm */}
      <div style={{ padding:'18px 18px 0' }}>
        <button style={{
          width:'100%', appearance:'none', border:'none', cursor:'pointer',
          background: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          color: ink, fontSize:14, fontWeight:600, padding:'14px 16px', borderRadius:16,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : '0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
        }}>
          <Icon.Pulse c={ink} s={18}/> Test bracelet
        </button>
      </div>
    </div>
  );
}

function Ring({ value, dark, accent, trend, minsAgo }) {
  const r = 110, sw = 14, cx = 130, cy = 130;
  const c = 2*Math.PI*r;
  // map value 40..260 into 0..1 over an arc (270° sweep)
  const v = Math.max(40, Math.min(260, value));
  const t = (v-40)/220;
  const sweep = 0.72; // 72% of circle
  const lowT  = (75-40)/220 * sweep;
  const highT = (180-40)/220 * sweep;
  const trackColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(12,20,28,0.06)';
  const rangeColor = dark ? 'rgba(22,188,233,0.55)' : 'rgba(22,188,233,0.35)';

  // dasharray hack: we draw track over 0..sweep, range over [lowT..highT], dot at t*sweep
  const arcLen = c * sweep;
  // rotate so the arc opens at bottom
  const transform = `rotate(${135} ${cx} ${cy})`;
  const Trend = trend==='up'? Icon.TrendUp : trend==='down'? Icon.TrendDown : Icon.TrendFlat;

  return (
    <div style={{ position:'relative', width:260, height:240 }}>
      <svg width="260" height="240" viewBox="0 0 260 260">
        <g transform={transform} fill="none" strokeLinecap="round">
          {/* track */}
          <circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={sw}
            strokeDasharray={`${arcLen} ${c}`} />
          {/* in-range region */}
          <circle cx={cx} cy={cy} r={r} stroke={rangeColor} strokeWidth={sw}
            strokeDasharray={`${c*(highT-lowT)} ${c}`} strokeDashoffset={-(c*lowT)} />
          {/* progress to current value */}
          <circle cx={cx} cy={cy} r={r} stroke={accent} strokeWidth={sw}
            strokeDasharray={`${c*t*sweep} ${c}`} />
        </g>
        {/* value pointer dot */}
        {(() => {
          const angle = (135 + t*sweep*360) * Math.PI/180;
          const px = cx + Math.cos(angle)*r;
          const py = cy + Math.sin(angle)*r;
          return <circle cx={px} cy={py} r={9} fill={dark?'#0E141B':'#F7F5F2'} stroke={accent} strokeWidth={3}/>;
        })()}
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', pointerEvents:'none',
      }}>
        <div style={{ fontSize:11.5, color: dark?'#A9B3BF':G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:600, marginBottom:-4 }}>Glucose</div>
        <div className="tnum" style={{ fontSize:96, lineHeight:1, fontWeight:300, color: dark?'#F4F6F8':G.inkH, letterSpacing:'-0.04em' }}>{value}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:-2 }}>
          <Trend c={accent} s={20}/>
          <span style={{ fontSize:12.5, color: dark?'#A9B3BF':G.ink2, fontWeight:600 }}>mg/dL · {minsAgo}m ago</span>
        </div>
      </div>
      {/* range labels */}
      <div className="tnum" style={{ position:'absolute', left:24, bottom:30, fontSize:11, fontWeight:600, color:dark?'#8A95A4':G.ink3 }}>40</div>
      <div className="tnum" style={{ position:'absolute', right:24, bottom:30, fontSize:11, fontWeight:600, color:dark?'#8A95A4':G.ink3 }}>260</div>
      <div className="tnum" style={{ position:'absolute', left:'50%', top:6, transform:'translateX(-50%)', fontSize:11, fontWeight:600, color:G.sage }}>80 – 180</div>
    </div>
  );
}

function AlarmTile({ dark, label, value, accent, floor }) {
  const ink   = dark ? '#F4F6F8' : G.inkH;
  const ink3  = dark ? '#8A95A4' : G.ink3;
  const card  = dark ? 'rgba(255,255,255,0.04)' : G.card;
  return (
    <div style={{
      background:card, borderRadius:18, padding:'14px 12px 12px',
      boxShadow: dark ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : '0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
      display:'flex', flexDirection:'column', gap:6, position:'relative', overflow:'hidden',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:4, background:accent }}/>
        <span style={{ fontSize:11, color:ink3, letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontSize:30, fontWeight:400, color:ink, letterSpacing:'-0.03em', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10.5, color:ink3, fontWeight:600, letterSpacing:'0.04em' }}>mg/dL · ARMED</div>
      {floor && <div style={{ position:'absolute', right:10, top:10, fontSize:9, color:accent, fontWeight:700, letterSpacing:'0.05em', padding:'2px 6px', borderRadius:4, background:dark?'rgba(177,74,71,0.15)':G.coralBg }}>FLOOR 50</div>}
    </div>
  );
}

Object.assign(window, { VariantA, VariantB, VariantC, G });
