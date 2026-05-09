/* global React */
const { useEffect, useRef, useState } = React;

/* =========================================================
   DIRECTION A — STRIKE
   Tactical · dense · red signal #ff2d55
   ========================================================= */

const aColors = {
  bg: '#08080c',
  panel: '#0e0f15',
  line: '#1f2230',
  mid: '#6a6e80',
  fg: '#e9eaef',
  red: '#ff2d55',
  pink: '#ff3ea5',
  warn: '#ffb84a',
};

/* ---- shared corner brackets ---- */
function CornerFrame({ pad = 24, color = aColors.red, thick = 2, len = 36 }) {
  const s = { position: 'absolute', borderColor: color, borderStyle: 'solid' };
  return (
    <>
      <div style={{ ...s, top: pad, left: pad, width: len, height: len, borderWidth: `${thick}px 0 0 ${thick}px` }} />
      <div style={{ ...s, top: pad, right: pad, width: len, height: len, borderWidth: `${thick}px ${thick}px 0 0` }} />
      <div style={{ ...s, bottom: pad, left: pad, width: len, height: len, borderWidth: `0 0 ${thick}px ${thick}px` }} />
      <div style={{ ...s, bottom: pad, right: pad, width: len, height: len, borderWidth: `0 ${thick}px ${thick}px 0` }} />
    </>
  );
}

/* ============== START SCREEN ============== */
function AStart() {
  const aStartStyles = {
    root: {
      width: '100%', height: '100%', background: aColors.bg, color: aColors.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    },
    topBar: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 56,
      borderBottom: `1px solid ${aColors.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', fontFamily: 'Space Mono, monospace', fontSize: 12,
      letterSpacing: '0.18em', textTransform: 'uppercase', color: aColors.mid,
    },
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 48,
      borderTop: `1px solid ${aColors.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', fontFamily: 'Space Mono, monospace', fontSize: 12,
      letterSpacing: '0.16em', textTransform: 'uppercase', color: aColors.mid,
    },
  };

  const diffs = [
    { name: 'CADET',     desc: 'Health 150% · 6 waves', hot: false, tag: 'EASY' },
    { name: 'PILOT',     desc: 'Standard combat parameters', hot: true, tag: 'STD' },
    { name: 'ACE',       desc: 'Health 70% · faster waves', hot: false, tag: 'HARD' },
    { name: 'OVERLORD',  desc: 'No mercy · permadeath', hot: false, tag: 'BRUTAL' },
  ];

  return (
    <div style={aStartStyles.root}>
      <div className="starfield" />
      <div className="nebula-a" />

      {/* Top status bar */}
      <div style={aStartStyles.topBar}>
        <span style={{ color: aColors.red }}>● SYSTEM ONLINE</span>
        <span>STAR COMBAT // V0.4.1 // SECTOR-7</span>
        <span>PILOT-ID 4471·NOVA</span>
      </div>

      {/* Bracket frame */}
      <CornerFrame pad={80} color={aColors.red} len={60} />

      {/* LEFT: title + lore */}
      <div style={{ position: 'absolute', left: 120, top: 200, width: 880 }}>
        <div className="kicker" style={{ color: aColors.red, marginBottom: 24 }}>
          ▸ INCOMING TRANSMISSION ─ DEFENCE COMMAND
        </div>
        <h1 className="orb upper" style={{
          fontWeight: 900, fontSize: 168, lineHeight: 0.92, margin: 0,
          letterSpacing: '-0.01em',
        }}>
          STAR<br/>
          <span style={{ color: aColors.red }}>COMBAT</span>
        </h1>
        <div style={{
          marginTop: 32, fontSize: 22, lineHeight: 1.4, maxWidth: 540,
          color: '#b8b9c4', fontWeight: 400,
        }}>
          Dernier vaisseau de la flotte engagée. Tenez la position.
          Repoussez les vagues hostiles jusqu'à l'extraction.
        </div>

        <div style={{
          marginTop: 56, display: 'flex', gap: 40,
          fontFamily: 'Space Mono, monospace', fontSize: 13,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          <div>
            <div style={{ color: aColors.mid }}>HIGH SCORE</div>
            <div className="orb" style={{ color: aColors.fg, fontSize: 28, marginTop: 6 }}>247,830</div>
          </div>
          <div>
            <div style={{ color: aColors.mid }}>BEST WAVE</div>
            <div className="orb" style={{ color: aColors.fg, fontSize: 28, marginTop: 6 }}>08 / 10</div>
          </div>
          <div>
            <div style={{ color: aColors.mid }}>RUN TIME</div>
            <div className="orb" style={{ color: aColors.fg, fontSize: 28, marginTop: 6 }}>04:12</div>
          </div>
        </div>
      </div>

      {/* RIGHT: settings panel */}
      <div style={{
        position: 'absolute', right: 120, top: 160, width: 620,
        background: 'rgba(14,15,21,0.78)',
        border: `1px solid ${aColors.line}`,
        backdropFilter: 'blur(6px)',
        padding: 32,
      }}>
        {/* difficulty */}
        <div className="kicker" style={{ color: aColors.red }}>▸ MISSION DIFFICULTY</div>
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          {diffs.map(d => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px',
              background: d.hot ? 'rgba(255,45,85,0.10)' : 'transparent',
              border: `1px solid ${d.hot ? aColors.red : aColors.line}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 14, height: 14, border: `2px solid ${d.hot ? aColors.red : aColors.mid}`,
                  background: d.hot ? aColors.red : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d.hot && <div style={{ width: 4, height: 4, background: aColors.bg }} />}
                </div>
                <div className="orb upper" style={{ fontWeight: 700, fontSize: 18 }}>{d.name}</div>
                <div className="mono" style={{
                  fontSize: 10, letterSpacing: '0.18em',
                  color: d.hot ? aColors.red : aColors.mid,
                  border: `1px solid ${d.hot ? aColors.red : aColors.mid}`,
                  padding: '2px 6px',
                }}>{d.tag}</div>
              </div>
              <div className="raj" style={{ color: aColors.mid, fontSize: 16 }}>{d.desc}</div>
            </div>
          ))}
        </div>

        {/* key bindings */}
        <div className="kicker" style={{ color: aColors.red, marginTop: 32 }}>▸ FLIGHT CONTROLS</div>
        <div style={{
          marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px',
          fontSize: 16, color: aColors.fg, fontWeight: 500,
        }}>
          {[
            ['THRUST',   'W'],
            ['BRAKE',    'S'],
            ['STRAFE',   'A · D'],
            ['BOOST',    'SHIFT'],
            ['FIRE',     'LMB'],
            ['MISSILE',  'RMB'],
            ['LOCK-ON',  'TAB'],
            ['PAUSE',    'ESC'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', borderBottom: `1px dashed ${aColors.line}`,
            }}>
              <span className="raj upper" style={{ color: aColors.mid, letterSpacing: '0.08em' }}>{k}</span>
              <span className="orb" style={{
                background: aColors.line, padding: '4px 10px',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              }}>{v}</span>
            </div>
          ))}
        </div>

        {/* sound + launch */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="kicker" style={{ color: aColors.mid, fontSize: 11 }}>AUDIO</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="orb upper" style={{
                fontSize: 12, padding: '4px 10px', background: aColors.red, color: aColors.bg,
                fontWeight: 700,
              }}>ON</div>
              <div style={{
                position: 'relative', flex: 1, height: 6, background: aColors.line,
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%',
                  background: aColors.red,
                }} />
                <div style={{
                  position: 'absolute', left: '72%', top: -4, width: 4, height: 14,
                  background: aColors.fg, transform: 'translateX(-2px)',
                }} />
              </div>
              <span className="mono" style={{ color: aColors.mid, fontSize: 12 }}>72</span>
            </div>
          </div>
        </div>
        <button style={{
          marginTop: 24, width: '100%', height: 72,
          background: aColors.red, color: aColors.bg, border: 'none',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
          fontSize: 28, letterSpacing: '0.24em',
          cursor: 'pointer', position: 'relative',
        }}>
          ▶  LAUNCH MISSION
        </button>
      </div>

      {/* Bottom bar */}
      <div style={aStartStyles.bottomBar}>
        <span>[ENTER] LAUNCH · [↑↓] DIFFICULTY · [ESC] EXIT</span>
        <span style={{ color: aColors.red }}>● ALL SYSTEMS NOMINAL</span>
        <span>UPLINK 99.4% · 02:47:11 UTC</span>
      </div>
    </div>
  );
}

/* ============== HUD ============== */
function AHud() {
  return (
    <div style={{
      width: '100%', height: '100%', background: aColors.bg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif', color: aColors.fg,
    }}>
      <div className="starfield" />
      <div className="nebula-a" />

      {/* Distant planet placeholder */}
      <div style={{
        position: 'absolute', right: -180, top: 80, width: 720, height: 720,
        borderRadius: '50%', background: '#0c0d14',
        border: `1px solid #181b25`,
        boxShadow: 'inset -120px -80px 200px rgba(0,0,0,0.8)',
      }} />

      {/* Enemy silhouettes (flat shapes) */}
      <Enemies />

      {/* === CROSSHAIR + LOCK BRACKETS (center) === */}
      <Crosshair />

      {/* === TOP BAR === */}
      <div style={{
        position: 'absolute', top: 24, left: 24, right: 24, height: 60,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        {/* wave indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            border: `1px solid ${aColors.red}`,
            padding: '6px 12px',
            color: aColors.red, fontFamily: 'Space Mono, monospace',
            fontSize: 12, letterSpacing: '0.2em',
          }}>● WAVE</div>
          <div className="orb" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: aColors.fg }}>
            03<span style={{ color: aColors.mid, fontWeight: 500 }}> / 10</span>
          </div>
          {/* wave dots */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                width: 22, height: 4,
                background: i < 2 ? aColors.red : i === 2 ? aColors.pink : aColors.line,
              }} />
            ))}
          </div>
          <div className="mono upper" style={{ marginLeft: 16, fontSize: 12, color: aColors.mid, letterSpacing: '0.16em' }}>
            HOSTILES <span style={{ color: aColors.fg }}>04</span> / 06
          </div>
        </div>

        {/* score */}
        <div style={{ textAlign: 'right' }}>
          <div className="mono upper" style={{ fontSize: 12, color: aColors.mid, letterSpacing: '0.18em' }}>SCORE</div>
          <div className="orb" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: aColors.fg }}>
            128,440
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 13, color: aColors.mid, letterSpacing: '0.12em' }}>
              KILLS <span style={{ color: aColors.fg }}>47</span>
            </span>
            <span className="mono" style={{ fontSize: 13, color: aColors.red, letterSpacing: '0.12em' }}>
              ×7 COMBO
            </span>
          </div>
        </div>
      </div>

      {/* === BOSS INCOMING ALERT (center top) === */}
      <div style={{
        position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div className="orb upper" style={{
          fontSize: 12, color: aColors.red, letterSpacing: '0.4em',
          border: `1px solid ${aColors.red}`, padding: '4px 18px',
          background: 'rgba(255,45,85,0.06)',
        }}>
          ▲ ▲ ▲  BOSS INCOMING — WAVE 05  ▲ ▲ ▲
        </div>
      </div>

      {/* === COMBO MULTIPLIER mid-air === */}
      <div style={{
        position: 'absolute', left: '60%', top: 360, pointerEvents: 'none',
      }}>
        <div className="orb" style={{
          fontSize: 96, fontWeight: 900, color: aColors.red,
          textShadow: '0 0 40px rgba(255,45,85,0.6)', lineHeight: 0.9,
        }}>×7</div>
        <div className="mono upper" style={{
          fontSize: 14, color: aColors.pink, letterSpacing: '0.24em', marginTop: -4,
        }}>COMBO · 02.4S</div>
      </div>

      {/* === BOTTOM-LEFT: SHIELD / HEALTH === */}
      <div style={{
        position: 'absolute', left: 32, bottom: 32, width: 420,
        background: 'rgba(14,15,21,0.78)', border: `1px solid ${aColors.line}`,
        padding: 18, backdropFilter: 'blur(4px)',
      }}>
        <div className="mono upper" style={{ fontSize: 12, color: aColors.mid, letterSpacing: '0.18em' }}>
          ▸ HULL INTEGRITY
        </div>
        <Bar pct={0.62} color={aColors.red} value="62 / 100" sub="HP" />
        <div style={{ height: 12 }} />
        <div className="mono upper" style={{ fontSize: 12, color: aColors.mid, letterSpacing: '0.18em' }}>
          ▸ SHIELD MATRIX
        </div>
        <Bar pct={0.85} color={aColors.pink} value="85 / 100" sub="SP" segments={20} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: 'Space Mono, monospace', fontSize: 12, letterSpacing: '0.14em' }}>
          <span style={{ color: aColors.mid }}>REGEN +0.4/S</span>
          <span style={{ color: aColors.warn }}>● HEAT 41%</span>
        </div>
      </div>

      {/* === BOTTOM-RIGHT: WEAPONS === */}
      <div style={{
        position: 'absolute', right: 32, bottom: 32, width: 420,
        background: 'rgba(14,15,21,0.78)', border: `1px solid ${aColors.line}`,
        padding: 18, backdropFilter: 'blur(4px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="mono upper" style={{ fontSize: 12, color: aColors.mid, letterSpacing: '0.18em' }}>▸ ARMAMENT</div>
          <div className="mono" style={{ fontSize: 11, color: aColors.mid, letterSpacing: '0.18em' }}>SLOT 1·2·3</div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <Weapon name="PULSE LASER" key1="LMB" ammoLabel="∞" cd={0} active />
          <Weapon name="HOMING MISSILE" key1="RMB" ammoLabel="06 / 12" cd={0.3} />
          <Weapon name="EMP BURST" key1="Q" ammoLabel="READY" cd={0.7} />
        </div>
      </div>

      {/* === RIGHT: SPEED / BOOST === */}
      <div style={{
        position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)',
        width: 76, height: 280,
        background: 'rgba(14,15,21,0.78)', border: `1px solid ${aColors.line}`,
        padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div className="mono upper" style={{ fontSize: 10, color: aColors.mid, letterSpacing: '0.2em' }}>SPD</div>
        <div className="orb" style={{ fontSize: 28, fontWeight: 800, color: aColors.fg, marginTop: 4 }}>184</div>
        <div className="mono" style={{ fontSize: 10, color: aColors.mid }}>m/s</div>
        <div style={{ flex: 1, marginTop: 12, width: 8, position: 'relative', background: aColors.line }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '74%', background: aColors.red }} />
          {/* boost ticks */}
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} style={{
              position: 'absolute', left: -4, right: -4, bottom: `${t * 100}%`,
              height: 1, background: aColors.mid,
            }} />
          ))}
        </div>
        <div className="mono upper" style={{ marginTop: 10, fontSize: 10, color: aColors.red, letterSpacing: '0.2em' }}>BOOST</div>
      </div>

      {/* === LEFT: TARGET INFO === */}
      <div style={{
        position: 'absolute', left: 32, top: 110, width: 280,
        border: `1px solid ${aColors.red}`,
        background: 'rgba(255,45,85,0.06)',
        padding: 14,
      }}>
        <div className="mono upper" style={{ fontSize: 11, color: aColors.red, letterSpacing: '0.2em' }}>▸ LOCKED TARGET</div>
        <div className="orb upper" style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>HOSTILE-K2 · TANK</div>
        <div style={{ marginTop: 12 }}>
          <Bar pct={0.40} color={aColors.red} value="HP" sub="" mini />
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'Space Mono, monospace', letterSpacing: '0.14em', color: aColors.mid }}>
          <span>DIST <span style={{ color: aColors.fg }}>412m</span></span>
          <span>ARMOR <span style={{ color: aColors.fg }}>HEAVY</span></span>
        </div>
      </div>

      {/* off-screen direction arrows */}
      <DirectionArrow x="6%" y="50%" rot={-90} label="2 ENEMIES" />
      <DirectionArrow x="50%" y="92%" rot={180} label="1 SNIPER" />

      <CornerFrame pad={16} color={aColors.red} thick={1} len={28} />
    </div>
  );
}

function Crosshair() {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
      width: 360, height: 360, pointerEvents: 'none',
    }}>
      {/* outer lock brackets */}
      <svg viewBox="0 0 360 360" width="360" height="360">
        <g stroke={aColors.red} strokeWidth="2" fill="none">
          {/* corners */}
          <path d="M40,40 L40,80 M40,40 L80,40" />
          <path d="M320,40 L320,80 M320,40 L280,40" />
          <path d="M40,320 L40,280 M40,320 L80,320" />
          <path d="M320,320 L320,280 M320,320 L280,320" />
          {/* crosshair */}
          <circle cx="180" cy="180" r="4" fill={aColors.red} />
          <path d="M180,140 L180,170 M180,210 L180,190 M140,180 L170,180 M210,180 L190,180" strokeWidth="1.5" />
          {/* ticks */}
          <path d="M180,30 L180,40 M180,330 L180,320 M30,180 L40,180 M330,180 L320,180" />
        </g>
        {/* lock label */}
        <text x="180" y="22" fontFamily="Space Mono" fontSize="10" fill={aColors.red} textAnchor="middle" letterSpacing="3">
          ◤ LOCKED ◥
        </text>
        <text x="180" y="350" fontFamily="Space Mono" fontSize="10" fill={aColors.red} textAnchor="middle" letterSpacing="2">
          412m  ·  HOSTILE-K2
        </text>
      </svg>
    </div>
  );
}

function Bar({ pct, color, value, sub, segments = 0, mini = false }) {
  const h = mini ? 8 : 14;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        position: 'relative', width: '100%', height: h, background: aColors.line,
      }}>
        {segments > 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 2 }}>
            {Array.from({ length: segments }).map((_, i) => (
              <div key={i} style={{
                flex: 1, background: i / segments < pct ? color : 'transparent',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, width: `${pct * 100}%`, background: color }} />
        )}
      </div>
      {!mini && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="orb" style={{ fontSize: 18, fontWeight: 700, color: aColors.fg }}>{value}</span>
          <span className="mono upper" style={{ fontSize: 11, color: aColors.mid, letterSpacing: '0.16em' }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function Weapon({ name, key1, ammoLabel, cd, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: active ? 'rgba(255,45,85,0.08)' : 'transparent',
      border: `1px solid ${active ? aColors.red : aColors.line}`,
    }}>
      <div className="orb" style={{
        background: active ? aColors.red : aColors.line, color: active ? aColors.bg : aColors.fg,
        padding: '6px 10px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
        minWidth: 44, textAlign: 'center',
      }}>{key1}</div>
      <div style={{ flex: 1 }}>
        <div className="raj upper" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.06em', color: aColors.fg }}>{name}</div>
        <div style={{ marginTop: 4, height: 4, background: aColors.line, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(1 - cd) * 100}%`, background: cd === 0 ? aColors.red : aColors.warn }} />
        </div>
      </div>
      <div className="mono" style={{ fontSize: 13, color: aColors.fg, letterSpacing: '0.08em', minWidth: 70, textAlign: 'right' }}>
        {ammoLabel}
      </div>
    </div>
  );
}

function Enemies() {
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <filter id="sub" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      {/* tank locked */}
      <g transform="translate(960, 540)" filter="url(#sub)">
        <polygon points="-60,-22 60,-22 80,0 60,22 -60,22 -80,0" fill="#1a1c28" stroke={aColors.red} strokeWidth="2" />
        <rect x="-20" y="-8" width="40" height="16" fill={aColors.red} opacity="0.6" />
      </g>
      {/* simple enemies */}
      <g transform="translate(720, 360)">
        <polygon points="0,-16 14,12 -14,12" fill="#262835" stroke="#3a3d4f" strokeWidth="1.5" />
      </g>
      <g transform="translate(1380, 420)">
        <polygon points="0,-14 12,10 -12,10" fill="#262835" stroke="#3a3d4f" strokeWidth="1.5" />
      </g>
      {/* sniper */}
      <g transform="translate(1240, 720) rotate(15)">
        <polygon points="0,-22 6,0 0,22 -6,0" fill="#1a1c28" stroke={aColors.pink} strokeWidth="1.5" />
      </g>
      {/* far one */}
      <g transform="translate(540, 580)">
        <polygon points="0,-10 8,7 -8,7" fill="#1e2030" stroke="#2a2c3c" strokeWidth="1" />
      </g>
    </svg>
  );
}

function DirectionArrow({ x, y, rot, label }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`,
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 0, height: 0,
        borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
        borderBottom: `22px solid ${aColors.red}`,
      }} />
      <div className="mono" style={{
        position: 'absolute', top: 28, left: '50%', transform: `translateX(-50%) rotate(${-rot}deg)`,
        fontSize: 11, color: aColors.red, letterSpacing: '0.18em', whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  );
}

/* ============== END SCREEN ============== */
function AEnd() {
  const stats = [
    ['SCORE FINAL',         '184,720', '+58,290 vs PB', true],
    ['VAGUES SURVÉCUES',    '07 / 10', 'PB: 08'],
    ['TEMPS DE SURVIE',     '06:42',   'PB: 04:12'],
    ['PRÉCISION',           '64.3%',   '247/384 tirs'],
    ['DÉGÂTS INFLIGÉS',     '12,840',  'reçus 2,180'],
    ['COMBO MAX',           '×24',     'PB: ×31'],
  ];
  const kills = [
    { type: 'FIGHTER', n: 38, c: aColors.fg },
    { type: 'SNIPER', n: 12, c: aColors.pink },
    { type: 'TANK',   n: 6,  c: aColors.warn },
    { type: 'BOSS',   n: 1,  c: aColors.red },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: aColors.bg, color: aColors.fg,
      position: 'relative', fontFamily: 'Rajdhani, sans-serif',
    }}>
      <div className="starfield" />
      <div className="nebula-a" />
      <CornerFrame pad={48} color={aColors.red} len={64} thick={2} />

      <div style={{ position: 'absolute', top: 110, left: 120 }}>
        <div className="kicker" style={{ color: aColors.red }}>▸ MISSION TERMINATED // SHIP DESTROYED</div>
        <h1 className="orb upper" style={{
          fontWeight: 900, fontSize: 200, lineHeight: 0.92, margin: '20px 0 0 0',
          letterSpacing: '-0.01em',
        }}>
          GAME<br/>
          <span style={{ color: aColors.red }}>OVER</span>
        </h1>
      </div>

      {/* stats grid */}
      <div style={{
        position: 'absolute', right: 120, top: 110, width: 940,
        background: 'rgba(14,15,21,0.78)', border: `1px solid ${aColors.line}`,
        padding: 36,
      }}>
        <div className="kicker" style={{ color: aColors.red }}>▸ AFTER-ACTION REPORT</div>
        <div style={{
          marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr',
          rowGap: 18, columnGap: 32,
        }}>
          {stats.map(([k, v, sub, hot]) => (
            <div key={k} style={{
              borderTop: `1px solid ${hot ? aColors.red : aColors.line}`, paddingTop: 12,
            }}>
              <div className="mono upper" style={{ fontSize: 12, color: aColors.mid, letterSpacing: '0.18em' }}>{k}</div>
              <div className="orb" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, marginTop: 4, color: hot ? aColors.red : aColors.fg }}>
                {v}
              </div>
              <div className="mono" style={{ fontSize: 13, color: hot ? aColors.pink : aColors.mid, letterSpacing: '0.12em', marginTop: 4 }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* kills breakdown */}
        <div style={{ marginTop: 30, paddingTop: 24, borderTop: `1px solid ${aColors.line}` }}>
          <div className="kicker" style={{ color: aColors.red }}>▸ HOSTILES NEUTRALIZED · 57</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {kills.map(k => (
              <div key={k.type} style={{
                border: `1px solid ${aColors.line}`, padding: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              }}>
                <EnemyIcon type={k.type} color={k.c} />
                <div className="mono upper" style={{ fontSize: 11, color: aColors.mid, letterSpacing: '0.18em', marginTop: 8 }}>{k.type}</div>
                <div className="orb" style={{ fontSize: 36, fontWeight: 800, color: k.c, lineHeight: 1, marginTop: 2 }}>×{k.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: actions */}
      <div style={{
        position: 'absolute', left: 120, bottom: 110, display: 'flex', gap: 16, alignItems: 'center',
      }}>
        <button style={{
          height: 80, padding: '0 48px',
          background: aColors.red, color: aColors.bg, border: 'none',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 26,
          letterSpacing: '0.24em', cursor: 'pointer',
        }}>↻  RETRY MISSION</button>
        <button style={{
          height: 80, padding: '0 36px',
          background: 'transparent', color: aColors.fg,
          border: `1px solid ${aColors.line}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18,
          letterSpacing: '0.18em', cursor: 'pointer',
        }}>MAIN MENU</button>
      </div>

      <div style={{
        position: 'absolute', left: 120, bottom: 60,
        fontFamily: 'Space Mono, monospace', fontSize: 12, color: aColors.mid,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        ▸ NEW PERSONAL RECORD ON 4 OF 6 METRICS · UPLOAD COMPLETE
      </div>
    </div>
  );
}

function EnemyIcon({ type, color }) {
  const size = 28;
  switch (type) {
    case 'FIGHTER':
      return <svg width={size} height={size} viewBox="-20 -20 40 40"><polygon points="0,-14 12,12 -12,12" fill="none" stroke={color} strokeWidth="2"/></svg>;
    case 'SNIPER':
      return <svg width={size} height={size} viewBox="-20 -20 40 40"><polygon points="0,-16 6,0 0,16 -6,0" fill="none" stroke={color} strokeWidth="2"/></svg>;
    case 'TANK':
      return <svg width={size} height={size} viewBox="-20 -20 40 40"><polygon points="-14,-6 -8,-12 8,-12 14,-6 14,6 8,12 -8,12 -14,6" fill="none" stroke={color} strokeWidth="2"/></svg>;
    case 'BOSS':
      return <svg width={size} height={size} viewBox="-20 -20 40 40"><path d="M-16,0 L0,-16 L16,0 L0,16 Z M-8,0 L0,-8 L8,0 L0,8 Z" fill="none" stroke={color} strokeWidth="2"/></svg>;
  }
}

window.AStart = AStart;
window.AHud = AHud;
window.AEnd = AEnd;
window.aColors = aColors;
window.EnemyIcon = EnemyIcon;
window.CornerFrame = CornerFrame;
