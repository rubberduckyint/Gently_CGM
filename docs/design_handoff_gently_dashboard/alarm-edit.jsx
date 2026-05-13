// Edit Alarm screen — opened from the dashboard alarm cards
// Props: tier ("High" | "Low" | "Critical low"), threshold, accent, tint, isFloor

const LED_COLORS = [
  { id: 'red',     hex: '#E25C5C', label: 'Red' },
  { id: 'amber',   hex: '#E8A53A', label: 'Amber' },
  { id: 'yellow',  hex: '#EAD24A', label: 'Yellow' },
  { id: 'green',   hex: '#4FB36D', label: 'Green' },
  { id: 'cyan',    hex: '#2BB5E0', label: 'Cyan' },
  { id: 'magenta', hex: '#C45EC0', label: 'Magenta' },
];

const VIBE_LABELS  = ['Off', 'Soft', 'Medium', 'Strong', 'Max'];
const AUDIO_LABELS = ['Silent', 'Quiet', 'Mid', 'Loud', 'Loudest'];

function AlarmEdit({
  tier = 'High',
  threshold = 220,
  unit = 'mg/dL',
  accent = '#C07A1C',
  tint = '#FAEBD3',
  isFloor = false,
  defaultColor = 'amber',
  defaultVibe = 3,
  defaultAudio = 2,
}) {
  const [enabled, setEnabled] = React.useState(true);
  const [thr, setThr]         = React.useState(threshold);
  const [vibe, setVibe]       = React.useState(defaultVibe);
  const [audio, setAudio]     = React.useState(defaultAudio);
  const [color, setColor]     = React.useState(defaultColor);
  const [lightOn, setLightOn] = React.useState(true);

  return (
    <div style={{ background:G.bg, minHeight:'100%', color:G.ink, paddingBottom:32 }}>
      {/* Top app row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px 4px' }}>
        <button style={btnIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G.inkH} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6"/>
          </svg>
        </button>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1.1 }}>
          <div style={{ fontSize:10.5, color:G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:700 }}>Alarm</div>
          <div style={{ fontSize:17, fontWeight:600, color:G.inkH, letterSpacing:'-0.01em' }}>{tier}</div>
        </div>
        <button style={{ ...btnText, color: G.cyanDeep }}>Save</button>
      </div>

      {/* Threshold hero */}
      <div style={{
        margin:'14px 18px 0', background:G.card, borderRadius:24, padding:'18px 20px 20px',
        boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:18, background:tint, color:accent, display:'grid', placeItems:'center' }}>
              <Icon.Bell c={accent} s={20}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15 }}>
              <span style={{ fontSize:11, color:G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:700 }}>
                Alert when {tier==='High' ? 'above' : 'below'}
              </span>
              <span style={{ fontSize:13, color:G.ink2 }}>{tier} threshold</span>
            </div>
          </div>
          <Toggle on={enabled} onChange={setEnabled}/>
        </div>

        {/* Big number stepper */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, marginTop:14 }}>
          <Stepper onClick={() => setThr(t => Math.max(isFloor?50:40, t-1))} disabled={isFloor && thr<=50}>−</Stepper>
          <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
            <div className="tnum" style={{ fontSize:72, fontWeight:300, color:G.inkH, letterSpacing:'-0.04em', lineHeight:1 }}>{thr}</div>
            <div style={{ fontSize:14, color:G.ink2, fontWeight:600 }}>{unit}</div>
          </div>
          <Stepper onClick={() => setThr(t => Math.min(400, t+1))}>+</Stepper>
        </div>

        {isFloor && (
          <div style={{
            marginTop:14, padding:'10px 12px', background:G.cyanBgSoft, borderRadius:12,
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.cyanDeep} strokeWidth="1.8" style={{flexShrink:0, marginTop:2}}>
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize:12, color:G.ink2, lineHeight:1.45 }}>
              The bracelet hardware enforces a <span style={{ color:G.inkH, fontWeight:600 }}>50 mg/dL floor</span> on critical-low. You can't set this any lower — it's a safety stop.
            </div>
          </div>
        )}
      </div>

      <SectionLabel>Vibration</SectionLabel>
      <Card>
        <LevelSlider value={vibe} onChange={setVibe} labels={VIBE_LABELS} accent={G.cyanDeep}/>
      </Card>

      <SectionLabel>Volume</SectionLabel>
      <Card>
        <LevelSlider value={audio} onChange={setAudio} labels={AUDIO_LABELS} accent={G.cyanDeep}/>
      </Card>

      <div style={{ padding:'22px 28px 8px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <span style={sectionLabelStyle}>Light color</span>
        <button onClick={() => setLightOn(o => !o)} style={{
          appearance:'none', border:'none', cursor:'pointer', background:'transparent',
          fontSize:13, color:G.cyanDeep, fontWeight:600,
        }}>{lightOn ? 'Turn off' : 'Turn on'}</button>
      </div>
      <Card padding="16px 18px">
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10,
          opacity: lightOn ? 1 : 0.4,
          transition:'opacity .15s',
        }}>
          {LED_COLORS.map(c => (
            <ColorSwatch key={c.id} {...c}
              selected={lightOn && color===c.id}
              onSelect={() => { setColor(c.id); setLightOn(true); }}
            />
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'center', marginTop:10 }}>
          <span style={{ fontSize:12, color:G.ink3 }}>
            Selected: <span style={{ color:G.inkH, fontWeight:600 }}>
              {lightOn ? LED_COLORS.find(c=>c.id===color).label : 'Off'}
            </span>
          </span>
        </div>
      </Card>

      {/* Test bracelet */}
      <div style={{ padding:'22px 18px 0' }}>
        <button style={{
          width:'100%', appearance:'none', cursor:'pointer',
          background:G.cyan, color:'#fff', border:'none',
          fontSize:15, fontWeight:600, padding:'15px 18px', borderRadius:16,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          boxShadow:'0 1px 0 rgba(14,143,182,0.4), 0 8px 20px rgba(22,188,233,0.25)',
        }}>
          <Icon.Pulse c="#fff" s={18}/> Test this alarm
        </button>
        <div style={{ fontSize:11.5, color:G.ink3, textAlign:'center', marginTop:8, lineHeight:1.45 }}>
          Sends the pattern above to your bracelet right now.
        </div>
      </div>

      {/* Advanced rules */}
      <SectionLabel>Timing</SectionLabel>
      <Card padded={false}>
        <MiniRow label="Duration"         value="30 sec" />
        <MiniRow label="Repeat after"     value="5 min" />
        <MiniRow label="Escalate after"   value="10 min" last/>
      </Card>

      <div style={{ padding:'24px 28px 0', fontSize:11.5, color:G.ink3, lineHeight:1.5 }}>
        Secondary alert only. Keep your Dexcom alerts on — Gently is here to make sure you notice.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-pieces
// ─────────────────────────────────────────────────────────────

const sectionLabelStyle = {
  fontSize:11.5, color:G.ink3, letterSpacing:'0.09em',
  textTransform:'uppercase', fontWeight:700,
};

function SectionLabel({ children }) {
  return <div style={{ padding:'22px 28px 8px', ...sectionLabelStyle }}>{children}</div>;
}

function Card({ children, padding='14px 16px', padded=true }) {
  return (
    <div style={{
      margin:'0 18px', background:G.card, borderRadius:18,
      boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
      padding: padded? padding : 0, overflow:'hidden',
    }}>
      {children}
    </div>
  );
}

function MiniRow({ label, value, last }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 16px',
      borderBottom: last? 'none' : `1px solid ${G.rule}`,
    }}>
      <span style={{ fontSize:15, color:G.inkH }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span className="tnum" style={{ fontSize:14, color:G.ink2, fontWeight:600 }}>{value}</span>
        <Icon.Chev c={G.ink3}/>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      appearance:'none', border:'none', cursor:'pointer',
      width:52, height:32, borderRadius:16,
      background: on ? G.cyanDeep : '#D2D8E0',
      position:'relative', transition:'background .15s', padding:0,
    }}>
      <span style={{
        position:'absolute', top:3, left: on? 23 : 3,
        width:26, height:26, borderRadius:13, background:'#fff',
        boxShadow:'0 2px 4px rgba(0,0,0,0.18)', transition:'left .18s',
      }}/>
    </button>
  );
}

const btnIcon = {
  width:38, height:38, display:'grid', placeItems:'center',
  borderRadius:19, background:'rgba(12,20,28,0.04)',
  border:'none', cursor:'pointer', padding:0,
};
const btnText = {
  appearance:'none', border:'none', background:'transparent', cursor:'pointer',
  fontSize:15, fontWeight:600, padding:'8px 4px',
};

function Stepper({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:44, height:44, borderRadius:22, border:'none', cursor: disabled? 'not-allowed' : 'pointer',
      background: disabled? '#F0F2F5' : '#EEF1F5',
      fontSize:22, fontWeight:300, color: disabled? G.ink3 : G.inkH, padding:0,
      display:'grid', placeItems:'center', lineHeight:1,
    }}>{children}</button>
  );
}

// 0-4 level slider with labeled ticks
function LevelSlider({ value, onChange, labels, accent }) {
  const trackRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);

  const pickFromX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(t * 4));
  };

  const pct = (value/4) * 100;

  return (
    <div style={{ padding:'8px 6px 4px', userSelect:'none' }}>
      {/* Value readout */}
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', padding:'0 6px 14px' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span className="tnum" style={{ fontSize:30, fontWeight:300, color:G.inkH, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</span>
          <span style={{ fontSize:13, color:G.ink2, fontWeight:600 }}>· {labels[value]}</span>
        </div>
        <span className="tnum" style={{ fontSize:12, color:G.ink3, fontWeight:600 }}>0 – 4</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={(e) => { setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); pickFromX(e.clientX); }}
        onPointerMove={(e) => { if (drag) pickFromX(e.clientX); }}
        onPointerUp={() => setDrag(false)}
        style={{ position:'relative', height:36, padding:'14px 6px 0', cursor:'pointer', touchAction:'none' }}
      >
        <div style={{ position:'relative', height:8, borderRadius:4, background:'rgba(12,20,28,0.07)' }}>
          {/* fill */}
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`,
            background: accent, borderRadius:4, transition: drag? 'none' : 'width .14s',
          }}/>
          {/* ticks */}
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              position:'absolute', left:`calc(${(i/4)*100}% - 2px)`, top:-3,
              width:4, height:14, borderRadius:2,
              background: i<=value ? '#fff' : 'rgba(12,20,28,0.18)',
              opacity: i===0 || i===4 ? 0 : 1, // hide ends behind knob
            }}/>
          ))}
          {/* knob */}
          <div style={{
            position:'absolute', left:`calc(${pct}% - 13px)`, top:-9,
            width:26, height:26, borderRadius:13, background:'#fff',
            boxShadow:'0 2px 6px rgba(12,20,28,0.18), 0 0 0 1px rgba(12,20,28,0.06)',
            transition: drag? 'none' : 'left .14s',
            display:'grid', placeItems:'center',
          }}>
            <div style={{ width:8, height:8, borderRadius:4, background:accent }}/>
          </div>
        </div>
      </div>

      {/* Tick labels */}
      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 6px 0' }}>
        {labels.map((l, i) => (
          <button key={l} onClick={() => onChange(i)} style={{
            appearance:'none', border:'none', background:'transparent',
            cursor:'pointer', padding:'4px 0', minWidth:36,
            fontSize:11, fontWeight: i===value? 700 : 500,
            color: i===value? accent : G.ink3,
            letterSpacing: i===value? '0.02em' : 0,
            transition:'color .15s',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({ hex, label, selected, onSelect }) {
  return (
    <button onClick={onSelect} aria-label={label} style={{
      appearance:'none', border:'none', cursor:'pointer', padding:0,
      background:'transparent', display:'flex', flexDirection:'column',
      alignItems:'center', gap:6,
    }}>
      <div style={{
        width:42, height:42, borderRadius:21,
        background: hex,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 0 0 4px ${hex}, 0 6px 14px ${hex}55`
          : 'inset 0 0 0 1px rgba(12,20,28,0.06), 0 1px 2px rgba(12,20,28,0.06)',
        transition:'box-shadow .12s, transform .12s',
        transform: selected? 'scale(1.02)' : 'scale(1)',
        display:'grid', placeItems:'center',
      }}>
        {selected && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7"/>
          </svg>
        )}
      </div>
      <span style={{
        fontSize:10.5, fontWeight: selected? 700 : 500,
        color: selected? G.inkH : G.ink3,
        letterSpacing:'0.02em',
      }}>{label}</span>
    </button>
  );
}

Object.assign(window, { AlarmEdit });
