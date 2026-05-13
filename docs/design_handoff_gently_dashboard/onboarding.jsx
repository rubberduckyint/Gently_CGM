// Onboarding flow — Pair bracelet, Dexcom hero, Dexcom credentials form.
// Reuses G palette, Icon set, GentlyMark/GentlyWordmark from variants.jsx.

// ─────────────────────────────────────────────────────────────
// Shared: step indicator + onboarding header
// ─────────────────────────────────────────────────────────────
function OnbHeader({ step, back=true }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px 4px' }}>
      <button style={{
        width:38, height:38, borderRadius:19, display:'grid', placeItems:'center',
        background: back ? 'rgba(12,20,28,0.04)' : 'transparent',
        border:'none', cursor:'pointer', visibility: back? 'visible' : 'hidden', padding:0,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G.inkH} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
      </button>
      <GentlyWordmark/>
      <div style={{ width:38, height:38 }}/>
    </div>
  );
}
function StepDots({ step, total=2 }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'8px 0 6px' }}>
      {Array.from({length:total}).map((_,i)=>(
        <span key={i} style={{
          width: i===step ? 22 : 6, height:6, borderRadius:3,
          background: i<=step ? G.cyanDeep : 'rgba(12,20,28,0.12)',
          transition:'width .2s',
        }}/>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bracelet illustration — stylized, with optional ripple/pulse
// ─────────────────────────────────────────────────────────────
function Bracelet({ state='instruct' }) {
  // states: instruct (slow blink) | scanning (rings) | discovered (steady cyan) | success (check)
  const pulseColor = state==='success' ? G.cyanDeep : G.cyan;
  const pulseAnim  = state==='instruct' ? 'gPulse 1.4s ease-in-out infinite'
                    : state==='scanning' ? 'gPulse 0.9s ease-in-out infinite'
                    : 'none';
  return (
    <div style={{
      position:'relative', width:'100%', height:210,
      display:'grid', placeItems:'center', overflow:'hidden',
    }}>
      {state==='scanning' && (
        <>
          <span style={ripple(0)}/>
          <span style={ripple(0.6)}/>
          <span style={ripple(1.2)}/>
        </>
      )}

      <svg width="300" height="180" viewBox="0 0 300 180" fill="none" style={{ filter:'drop-shadow(0 12px 18px rgba(12,20,28,0.18))' }}>
        <defs>
          {/* Charcoal body — soft top-light gradient */}
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#5A636E"/>
            <stop offset="55%" stopColor="#3A424C"/>
            <stop offset="100%" stopColor="#222A33"/>
          </linearGradient>
          {/* Brushed aluminum half-plate */}
          <linearGradient id="plateGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#E2E4E7"/>
            <stop offset="55%" stopColor="#BCC0C5"/>
            <stop offset="100%" stopColor="#9CA2A9"/>
          </linearGradient>
          {/* Strap leather/silicone */}
          <linearGradient id="strapGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A2F36"/>
            <stop offset="100%" stopColor="#13171C"/>
          </linearGradient>
          {/* Plate clip — half-circle on the right side of the body */}
          <clipPath id="plateClip">
            <path d="M150 38 L228 38 A50 50 0 0 1 228 142 L150 142 Z"/>
          </clipPath>
          <clipPath id="bodyClip">
            <rect x="60" y="38" width="180" height="104" rx="52"/>
          </clipPath>
        </defs>

        {/* Left strap */}
        <rect x="0"   y="74" width="68" height="36" rx="6" fill="url(#strapGrad)"/>
        <rect x="0"   y="74" width="68" height="2"   fill="rgba(255,255,255,0.06)"/>
        {/* Right strap */}
        <rect x="232" y="74" width="68" height="36" rx="6" fill="url(#strapGrad)"/>
        <rect x="232" y="74" width="68" height="2"   fill="rgba(255,255,255,0.06)"/>

        {/* Body — wide pill */}
        <rect x="60" y="38" width="180" height="104" rx="52" fill="url(#bodyGrad)"/>
        {/* Specular top highlight */}
        <rect x="60" y="38" width="180" height="104" rx="52" fill="url(#bodyClip)" opacity="0"/>
        <path d="M84 50 Q150 38 216 50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none"/>
        {/* Soft inner shadow on left edge */}
        <ellipse cx="78" cy="90" rx="22" ry="42" fill="rgba(0,0,0,0.18)"/>

        {/* Pogo pins (gold/brass) — two small dots, top center-ish */}
        <circle cx="145" cy="58" r="3.4" fill="#C9A461"/>
        <circle cx="145" cy="58" r="1.4" fill="#F2D58C"/>
        <circle cx="160" cy="58" r="3.4" fill="#C9A461"/>
        <circle cx="160" cy="58" r="1.4" fill="#F2D58C"/>

        {/* Brushed aluminum half-plate (right side, inset) */}
        <g clipPath="url(#plateClip)">
          <rect x="150" y="38" width="90" height="104" fill="url(#plateGrad)"/>
          {/* brushed lines */}
          {Array.from({length:24}).map((_,i)=>(
            <line key={i} x1={150} y1={42+i*4} x2={232} y2={42+i*4} stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
          ))}
          {Array.from({length:24}).map((_,i)=>(
            <line key={'d'+i} x1={150} y1={44+i*4} x2={232} y2={44+i*4} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5"/>
          ))}
          {/* Plate seam shadow on its left edge */}
          <rect x="150" y="38" width="2" height="104" fill="rgba(0,0,0,0.25)"/>
        </g>

        {/* Etched gently glyph on the plate (mono, low-contrast) */}
        <g transform="translate(192, 108)" opacity="0.55">
          <circle cx="0" cy="0" r="4.5" fill="#4B5159"/>
          <path d="M8 -6 C13 -3, 13 3, 8 6"   stroke="#4B5159" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          <path d="M14 -10 C21 -5, 21 5, 14 10" stroke="#4B5159" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7"/>
        </g>

        {/* LED indicator slot (bottom of body) */}
        <rect x="138" y="135" width="36" height="6" rx="3" fill="#0E141B"/>
        {/* LED glow */}
        <rect x="140" y="136.5" width="32" height="3" rx="1.5"
          fill={pulseColor}
          style={{ animation: pulseAnim, transformOrigin:'156px 138px' }}/>
        {/* LED soft bloom */}
        <ellipse cx="156" cy="138" rx="40" ry="10" fill={pulseColor} opacity={state==='instruct'||state==='scanning'?0.22:state==='success'?0.18:0}
          style={{ animation: state==='instruct' ? 'gBloom 1.4s ease-in-out infinite' : 'none' }}/>

        {/* Success check overlaid on plate */}
        {state==='success' && (
          <g transform="translate(192, 78)">
            <circle cx="0" cy="0" r="18" fill={G.cyanDeep}/>
            <path d="M-7 0 l5 5 l10 -10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </g>
        )}
      </svg>

      <style>{`
        @keyframes gPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes gBloom { 0%,100%{opacity:.22} 50%{opacity:.08} }
        @keyframes gRipple { 0%{transform:scale(.5);opacity:.6} 100%{transform:scale(1.7);opacity:0} }
      `}</style>
    </div>
  );
}
const ripple = (delay) => ({
  position:'absolute', width:230, height:230, borderRadius:'50%',
  border:`2px solid ${G.cyan}`, opacity:0,
  animation:`gRipple 1.8s ease-out ${delay}s infinite`,
});

// ─────────────────────────────────────────────────────────────
// Pair bracelet screen — variants by state
// ─────────────────────────────────────────────────────────────
function PairBracelet({ state='instruct' }) {
  const cfg = {
    instruct:   { head:'Pair your Gently',           sub:'Press and hold the button on your bracelet until the light flashes blue.', cta:'Looking for your bracelet…', ctaPrimary:false, ctaLoading:false },
    scanning:   { head:'Looking for your bracelet…', sub:'Keep the bracelet within arm\u2019s reach of your phone.',                  cta:'Cancel',                       ctaPrimary:false },
    discovered: { head:'Bracelet found',             sub:'Tap below to finish pairing.',                                                cta:null },
    success:    { head:'Connected',                  sub:'Your bracelet is paired and ready.',                                          cta:'Continue', ctaPrimary:true },
  }[state];

  return (
    <div style={{ background:G.bg, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <OnbHeader/>
      <StepDots step={0}/>

      <Bracelet state={state}/>

      <div style={{ padding:'0 28px', textAlign:'center' }}>
        <h1 style={{ fontSize:26, fontWeight:600, color:G.inkH, letterSpacing:'-0.02em', margin:'4px 0 8px' }}>
          {cfg.head}
        </h1>
        <p style={{ fontSize:14.5, color:G.ink2, lineHeight:1.5, margin:0 }}>{cfg.sub}</p>
      </div>

      {/* Tip card — only on instruct */}
      {state==='instruct' && (
        <div style={{ margin:'22px 22px 0', padding:'14px 16px', background:G.cyanBgSoft, borderRadius:16, display:'flex', gap:12 }}>
          <div style={{
            flexShrink:0, width:36, height:36, borderRadius:18, background:'#0E141B',
            display:'grid', placeItems:'center',
          }}>
            <span style={{ width:10, height:10, borderRadius:5, background:G.cyan, boxShadow:`0 0 10px ${G.cyan}` }}/>
          </div>
          <div style={{ fontSize:13, color:G.ink2, lineHeight:1.5 }}>
            <span style={{ color:G.inkH, fontWeight:600 }}>Light flashing blue?</span><br/>
            Pairing mode is on. Keep the bracelet still for a few seconds.
          </div>
        </div>
      )}

      {/* Discovered device card */}
      {state==='discovered' && (
        <div style={{ margin:'18px 22px 0' }}>
          <DeviceCard/>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex:1 }}/>

      {/* Bottom CTA */}
      <div style={{ padding:'0 22px 26px' }}>
        {state==='instruct' && (
          <ScanningButton/>
        )}
        {state==='scanning' && (
          <button style={btnGhost}>Cancel</button>
        )}
        {state==='success' && (
          <button style={btnPrimary}>Continue</button>
        )}
        <p style={{ fontSize:11.5, color:G.ink3, textAlign:'center', marginTop:14, lineHeight:1.5 }}>
          Need help? <span style={{ color:G.cyanDeep, fontWeight:600 }}>Pairing tips</span>
        </p>
      </div>
    </div>
  );
}

function ScanningButton() {
  return (
    <button style={{ ...btnGhost, opacity:0.85, position:'relative' }}>
      <span style={{
        display:'inline-block', width:14, height:14, marginRight:10,
        borderRadius:7, border:`2px solid ${G.cyanDeep}`, borderTopColor:'transparent',
        animation:'spin .9s linear infinite', verticalAlign:'middle',
      }}/>
      Looking for your bracelet…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </button>
  );
}

function DeviceCard() {
  return (
    <button style={{
      width:'100%', appearance:'none', border:'none', cursor:'pointer',
      background:G.card, borderRadius:20, padding:'16px 16px',
      boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 6px 18px rgba(12,20,28,0.06)',
      display:'flex', alignItems:'center', gap:14, textAlign:'left',
    }}>
      <div style={{
        width:46, height:46, borderRadius:23,
        background:'#0E141B', display:'grid', placeItems:'center',
      }}>
        <span style={{ width:10, height:10, borderRadius:5, background:G.cyan, boxShadow:`0 0 10px ${G.cyan}` }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:600, color:G.inkH }}>GENTLY-A8F2C1</span>
          <span style={{ fontSize:11, color:G.ink3, fontWeight:600, letterSpacing:'0.04em' }}>fw 2.1.4</span>
        </div>
        <div className="tnum" style={{ fontSize:12.5, color:G.ink2, marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
          <BatteryGlyph pct={84}/> 84%  ·  Strong signal
        </div>
      </div>
      <div style={{
        padding:'8px 14px', borderRadius:10, background:G.cyan, color:'#fff',
        fontSize:13, fontWeight:600,
      }}>Pair</div>
    </button>
  );
}

function BatteryGlyph({ pct=80 }) {
  return (
    <svg width="20" height="12" viewBox="0 0 24 14" fill="none">
      <rect x="1" y="1" width="20" height="12" rx="2.5" stroke={G.ink3} strokeWidth="1.4"/>
      <rect x="22" y="4" width="2" height="6" rx="1" fill={G.ink3}/>
      <rect x="3" y="3" width={`${(pct/100)*16}`} height="8" rx="1" fill={G.cyanDeep}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Dexcom · Hero CTA  (screen A)
// ─────────────────────────────────────────────────────────────
function DexcomHero() {
  return (
    <div style={{ background:G.bg, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <OnbHeader/>
      <StepDots step={1}/>

      {/* Confirmation chip — bracelet is paired */}
      <div style={{ display:'flex', justifyContent:'center', marginTop:14 }}>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'6px 12px', borderRadius:999,
          background: G.cyanBg, color:G.cyanDeep,
          fontSize:12, fontWeight:600,
        }}>
          <Icon.Check c={G.cyanDeep} s={14}/> Bracelet paired
        </span>
      </div>

      {/* Hero */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 28px', textAlign:'center', marginTop:-30 }}>
        {/* Logo connection diagram */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:24 }}>
          <ConnNode>
            <GentlyMark size={28}/>
          </ConnNode>
          <ConnLine/>
          <ConnNode strong>
            <Icon.Cloud c={G.cyanDeep} s={28}/>
          </ConnNode>
        </div>
        <h1 style={{ fontSize:30, fontWeight:600, color:G.inkH, letterSpacing:'-0.02em', margin:'0 0 12px' }}>
          One more step
        </h1>
        <p style={{ fontSize:15, color:G.ink2, lineHeight:1.5, margin:0, maxWidth:300, marginInline:'auto' }}>
          Connect your Dexcom Share account so Gently can keep watch for you.
        </p>
      </div>

      {/* CTA */}
      <div style={{ padding:'0 22px 24px' }}>
        <button style={btnPrimary}>Connect Dexcom Share</button>
        <p style={{ fontSize:11.5, color:G.ink3, textAlign:'center', marginTop:14, lineHeight:1.55 }}>
          You'll sign in with your Dexcom Share credentials.<br/>
          Gently never sees your readings without your consent.
        </p>
      </div>
    </div>
  );
}

function ConnNode({ children, strong }) {
  return (
    <div style={{
      width:64, height:64, borderRadius:32,
      background: G.card,
      boxShadow: strong
        ? `0 0 0 1px ${G.cyan}66, 0 6px 18px rgba(22,188,233,0.18)`
        : '0 1px 0 rgba(12,20,28,0.04), 0 4px 12px rgba(12,20,28,0.06)',
      display:'grid', placeItems:'center',
    }}>{children}</div>
  );
}
function ConnLine() {
  return (
    <svg width="56" height="6" viewBox="0 0 56 6">
      <line x1="0" y1="3" x2="56" y2="3" stroke={G.cyan} strokeWidth="2" strokeDasharray="4 4"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Dexcom · Credentials form  (screen B)
// ─────────────────────────────────────────────────────────────
function DexcomForm() {
  const [region, setRegion] = React.useState('us');
  const [units, setUnits]   = React.useState('mgdl');
  const [pwShown, setPwShown] = React.useState(false);

  return (
    <div style={{ background:G.bg, minHeight:'100%', paddingBottom:24 }}>
      <OnbHeader/>
      <StepDots step={1}/>

      <div style={{ padding:'10px 24px 18px' }}>
        <h1 style={{ fontSize:22, fontWeight:600, color:G.inkH, letterSpacing:'-0.015em', margin:'8px 0 4px' }}>
          Connect Dexcom Share
        </h1>
        <p style={{ fontSize:13.5, color:G.ink2, lineHeight:1.5, margin:0 }}>
          Sign in with the account you use at <span style={{ color:G.inkH, fontWeight:600 }}>dexcom.com/share</span>.
        </p>
      </div>

      {/* Region */}
      <FieldLabel>Region</FieldLabel>
      <Card padded={false}>
        <SegmentRow value={region} onChange={setRegion} opts={[
          { v:'us',  label:'US' },
          { v:'ous', label:'Outside US' },
          { v:'jp',  label:'Japan' },
        ]}/>
      </Card>

      {/* Username */}
      <FieldLabel>Username</FieldLabel>
      <Card padded={false}>
        <InputRow placeholder="username or email" autoComplete="username"/>
      </Card>
      <Helper>Use your Dexcom Share username (or email).</Helper>

      {/* Password */}
      <FieldLabel>Password</FieldLabel>
      <Card padded={false}>
        <InputRow placeholder="••••••••" type={pwShown? 'text' : 'password'}
          right={
            <button onClick={() => setPwShown(s=>!s)} style={inputAffordance}>
              {pwShown? 'Hide' : 'Show'}
            </button>
          }
        />
      </Card>

      {/* Trust line */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 28px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.cyanDeep} strokeWidth="1.8" style={{flexShrink:0, marginTop:2}}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize:11.5, color:G.ink2, lineHeight:1.5 }}>
          Encrypted with AES-256-GCM. Your password is never returned by our API. <span style={{ color:G.cyanDeep, fontWeight:600 }}>Privacy details</span>
        </span>
      </div>

      {/* Display name */}
      <FieldLabel>Display name <Optional/></FieldLabel>
      <Card padded={false}>
        <InputRow placeholder="Defaults to your username"/>
      </Card>

      {/* Units */}
      <FieldLabel>Glucose units</FieldLabel>
      <Card padded={false}>
        <SegmentRow value={units} onChange={setUnits} opts={[
          { v:'mgdl', label:'mg/dL', sub:'US' },
          { v:'mmol', label:'mmol/L', sub:'OUS · JP' },
        ]}/>
      </Card>

      {/* Submit */}
      <div style={{ padding:'22px 18px 0' }}>
        <button style={btnPrimary}>Connect</button>
        <p style={{ fontSize:11, color:G.ink3, textAlign:'center', marginTop:12, lineHeight:1.5 }}>
          Takes about 10–30 seconds. We'll seed your alarms with safe defaults.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form sub-pieces
// ─────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <div style={{ padding:'18px 28px 6px', fontSize:11, color:G.ink3, letterSpacing:'0.09em', textTransform:'uppercase', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
      {children}
    </div>
  );
}
function Optional() {
  return <span style={{ fontSize:10, color:G.ink3, fontWeight:500, textTransform:'none', letterSpacing:0, padding:'2px 6px', borderRadius:4, background:'rgba(12,20,28,0.05)' }}>optional</span>;
}
function Helper({ children }) {
  return <div style={{ padding:'8px 28px 0', fontSize:11.5, color:G.ink3, lineHeight:1.5 }}>{children}</div>;
}
function InputRow({ placeholder, type='text', right, autoComplete }) {
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'14px 16px', gap:10 }}>
      <input type={type} placeholder={placeholder} autoComplete={autoComplete} style={{
        flex:1, border:'none', outline:'none', background:'transparent',
        fontSize:15, color:G.inkH, fontFamily:'inherit', padding:0,
      }}/>
      {right}
    </div>
  );
}
const inputAffordance = {
  appearance:'none', border:'none', background:'transparent', cursor:'pointer',
  fontSize:12.5, fontWeight:600, color:G.cyanDeep,
};
function SegmentRow({ value, onChange, opts }) {
  return (
    <div style={{ padding:6, display:'flex', gap:6, background:'rgba(12,20,28,0.04)', borderRadius:18, margin:6 }}>
      {opts.map(o => {
        const on = o.v===value;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            flex:1, appearance:'none', border:'none', cursor:'pointer',
            background: on ? G.card : 'transparent',
            color: on ? G.inkH : G.ink2,
            fontWeight: on ? 700 : 500,
            fontSize:13, padding:'10px 8px', borderRadius:12,
            boxShadow: on ? '0 1px 2px rgba(12,20,28,0.08)' : 'none',
            display:'flex', flexDirection:'column', alignItems:'center', gap:1,
            transition:'background .14s',
          }}>
            <span>{o.label}</span>
            {o.sub && <span style={{ fontSize:10, color:G.ink3, fontWeight:500 }}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Shared button styles
const btnPrimary = {
  width:'100%', appearance:'none', cursor:'pointer',
  background:G.cyan, color:'#fff', border:'none',
  fontSize:16, fontWeight:600, padding:'16px 18px', borderRadius:16,
  boxShadow:'0 1px 0 rgba(14,143,182,0.4), 0 8px 22px rgba(22,188,233,0.28)',
};
const btnGhost = {
  width:'100%', appearance:'none', cursor:'pointer',
  background:G.card, color:G.inkH, border:'none',
  fontSize:15, fontWeight:600, padding:'15px 18px', borderRadius:16,
  boxShadow:'0 1px 0 rgba(12,20,28,0.04), 0 1px 2px rgba(12,20,28,0.04)',
};

Object.assign(window, { PairBracelet, DexcomHero, DexcomForm });
