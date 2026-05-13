// Canvas: dashboard, edit alarm, onboarding (pair bracelet + Dexcom)

const W = 412, H = 892;

function Frame({ children, dark }) {
  return <AndroidDevice width={W} height={H} dark={dark}>{children}</AndroidDevice>;
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="onboarding" title="Onboarding · Pair bracelet" subtitle="Step 1 of 2. Three key states from the BLE pair flow plus the success hand-off.">
        <DCArtboard id="P-instruct" label="1 · Instructions" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Pair instructions">
            <Frame><PairBracelet state="instruct"/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="P-scan" label="2 · Scanning" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Pair scanning">
            <Frame><PairBracelet state="scanning"/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="P-found" label="3 · Found" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Pair found">
            <Frame><PairBracelet state="discovered"/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="P-done" label="4 · Connected" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Pair connected">
            <Frame><PairBracelet state="success"/></Frame>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="dexcom" title="Onboarding · Connect Dexcom" subtitle="Step 2 of 2. Hero CTA then the credentials form with trust cues.">
        <DCArtboard id="D-hero" label="A · Hero CTA" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Dexcom hero">
            <Frame><DexcomHero/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="D-form" label="B · Credentials" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Dexcom form">
            <Frame><DexcomForm/></Frame>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="calm" title="Dashboard · Calm Hero" subtitle="Steady-state home, three glucose ranges.">
        <DCArtboard id="A-range" label="In range · 124" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Dashboard in-range">
            <Frame><VariantA value={124} trend="flat" minsAgo={2}/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="A-high" label="High · 215" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Dashboard high">
            <Frame><VariantA value={215} trend="up" minsAgo={1}/></Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="A-low" label="Low · 62" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Dashboard low">
            <Frame><VariantA value={62} trend="down" minsAgo={1}/></Frame>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="edit" title="Edit alarm" subtitle="Vibration slider, volume slider, six LED colors. Critical low shows the 50 mg/dL floor.">
        <DCArtboard id="E-high" label="High · 220" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Edit High">
            <Frame>
              <AlarmEdit tier="High" threshold={220}
                accent="#C07A1C" tint="#FAEBD3"
                defaultColor="amber" defaultVibe={3} defaultAudio={2}/>
            </Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="E-low" label="Low · 75" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Edit Low">
            <Frame>
              <AlarmEdit tier="Low" threshold={75}
                accent="#C24A4A" tint="#F8DCD9"
                defaultColor="red" defaultVibe={4} defaultAudio={3}/>
            </Frame>
          </div>
        </DCArtboard>
        <DCArtboard id="E-crit" label="Critical low · 55" width={W+16} height={H+16}>
          <div style={{ padding:8 }} data-screen-label="Edit Critical">
            <Frame>
              <AlarmEdit tier="Critical low" threshold={55} isFloor
                accent="#C24A4A" tint="#F8DCD9"
                defaultColor="red" defaultVibe={4} defaultAudio={4}/>
            </Frame>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
