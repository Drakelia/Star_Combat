/* global React */
/* =========================================================
   DIRECTION A — STRIKE · v2 (poussée plus loin)
   - Polished Start / HUD / End
   - + Pause overlay, Wave clear, Boss intro
   ========================================================= */

const a2 = {
  bg: '#08080c',
  panel: 'rgba(14,15,21,0.78)',
  panelSolid: '#0e0f15',
  line: '#1f2230',
  lineLight: '#2a2d3d',
  mid: '#6a6e80',
  midDim: '#454859',
  fg: '#e9eaef',
  red: '#ff2d55',
  pink: '#ff3ea5',
  warn: '#ffb84a',
  ok: '#3ddc97',
};

/* ---- Reusable bits ---- */
function Frame({ pad = 24, c = a2.red, t = 1, l = 36 }) {
  const s = { position: 'absolute', borderColor: c, borderStyle: 'solid' };
  return (
    <>
      <div style={{ ...s, top: pad, left: pad, width: l, height: l, borderWidth: `${t}px 0 0 ${t}px` }} />
      <div style={{ ...s, top: pad, right: pad, width: l, height: l, borderWidth: `${t}px ${t}px 0 0` }} />
      <div style={{ ...s, bottom: pad, left: pad, width: l, height: l, borderWidth: `0 0 ${t}px ${t}px` }} />
      <div style={{ ...s, bottom: pad, right: pad, width: l, height: l, borderWidth: `0 ${t}px ${t}px 0` }} />
    </>
  );
}

function ChromeStripe({ children, color = a2.mid }) {
  return (
    <div style={{
      fontFamily: 'Space Mono, monospace', fontSize: 12,
      letterSpacing: '0.2em', textTransform: 'uppercase', color,
    }}>{children}</div>
  );
}

function Tag({ children, c = a2.red, fill = false }) {
  return (
    <span style={{
      fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.22em', textTransform: 'uppercase',
      border: `1px solid ${c}`, padding: '3px 8px',
      background: fill ? c : 'transparent',
      color: fill ? a2.bg : c,
    }}>{children}</span>
  );
}

function ShipShape({ scale = 1, color = a2.fg, accent = a2.red }) {
  return (
    <svg width={760 * scale} height={520 * scale} viewBox="-380 -260 760 520" style={{ display: 'block' }}>
      {/* sub-grid */}
      <defs>
        <pattern id="ag" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={a2.line} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect x="-380" y="-260" width="760" height="520" fill="url(#ag)" opacity="0.4"/>
      {/* ship — top-down silhouette */}
      <g>
        <polygon points="0,-200 60,-40 200,40 220,80 60,80 30,200 -30,200 -60,80 -220,80 -200,40 -60,-40"
                 fill="#11131c" stroke={color} strokeWidth="2"/>
        <polygon points="0,-180 40,-50 -40,-50" fill={accent} opacity="0.18" stroke={accent} strokeWidth="1"/>
        <line x1="-160" y1="60" x2="-200" y2="40" stroke={color} strokeWidth="1.5"/>
        <line x1="160"  y1="60" x2="200"  y2="40" stroke={color} strokeWidth="1.5"/>
        <circle cx="0" cy="20" r="6" fill={accent}/>
        <circle cx="0" cy="20" r="14" fill="none" stroke={accent} strokeWidth="1" opacity="0.5"/>
        {/* labels */}
        <g fontFamily="Space Mono" fontSize="10" fill={accent} letterSpacing="2">
          <text x="220" y="40">▸ A1·HARDPOINT</text>
          <text x="-360" y="40" textAnchor="start">B2·HARDPOINT ◂</text>
          <text x="0" y="-218" textAnchor="middle">FALCON·MK·VII</text>
          <text x="50" y="232">REACTOR · 87%</text>
        </g>
        <line x1="220" y1="44" x2="200" y2="60" stroke={accent} strokeWidth="1"/>
        <line x1="-220" y1="44" x2="-200" y2="60" stroke={accent} strokeWidth="1"/>
      </g>
    </svg>
  );
}

/* ============== START v2 ============== */
function A2Start() {
  const diffs = [
    { name: 'CADET',     code: '[01]', desc: 'Hull +50% · 6 vagues',         tag: 'EASY' },
    { name: 'PILOT',     code: '[02]', desc: 'Paramètres standards',         tag: 'STD',    hot: true },
    { name: 'ACE',       code: '[03]', desc: 'Hull -30% · vagues rapides',   tag: 'HARD' },
    { name: 'OVERLORD',  code: '[04]', desc: 'Permadeath · pas de pitié',    tag: 'BRUTAL' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: a2.bg, color: a2.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <div className="starfield" />
      <div className="nebula-a" />

      {/* top chrome */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 48,
        borderBottom: `1px solid ${a2.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <ChromeStripe color={a2.red}>● TRANSMISSION ─ DEFENCE COMMAND</ChromeStripe>
        <ChromeStripe>STAR COMBAT // V0.4.1 // SECTOR-7 / OUTER RIM</ChromeStripe>
        <ChromeStripe>UPLINK 99.4% · 02:47:11 UTC</ChromeStripe>
      </div>
      <Frame pad={72} c={a2.red} l={80} t={2}/>

      {/* Title block */}
      <div style={{ position: 'absolute', left: 120, top: 156, width: 980 }}>
        <ChromeStripe color={a2.red}>▸ INCOMING TRANSMISSION ─ PRIORITY ALPHA</ChromeStripe>
        <h1 className="orb upper" style={{
          fontWeight: 900, fontSize: 192, lineHeight: 0.88, margin: '14px 0 0 -10px',
          letterSpacing: '-0.02em',
        }}>
          STAR<br/>
          <span style={{ color: a2.red }}>COMBAT</span>
        </h1>
        {/* stamps */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <Tag c={a2.red} fill>OPERATION · NIGHT-FALL</Tag>
          <Tag c={a2.pink}>10 WAVES</Tag>
          <Tag c={a2.warn}>BOSS · WAVE 05·10</Tag>
          <Tag c={a2.mid}>SOLO</Tag>
        </div>

        <div style={{
          marginTop: 30, fontSize: 22, lineHeight: 1.45, maxWidth: 620,
          color: '#b8b9c4',
        }}>
          Dernier vaisseau de la flotte. La station <span style={{ color: a2.red }}>VEGA-9</span> est encerclée.
          Tenez la position jusqu'à l'extraction. Aucun renfort attendu.
        </div>

        {/* Wave preview */}
        <div style={{ marginTop: 36 }}>
          <ChromeStripe color={a2.mid}>▸ WAVE FORECAST</ChromeStripe>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {[
              ['F', 'F', 'F'], ['F', 'F', 'S'], ['F', 'T', 'S'],
              ['F', 'F', 'T', 'S'], ['B'], ['F','F','F','S','S'],
              ['T', 'T', 'F'], ['S', 'S', 'T'], ['F','F','T','T','S'],
              ['B'],
            ].map((wave, i) => {
              const isBoss = wave[0] === 'B';
              return (
                <div key={i} style={{
                  flex: 1, padding: '10px 8px',
                  border: `1px solid ${isBoss ? a2.red : a2.line}`,
                  background: isBoss ? 'rgba(255,45,85,0.12)' : 'transparent',
                  textAlign: 'center', position: 'relative',
                }}>
                  <div className="mono" style={{ fontSize: 10, color: a2.mid, letterSpacing: '0.16em' }}>W{String(i+1).padStart(2,'0')}</div>
                  <div className="orb" style={{ fontSize: 16, fontWeight: 800, color: isBoss ? a2.red : a2.fg, marginTop: 2 }}>
                    {isBoss ? 'BOSS' : `×${wave.length}`}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: a2.midDim, letterSpacing: '0.12em', marginTop: 2 }}>
                    {wave.join(' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pilot dossier */}
        <div style={{
          marginTop: 32, display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr',
          gap: 24, alignItems: 'center', padding: '20px 24px',
          border: `1px solid ${a2.line}`, background: a2.panel,
        }}>
          <div style={{
            width: 64, height: 64, border: `1px solid ${a2.red}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: a2.red, fontFamily: 'Orbitron', fontWeight: 900, fontSize: 28,
          }}>4471</div>
          <Stat label="CALLSIGN"   value="NOVA"     sub="RANK · CMDR"/>
          <Stat label="HIGH SCORE" value="247,830"  sub="WAVE 08 · 04:12"/>
          <Stat label="HOURS"      value="42.6h"    sub="LIFETIME"/>
          <Stat label="SHIP"       value="FALCON-VII" sub="LOADOUT · DEFAULT"/>
        </div>
      </div>

      {/* RIGHT — settings panel */}
      <div style={{
        position: 'absolute', right: 120, top: 156, width: 600,
        background: a2.panel,
        border: `1px solid ${a2.line}`,
        backdropFilter: 'blur(6px)', padding: 28,
      }}>
        <ChromeStripe color={a2.red}>▸ MISSION DIFFICULTY</ChromeStripe>
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {diffs.map(d => (
            <div key={d.name} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 14,
              alignItems: 'center', padding: '12px 16px',
              background: d.hot ? 'rgba(255,45,85,0.12)' : 'transparent',
              border: `1px solid ${d.hot ? a2.red : a2.line}`,
            }}>
              <div className="mono" style={{ fontSize: 11, color: d.hot ? a2.red : a2.midDim, letterSpacing: '0.18em' }}>{d.code}</div>
              <div style={{
                width: 14, height: 14, border: `2px solid ${d.hot ? a2.red : a2.mid}`,
                background: d.hot ? a2.red : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.hot && <div style={{ width: 4, height: 4, background: a2.bg }} />}
              </div>
              <div>
                <div className="orb upper" style={{ fontWeight: 700, fontSize: 18 }}>{d.name}</div>
                <div className="raj" style={{ color: a2.mid, fontSize: 14, marginTop: 2 }}>{d.desc}</div>
              </div>
              <Tag c={d.hot ? a2.red : a2.midDim}>{d.tag}</Tag>
            </div>
          ))}
        </div>

        <ChromeStripe color={a2.red}>{'\u00A0'}</ChromeStripe>
        <div style={{ marginTop: 24 }}>
          <ChromeStripe color={a2.red}>▸ FLIGHT CONTROLS</ChromeStripe>
          <div style={{
            marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px',
            fontSize: 15,
          }}>
            {[
              ['THRUST',  'W'], ['BRAKE',   'S'],
              ['STRAFE',  'A·D'], ['BOOST',   'SHIFT'],
              ['FIRE',    'LMB'], ['MISSILE', 'RMB'],
              ['LOCK-ON', 'TAB'], ['EMP',     'Q'],
              ['SWITCH',  '1·2·3'], ['PAUSE',   'ESC'],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0', borderBottom: `1px dashed ${a2.line}`,
              }}>
                <span className="raj upper" style={{ color: a2.mid, letterSpacing: '0.08em' }}>{k}</span>
                <span className="orb" style={{
                  background: a2.line, padding: '3px 9px',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
                }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SFX */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ChromeStripe color={a2.red}>▸ AUDIO</ChromeStripe>
            <Tag c={a2.red} fill>ON</Tag>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.18em' }}>SFX 72</span>
            <div style={{ height: 6, background: a2.line, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: '72%', background: a2.red }} />
              <div style={{ position: 'absolute', left: '72%', top: -4, width: 4, height: 14, background: a2.fg, transform: 'translateX(-2px)' }} />
            </div>
            <span className="mono" style={{ fontSize: 11, color: a2.mid }}>MUS 50</span>
          </div>
        </div>

        <button style={{
          marginTop: 22, width: '100%', height: 76,
          background: a2.red, color: a2.bg, border: 'none',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
          fontSize: 26, letterSpacing: '0.24em', cursor: 'pointer', position: 'relative',
        }}>
          ▶  LAUNCH MISSION
          <span style={{
            position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
            background: a2.bg, color: a2.red, padding: '4px 8px',
            fontSize: 11, letterSpacing: '0.18em',
          }}>ENTER</span>
        </button>
      </div>

      {/* bottom chrome */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,
        borderTop: `1px solid ${a2.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <ChromeStripe>[ENTER] LAUNCH · [↑↓] DIFF · [ESC] EXIT</ChromeStripe>
        <ChromeStripe color={a2.red}>● ALL SYSTEMS NOMINAL · HULL 100% · SHIELD 100%</ChromeStripe>
        <ChromeStripe>04471·NOVA · LIFETIME RUNS 314</ChromeStripe>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <ChromeStripe color={a2.mid}>{label}</ChromeStripe>
      <div className="orb" style={{ fontSize: 22, fontWeight: 800, color: a2.fg, marginTop: 2 }}>{value}</div>
      <div className="mono" style={{ fontSize: 11, color: a2.midDim, letterSpacing: '0.16em', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

/* ============== HUD v2 ============== */
function A2Hud() {
  return (
    <div style={{
      width: '100%', height: '100%', background: a2.bg, color: a2.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <div className="starfield" />
      <div className="nebula-a" />
      {/* Distant planet */}
      <div style={{
        position: 'absolute', right: -160, top: 60, width: 700, height: 700,
        borderRadius: '50%', background: '#0c0d14',
        border: `1px solid #181b25`,
        boxShadow: 'inset -120px -80px 200px rgba(0,0,0,0.85), inset 80px 40px 200px rgba(255,45,85,0.05)',
      }} />
      {/* Ship trail (front) */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <g opacity="0.5">
          <line x1="0" y1="540" x2="200" y2="540" stroke={a2.red} strokeWidth="0.5"/>
          <line x1="1920" y1="540" x2="1720" y2="540" stroke={a2.red} strokeWidth="0.5"/>
        </g>
        {/* enemies */}
        <g transform="translate(960, 540)">
          <polygon points="-60,-22 60,-22 80,0 60,22 -60,22 -80,0" fill="#1a1c28" stroke={a2.red} strokeWidth="2" />
          <rect x="-20" y="-8" width="40" height="16" fill={a2.red} opacity="0.6" />
        </g>
        <g transform="translate(700, 360)">
          <polygon points="0,-16 14,12 -14,12" fill="#262835" stroke="#3a3d4f" strokeWidth="1.5" />
        </g>
        <g transform="translate(1380, 420)">
          <polygon points="0,-14 12,10 -12,10" fill="#262835" stroke="#3a3d4f" strokeWidth="1.5" />
        </g>
        <g transform="translate(1240, 720) rotate(15)">
          <polygon points="0,-22 6,0 0,22 -6,0" fill="#1a1c28" stroke={a2.pink} strokeWidth="1.5" />
        </g>
        <g transform="translate(560, 600)">
          <polygon points="0,-10 8,7 -8,7" fill="#1e2030" stroke="#2a2c3c" strokeWidth="1" />
        </g>
        {/* projectiles */}
        <line x1="960" y1="800" x2="960" y2="700" stroke={a2.red} strokeWidth="3"/>
        <line x1="960" y1="680" x2="960" y2="600" stroke={a2.red} strokeWidth="2" opacity="0.7"/>
      </svg>

      {/* Damage vignette (subtle) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 240px rgba(255,45,85,0.18)',
      }}/>

      {/* CROSSHAIR */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 380, height: 380, pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 380 380" width="380" height="380">
          <g stroke={a2.red} strokeWidth="2" fill="none">
            <path d="M30,30 L30,80 M30,30 L80,30" />
            <path d="M350,30 L350,80 M350,30 L300,30" />
            <path d="M30,350 L30,300 M30,350 L80,350" />
            <path d="M350,350 L350,300 M350,350 L300,350" />
            <circle cx="190" cy="190" r="4" fill={a2.red} />
            <path d="M190,140 L190,170 M190,210 L190,240 M140,190 L170,190 M210,190 L240,190" strokeWidth="1.5"/>
            <circle cx="190" cy="190" r="80" strokeDasharray="4 6" opacity="0.5"/>
          </g>
          <text x="190" y="20" fontFamily="Space Mono" fontSize="11" fill={a2.red} textAnchor="middle" letterSpacing="3">
            ◤ TARGET LOCKED ◥
          </text>
          <text x="190" y="370" fontFamily="Space Mono" fontSize="10" fill={a2.red} textAnchor="middle" letterSpacing="2">
            HOSTILE-K2 · TANK · 412m · CONFIDENCE 94%
          </text>
          {/* health bar above target */}
          <g>
            <rect x="120" y="40" width="140" height="6" fill="#1f2230"/>
            <rect x="120" y="40" width="56"  height="6" fill={a2.red}/>
            <text x="190" y="36" fontFamily="Space Mono" fontSize="9" fill={a2.fg} textAnchor="middle" letterSpacing="2">
              HP 40 / 100
            </text>
          </g>
        </svg>
      </div>

      {/* TOP BAR */}
      <div style={{
        position: 'absolute', top: 24, left: 24, right: 24, height: 60,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Tag c={a2.red}>● WAVE</Tag>
          <div className="orb" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
            03<span style={{ color: a2.mid, fontWeight: 500 }}> / 10</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                width: 22, height: 4,
                background: i < 2 ? a2.red : i === 2 ? a2.pink : a2.line,
              }} />
            ))}
          </div>
          <div className="mono upper" style={{ fontSize: 12, color: a2.mid, letterSpacing: '0.16em', marginLeft: 12 }}>
            HOSTILES <span style={{ color: a2.fg }}>04</span> / 06
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <ChromeStripe color={a2.mid}>SCORE</ChromeStripe>
          <div className="orb" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>128,440</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 13, color: a2.mid, letterSpacing: '0.12em' }}>KILLS <span style={{ color: a2.fg }}>47</span></span>
            <span className="mono" style={{ fontSize: 13, color: a2.red, letterSpacing: '0.12em' }}>×7 COMBO</span>
          </div>
        </div>
      </div>

      {/* Boss alert */}
      <div style={{
        position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none',
      }}>
        <div className="orb upper" style={{
          fontSize: 12, color: a2.red, letterSpacing: '0.4em',
          border: `1px solid ${a2.red}`, padding: '5px 18px',
          background: 'rgba(255,45,85,0.06)',
        }}>
          ▲ ▲ ▲  BOSS INCOMING — WAVE 05  ▲ ▲ ▲
        </div>
      </div>

      {/* Combo */}
      <div style={{ position: 'absolute', left: '60%', top: 360, pointerEvents: 'none' }}>
        <div className="orb" style={{
          fontSize: 96, fontWeight: 900, color: a2.red,
          textShadow: '0 0 40px rgba(255,45,85,0.6)', lineHeight: 0.9,
        }}>×7</div>
        <div className="mono upper" style={{ fontSize: 14, color: a2.pink, letterSpacing: '0.24em', marginTop: -4 }}>COMBO · 02.4S</div>
        {/* combo timer bar */}
        <div style={{ height: 3, background: a2.line, marginTop: 6, width: 120 }}>
          <div style={{ height: '100%', width: '60%', background: a2.red }} />
        </div>
      </div>

      {/* Floating damage numbers */}
      <div style={{ position: 'absolute', left: '46%', top: '52%', pointerEvents: 'none' }}>
        <div className="orb" style={{ fontSize: 22, fontWeight: 800, color: a2.warn, letterSpacing: '0.05em' }}>-128</div>
      </div>
      <div style={{ position: 'absolute', left: '38%', top: '46%', pointerEvents: 'none' }}>
        <div className="orb" style={{ fontSize: 16, fontWeight: 700, color: a2.fg, opacity: 0.5 }}>-32</div>
      </div>

      {/* BOTTOM-LEFT: HULL/SHIELD */}
      <div style={{
        position: 'absolute', left: 32, bottom: 32, width: 440,
        background: a2.panel, border: `1px solid ${a2.line}`, padding: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <ChromeStripe color={a2.mid}>▸ HULL INTEGRITY</ChromeStripe>
          <span className="mono" style={{ fontSize: 10, color: a2.warn, letterSpacing: '0.18em' }}>● DAMAGE TAKEN</span>
        </div>
        <Bar2 pct={0.62} color={a2.red} value="62 / 100" sub="HP" />
        <div style={{ height: 12 }} />
        <ChromeStripe color={a2.mid}>▸ SHIELD MATRIX</ChromeStripe>
        <Bar2 pct={0.85} color={a2.pink} value="85 / 100" sub="SP" segments={20} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'Space Mono, monospace', fontSize: 12, letterSpacing: '0.14em' }}>
          <span style={{ color: a2.ok }}>+0.4 SP/S</span>
          <span style={{ color: a2.warn }}>● HEAT 41%</span>
          <span style={{ color: a2.mid }}>HULL REPAIR · 0</span>
        </div>
      </div>

      {/* BOTTOM-RIGHT: WEAPONS */}
      <div style={{
        position: 'absolute', right: 32, bottom: 32, width: 440,
        background: a2.panel, border: `1px solid ${a2.line}`, padding: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ChromeStripe color={a2.mid}>▸ ARMAMENT</ChromeStripe>
          <span className="mono" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.18em' }}>SLOT 1·2·3</span>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <Weapon2 name="PULSE LASER" k="LMB" ammo="∞" cd={0} active hint="DPS 240"/>
          <Weapon2 name="HOMING MISSILE" k="RMB" ammo="06 / 12" cd={0.3} hint="DMG 800"/>
          <Weapon2 name="EMP BURST" k="Q" ammo="READY" cd={0.7} hint="STUN 1.4S"/>
        </div>
      </div>

      {/* RIGHT: SPEED */}
      <div style={{
        position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
        width: 76, height: 280,
        background: a2.panel, border: `1px solid ${a2.line}`, padding: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div className="mono upper" style={{ fontSize: 10, color: a2.mid, letterSpacing: '0.2em' }}>SPD</div>
        <div className="orb" style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>184</div>
        <div className="mono" style={{ fontSize: 10, color: a2.mid }}>m/s</div>
        <div style={{ flex: 1, marginTop: 12, width: 8, position: 'relative', background: a2.line }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '74%', background: a2.red }} />
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} style={{
              position: 'absolute', left: -4, right: -4, bottom: `${t * 100}%`,
              height: 1, background: a2.mid,
            }} />
          ))}
        </div>
        <div className="mono upper" style={{ marginTop: 8, fontSize: 10, color: a2.red, letterSpacing: '0.2em' }}>BOOST</div>
      </div>

      {/* LEFT: TARGET INFO + MASS SCAN */}
      <div style={{ position: 'absolute', left: 32, top: 110, width: 320 }}>
        <div style={{ border: `1px solid ${a2.red}`, background: 'rgba(255,45,85,0.06)', padding: 14 }}>
          <ChromeStripe color={a2.red}>▸ LOCKED TARGET</ChromeStripe>
          <div className="orb upper" style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>HOSTILE-K2</div>
          <div className="mono" style={{ fontSize: 12, color: a2.mid, letterSpacing: '0.16em', textTransform: 'uppercase' }}>CLASS · TANK · HEAVY</div>
          <div style={{ marginTop: 12 }}>
            <Bar2 pct={0.40} color={a2.red} value="40 / 100" sub="HP" />
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11, fontFamily: 'Space Mono, monospace', letterSpacing: '0.12em', color: a2.mid }}>
            <div>DIST<br/><span style={{ color: a2.fg, fontSize: 14 }}>412m</span></div>
            <div>VEL<br/><span style={{ color: a2.fg, fontSize: 14 }}>62 m/s</span></div>
            <div>HEAT<br/><span style={{ color: a2.warn, fontSize: 14 }}>HIGH</span></div>
          </div>
        </div>

        {/* Mass scanner */}
        <div style={{ marginTop: 14, border: `1px solid ${a2.line}`, padding: 14, background: a2.panel }}>
          <ChromeStripe color={a2.mid}>▸ MASS SCANNER · 1.2KM</ChromeStripe>
          <div style={{ marginTop: 10, position: 'relative', height: 110 }}>
            {/* horizontal grid */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 1, background: a2.line }} />
              ))}
            </div>
            {/* enemies as dots */}
            {[
              { x: 50, y: 30, c: a2.red,  size: 8 },
              { x: 30, y: 50, c: a2.fg,   size: 4 },
              { x: 70, y: 45, c: a2.fg,   size: 4 },
              { x: 65, y: 75, c: a2.pink, size: 5 },
              { x: 20, y: 80, c: a2.fg,   size: 3 },
            ].map((d, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
                width: d.size, height: d.size, background: d.c,
                transform: 'translate(-50%,-50%) rotate(45deg)',
              }} />
            ))}
            {/* center marker */}
            <div style={{
              position: 'absolute', left: '50%', top: '60%',
              width: 8, height: 8, border: `1px solid ${a2.fg}`,
              transform: 'translate(-50%,-50%) rotate(45deg)',
            }} />
          </div>
        </div>
      </div>

      {/* off-screen arrows */}
      <DirArrow x="6%" y="50%" rot={-90} label="2 FIGHTERS · 800m" />
      <DirArrow x="50%" y="92%" rot={180} label="1 SNIPER · 940m" />

      <Frame pad={16} c={a2.red} t={1} l={28} />

      {/* mini event log bottom-center */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 32,
        fontFamily: 'Space Mono, monospace', fontSize: 12, color: a2.mid, letterSpacing: '0.12em',
        textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.7,
        background: a2.panel, padding: '8px 16px', border: `1px solid ${a2.line}`,
        minWidth: 540,
      }}>
        <div><span style={{ color: a2.red }}>▸</span> FIGHTER-04 NEUTRALIZED · +120 PTS</div>
        <div><span style={{ color: a2.warn }}>▸</span> SHIELD HIT · -12 SP</div>
        <div><span style={{ color: a2.pink }}>▸</span> COMBO ×7 · BONUS +40%</div>
      </div>
    </div>
  );
}

function Bar2({ pct, color, value, sub, segments = 0 }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ position: 'relative', width: '100%', height: 14, background: a2.line }}>
        {segments > 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 2 }}>
            {Array.from({ length: segments }).map((_, i) => (
              <div key={i} style={{ flex: 1, background: i / segments < pct ? color : 'transparent' }} />
            ))}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, width: `${pct * 100}%`, background: color }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span className="orb" style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
        <span className="mono upper" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.16em' }}>{sub}</span>
      </div>
    </div>
  );
}

function Weapon2({ name, k, ammo, cd, active, hint }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
      padding: '10px 12px',
      background: active ? 'rgba(255,45,85,0.08)' : 'transparent',
      border: `1px solid ${active ? a2.red : a2.line}`,
    }}>
      <div className="orb" style={{
        background: active ? a2.red : a2.line, color: active ? a2.bg : a2.fg,
        padding: '6px 10px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
        minWidth: 44, textAlign: 'center',
      }}>{k}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="raj upper" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.06em' }}>{name}</span>
          <span className="mono" style={{ fontSize: 10, color: a2.mid, letterSpacing: '0.18em' }}>{hint}</span>
        </div>
        <div style={{ marginTop: 4, height: 4, background: a2.line, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${(1 - cd) * 100}%`, background: cd === 0 ? a2.red : a2.warn }} />
        </div>
      </div>
      <div className="mono" style={{ fontSize: 13, letterSpacing: '0.08em', minWidth: 70, textAlign: 'right' }}>{ammo}</div>
    </div>
  );
}

function DirArrow({ x, y, rot, label }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`, pointerEvents: 'none' }}>
      <div style={{
        width: 0, height: 0,
        borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
        borderBottom: `22px solid ${a2.red}`,
      }} />
      <div className="mono" style={{
        position: 'absolute', top: 28, left: '50%',
        transform: `translateX(-50%) rotate(${-rot}deg)`,
        fontSize: 11, color: a2.red, letterSpacing: '0.18em', whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  );
}

/* ============== END v2 ============== */
function A2End() {
  const stats = [
    ['SCORE FINAL',    '184,720', '+58,290 vs PB ◆', true],
    ['VAGUES',         '07 / 10', 'PB · 08'],
    ['SURVIE',         '06:42',   'PB · 04:12 ◆ NEW'],
    ['PRÉCISION',      '64.3%',   '247 / 384 tirs'],
    ['DÉGÂTS INFLIGÉS','12,840',  ''],
    ['DÉGÂTS REÇUS',   '2,180',   ''],
    ['COMBO MAX',      '×24',     'PB · ×31'],
    ['MULTIPLICATEUR', '×1.6',    'difficulté ACE'],
  ];
  const kills = [
    { type: 'FIGHTER', n: 38, c: a2.fg },
    { type: 'SNIPER',  n: 12, c: a2.pink },
    { type: 'TANK',    n: 6,  c: a2.warn },
    { type: 'BOSS',    n: 1,  c: a2.red },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: a2.bg, color: a2.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <div className="starfield" />
      <div className="nebula-a" />
      <Frame pad={56} c={a2.red} l={72} t={2} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 100, left: 120 }}>
        <ChromeStripe color={a2.red}>▸ MISSION TERMINATED // SHIP DESTROYED</ChromeStripe>
        <h1 className="orb upper" style={{
          fontWeight: 900, fontSize: 200, lineHeight: 0.9, margin: '14px 0 0 -8px',
          letterSpacing: '-0.02em',
        }}>
          GAME<br/>
          <span style={{ color: a2.red }}>OVER</span>
        </h1>

        {/* Grade card */}
        <div style={{
          marginTop: 28, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24,
          alignItems: 'center', padding: 24, border: `1px solid ${a2.red}`,
          background: 'rgba(255,45,85,0.06)', maxWidth: 540,
        }}>
          <div style={{
            width: 130, height: 130, border: `2px solid ${a2.red}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div className="orb" style={{ fontSize: 92, fontWeight: 900, color: a2.red, lineHeight: 1, letterSpacing: '-0.04em' }}>A</div>
            <div className="mono" style={{ position: 'absolute', top: -12, left: 12, background: a2.bg, padding: '0 6px', fontSize: 9, color: a2.red, letterSpacing: '0.24em' }}>GRADE</div>
          </div>
          <div>
            <div className="orb upper" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>VALIANT EFFORT</div>
            <div className="raj" style={{ fontSize: 16, color: a2.mid, marginTop: 6, lineHeight: 1.4 }}>
              Tu as tenu jusqu'à la vague 07 sur ACE.<br/>
              4 nouveaux records personnels enregistrés.
            </div>
          </div>
        </div>

        {/* Wave timeline */}
        <div style={{ marginTop: 28, maxWidth: 540 }}>
          <ChromeStripe color={a2.mid}>▸ RUN TIMELINE</ChromeStripe>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
            {[
              { ok: true,  k: 6 },
              { ok: true,  k: 4, bonus: true },
              { ok: true,  k: 7 },
              { ok: true,  k: 5 },
              { ok: true,  k: 1, boss: true },
              { ok: true,  k: 9 },
              { ok: false, k: 4, fail: true },
              null, null, null,
            ].map((w, i) => (
              <div key={i} style={{
                height: 60, padding: 6,
                background: !w ? 'transparent' : w.fail ? 'rgba(255,45,85,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${!w ? a2.line : w.fail ? a2.red : w.boss ? a2.warn : w.bonus ? a2.pink : a2.lineLight}`,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div className="mono" style={{ fontSize: 9, color: a2.midDim, letterSpacing: '0.16em' }}>W{String(i+1).padStart(2,'0')}</div>
                {w && <div className="orb" style={{ fontSize: 14, fontWeight: 800, color: w.fail ? a2.red : w.boss ? a2.warn : a2.fg }}>
                  {w.boss ? 'B' : `×${w.k}`}
                </div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: stats + kills */}
      <div style={{
        position: 'absolute', right: 120, top: 100, width: 880,
        background: a2.panel, border: `1px solid ${a2.line}`, padding: 32,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ChromeStripe color={a2.red}>▸ AFTER-ACTION REPORT · RUN #047</ChromeStripe>
          <span className="mono" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.18em' }}>UPLOAD · OK</span>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 16, columnGap: 28 }}>
          {stats.map(([k, v, sub, hot]) => (
            <div key={k} style={{ borderTop: `1px solid ${hot ? a2.red : a2.line}`, paddingTop: 10 }}>
              <ChromeStripe color={a2.mid}>{k}</ChromeStripe>
              <div className="orb" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, marginTop: 4, color: hot ? a2.red : a2.fg }}>{v}</div>
              <div className="mono" style={{ fontSize: 12, color: hot ? a2.pink : a2.mid, letterSpacing: '0.12em', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Kills */}
        <div style={{ marginTop: 24, paddingTop: 22, borderTop: `1px solid ${a2.line}` }}>
          <ChromeStripe color={a2.red}>▸ HOSTILES NEUTRALIZED · 57</ChromeStripe>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {kills.map(k => (
              <div key={k.type} style={{ border: `1px solid ${a2.line}`, padding: 12 }}>
                <EnemyIcon type={k.type} color={k.c} />
                <div className="mono upper" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.18em', marginTop: 8 }}>{k.type}</div>
                <div className="orb" style={{ fontSize: 32, fontWeight: 800, color: k.c, lineHeight: 1 }}>×{k.n}</div>
                <div className="mono" style={{ fontSize: 10, color: a2.midDim, letterSpacing: '0.18em', marginTop: 4 }}>
                  {k.type === 'FIGHTER' && '+15 PT EA'}
                  {k.type === 'SNIPER' && '+40 PT EA'}
                  {k.type === 'TANK' && '+120 PT EA'}
                  {k.type === 'BOSS' && '+8000 PT'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', left: 120, bottom: 90, display: 'flex', gap: 12 }}>
        <button style={{
          height: 80, padding: '0 48px',
          background: a2.red, color: a2.bg, border: 'none',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 24,
          letterSpacing: '0.24em', cursor: 'pointer', position: 'relative',
        }}>
          ↻  RETRY MISSION
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: a2.bg, color: a2.red, padding: '4px 8px', fontSize: 11, letterSpacing: '0.18em' }}>R</span>
        </button>
        <button style={{
          height: 80, padding: '0 32px',
          background: 'transparent', color: a2.fg,
          border: `1px solid ${a2.line}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 16,
          letterSpacing: '0.18em', cursor: 'pointer',
        }}>SHARE RESULT</button>
        <button style={{
          height: 80, padding: '0 32px',
          background: 'transparent', color: a2.fg,
          border: `1px solid ${a2.line}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 16,
          letterSpacing: '0.18em', cursor: 'pointer',
        }}>MAIN MENU</button>
      </div>

      <div style={{
        position: 'absolute', left: 120, bottom: 60, fontFamily: 'Space Mono, monospace',
        fontSize: 12, color: a2.mid, letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        ▸ NEW PERSONAL RECORD ON 4 OF 6 METRICS · UPLOAD COMPLETE · LEADERBOARD #214
      </div>
    </div>
  );
}

/* ============== PAUSE OVERLAY ============== */
function A2Pause() {
  return (
    <div style={{
      width: '100%', height: '100%', background: a2.bg, color: a2.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      {/* Faded HUD background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
        <A2Hud />
      </div>
      {/* dark veil */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,12,0.78)' }} />

      <Frame pad={56} c={a2.red} l={72} t={2} />

      {/* Center modal */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 880, padding: 48,
        background: a2.panel, border: `1px solid ${a2.red}`, backdropFilter: 'blur(8px)',
      }}>
        <ChromeStripe color={a2.red}>▸ MISSION PAUSED · WAVE 03 · 02:14</ChromeStripe>
        <h2 className="orb upper" style={{
          fontWeight: 900, fontSize: 96, lineHeight: 1, margin: '12px 0 0 0',
          letterSpacing: '-0.02em',
        }}>
          PAUSE<span style={{ color: a2.red }}>.</span>
        </h2>

        {/* mid stats snapshot */}
        <div style={{
          marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0,
          border: `1px solid ${a2.line}`,
        }}>
          {[
            ['SCORE',    '128,440'],
            ['WAVE',     '03 / 10'],
            ['HULL',     '62%'],
            ['COMBO',    '×7'],
          ].map(([k, v], i) => (
            <div key={k} style={{ padding: 18, borderRight: i < 3 ? `1px solid ${a2.line}` : 'none' }}>
              <ChromeStripe color={a2.mid}>{k}</ChromeStripe>
              <div className="orb" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* options */}
        <div style={{ marginTop: 28, display: 'grid', gap: 8 }}>
          {[
            { k: 'RESUME MISSION',    short: 'ESC', hot: true,  icon: '▶' },
            { k: 'OPTIONS',           short: 'O' },
            { k: 'RESTART RUN',       short: 'R' },
            { k: 'ABORT TO MAIN MENU',short: 'M', danger: true },
          ].map(o => (
            <div key={o.k} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              gap: 16, alignItems: 'center', padding: '14px 18px',
              border: `1px solid ${o.hot ? a2.red : o.danger ? '#3a1f24' : a2.line}`,
              background: o.hot ? 'rgba(255,45,85,0.10)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div className="orb" style={{
                width: 32, textAlign: 'center', fontWeight: 800,
                color: o.hot ? a2.red : o.danger ? '#ff6b7e' : a2.mid,
              }}>{o.icon || '○'}</div>
              <div className="orb upper" style={{
                fontWeight: 700, fontSize: 22, letterSpacing: '0.14em',
                color: o.danger ? '#ff6b7e' : a2.fg,
              }}>{o.k}</div>
              <span className="orb" style={{
                background: a2.line, padding: '4px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em',
              }}>{o.short}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============== WAVE CLEAR ============== */
function A2WaveClear() {
  return (
    <div style={{
      width: '100%', height: '100%', background: a2.bg, color: a2.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <div className="starfield" />
      <div className="nebula-a" />
      <Frame pad={56} c={a2.red} l={72} t={2} />

      {/* big stripes */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 220,
        height: 340, background: 'rgba(255,45,85,0.06)',
        borderTop: `1px solid ${a2.red}`, borderBottom: `1px solid ${a2.red}`,
      }} />

      <div style={{ position: 'absolute', left: 120, top: 200 }}>
        <ChromeStripe color={a2.red}>▸ HOSTILES NEUTRALIZED ─ AREA SECURED</ChromeStripe>
        <h1 className="orb upper" style={{
          fontWeight: 900, fontSize: 220, lineHeight: 0.88,
          margin: '14px 0 0 -10px', letterSpacing: '-0.02em',
        }}>
          WAVE&nbsp;<span style={{ color: a2.red }}>03</span><br/>
          CLEARED.
        </h1>
        <div className="raj" style={{ fontSize: 22, color: a2.mid, marginTop: 14 }}>
          Sept ennemis abattus en 1 min 22 · sans dégât majeur.
        </div>
      </div>

      {/* RIGHT: wave-specific stats + reward */}
      <div style={{
        position: 'absolute', right: 120, top: 200, width: 720,
        background: a2.panel, border: `1px solid ${a2.line}`, padding: 28,
      }}>
        <ChromeStripe color={a2.red}>▸ WAVE BREAKDOWN</ChromeStripe>
        <div style={{
          marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16,
        }}>
          {[
            ['+ 4,820',  'SCORE GAINED', a2.red],
            ['7 / 7',    'KILLS · PERFECT', a2.fg],
            ['81%',      'ACCURACY', a2.fg],
            ['×11',      'COMBO PEAK', a2.pink],
            ['1:22',     'WAVE TIME', a2.fg],
            ['+0',       'DAMAGE TAKEN', a2.ok],
          ].map(([v, k, c]) => (
            <div key={k} style={{ borderTop: `1px solid ${a2.line}`, paddingTop: 8 }}>
              <ChromeStripe color={a2.mid}>{k}</ChromeStripe>
              <div className="orb" style={{ fontSize: 34, fontWeight: 800, color: c, lineHeight: 1, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Reward */}
        <div style={{
          marginTop: 22, padding: 16,
          background: 'rgba(255,45,85,0.10)', border: `1px solid ${a2.red}`,
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center',
        }}>
          <div className="orb" style={{ fontSize: 36, color: a2.red, fontWeight: 900 }}>◆</div>
          <div>
            <div className="orb upper" style={{ fontWeight: 800, fontSize: 18 }}>REWARD · HULL REPAIR +20</div>
            <div className="mono upper" style={{ fontSize: 11, color: a2.mid, letterSpacing: '0.18em', marginTop: 2 }}>PERFECT WAVE BONUS</div>
          </div>
          <Tag c={a2.red} fill>APPLIED</Tag>
        </div>

        {/* next wave preview */}
        <div style={{ marginTop: 22 }}>
          <ChromeStripe color={a2.mid}>▸ NEXT · WAVE 04 — INCOMING IN 03</ChromeStripe>
          <div style={{
            marginTop: 12, display: 'flex', gap: 8,
            padding: 14, border: `1px solid ${a2.lineLight}`,
          }}>
            <EnemyChip type="FIGHTER" n={3} c={a2.fg} />
            <EnemyChip type="SNIPER" n={1} c={a2.pink} />
            <EnemyChip type="TANK" n={1} c={a2.warn} />
            <div style={{ flex: 1 }} />
            <div className="orb" style={{ fontSize: 56, color: a2.red, fontWeight: 900, lineHeight: 1 }}>03</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 120, bottom: 90, display: 'flex', gap: 12 }}>
        <button style={{
          height: 72, padding: '0 40px',
          background: a2.red, color: a2.bg, border: 'none',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 22,
          letterSpacing: '0.24em', cursor: 'pointer',
        }}>▶  CONTINUE</button>
        <button style={{
          height: 72, padding: '0 28px',
          background: 'transparent', color: a2.fg, border: `1px solid ${a2.line}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14,
          letterSpacing: '0.18em', cursor: 'pointer',
        }}>LOADOUT</button>
      </div>
    </div>
  );
}

function EnemyChip({ type, n, c }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      border: `1px solid ${a2.line}`, background: a2.panel,
    }}>
      <EnemyIcon type={type} color={c} />
      <div>
        <div className="orb" style={{ fontSize: 18, fontWeight: 800, color: c }}>×{n}</div>
        <div className="mono upper" style={{ fontSize: 9, color: a2.mid, letterSpacing: '0.2em' }}>{type}</div>
      </div>
    </div>
  );
}

window.A2Start = A2Start;
window.A2Hud = A2Hud;
window.A2End = A2End;
window.A2Pause = A2Pause;
window.A2WaveClear = A2WaveClear;
