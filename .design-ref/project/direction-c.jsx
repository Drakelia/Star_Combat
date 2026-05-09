/* global React */

/* =========================================================
   DIRECTION C — REACTOR
   Brutaliste · arcade · cream/red blocks · poster vibe
   ========================================================= */

const cColors = {
  bg: '#efe9dd',     // cream paper
  ink: '#15110d',    // near-black
  red: '#ff1f3d',
  cream: '#f5efe1',
  paper: '#e6dec9',
  mid: '#7a7166',
  dark: '#0a0a0d',
};

/* ============== START SCREEN ============== */
function CStart() {
  const diffs = [
    { name: 'CADET',    sub: 'EASY' },
    { name: 'PILOT',    sub: 'STANDARD', hot: true },
    { name: 'ACE',      sub: 'HARD' },
    { name: 'OVERLORD', sub: 'BRUTAL' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: cColors.bg, color: cColors.ink,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      {/* paper grain placeholder */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }} />

      {/* Top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: cColors.ink, color: cColors.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', fontFamily: 'Space Mono, monospace', fontSize: 12,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        <span>★ STAR COMBAT ── ARCADE EDITION ── 2026</span>
        <span>NO. 04 / VOL. I</span>
        <span style={{ color: cColors.red }}>● PRESS START TO PLAY</span>
      </div>

      {/* === Massive title block === */}
      <div style={{ position: 'absolute', top: 100, left: 80 }}>
        <div className="orb" style={{
          fontSize: 380, fontWeight: 900, lineHeight: 0.78, letterSpacing: '-0.03em',
          color: cColors.ink,
        }}>
          STAR
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 32, marginTop: -20,
        }}>
          <div className="orb" style={{
            fontSize: 380, fontWeight: 900, lineHeight: 0.78, letterSpacing: '-0.03em',
            color: cColors.red,
          }}>
            COMBAT
          </div>
          {/* sticker tag */}
          <div style={{
            background: cColors.ink, color: cColors.cream,
            padding: '12px 18px', transform: 'rotate(-4deg)',
            fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: 18,
            letterSpacing: '0.2em', alignSelf: 'flex-start',
            border: `2px solid ${cColors.ink}`,
          }}>
            ★ NEW ★
          </div>
        </div>

        <div style={{
          marginTop: 12, fontFamily: 'Space Mono, monospace', fontSize: 18,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: cColors.mid,
        }}>
          ////  10 WAVES  //  4 ENEMY TYPES  //  1 LIFE  ////
        </div>
      </div>

      {/* === RIGHT column: difficulty + start === */}
      <div style={{
        position: 'absolute', right: 80, top: 100, width: 480,
      }}>
        <div style={{
          background: cColors.ink, color: cColors.cream, padding: '14px 20px',
          fontFamily: 'Space Mono, monospace', fontSize: 12, letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          ▌SELECT DIFFICULTY
        </div>
        <div style={{
          border: `2px solid ${cColors.ink}`, borderTop: 'none',
        }}>
          {diffs.map((d, i) => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: i < diffs.length - 1 ? `1px solid ${cColors.ink}` : 'none',
              background: d.hot ? cColors.red : 'transparent',
              color: d.hot ? cColors.cream : cColors.ink,
              cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 22, height: 22, border: `3px solid currentColor`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d.hot && <div style={{ width: 10, height: 10, background: cColors.cream }} />}
                </div>
                <div className="orb upper" style={{
                  fontSize: 28, fontWeight: 900, letterSpacing: '0.04em',
                }}>{d.name}</div>
              </div>
              <div className="mono upper" style={{
                fontSize: 13, letterSpacing: '0.24em',
                background: d.hot ? cColors.cream : cColors.ink,
                color: d.hot ? cColors.red : cColors.cream,
                padding: '4px 10px',
              }}>{d.sub}</div>
            </div>
          ))}
        </div>

        {/* START BUTTON */}
        <button style={{
          marginTop: 24, width: '100%', height: 110,
          background: cColors.red, color: cColors.cream, border: `4px solid ${cColors.ink}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 44,
          letterSpacing: '0.2em', cursor: 'pointer',
          boxShadow: `8px 8px 0 ${cColors.ink}`,
          textShadow: `2px 2px 0 ${cColors.ink}`,
        }}>
          ▶ START
        </button>
      </div>

      {/* === BOTTOM: controls + audio === */}
      <div style={{
        position: 'absolute', left: 80, right: 80, bottom: 80,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 40,
      }}>
        {/* Controls */}
        <div style={{ flex: 1, maxWidth: 880 }}>
          <div className="orb upper" style={{
            fontSize: 18, fontWeight: 800, letterSpacing: '0.3em',
            background: cColors.ink, color: cColors.cream,
            display: 'inline-block', padding: '6px 14px', marginBottom: 14,
          }}>
            ▌CONTROLS
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            {[
              ['MOVE',    'WASD'],
              ['BOOST',   'SHIFT'],
              ['FIRE',    'LMB'],
              ['MISSILE', 'RMB'],
              ['LOCK',    'TAB'],
              ['EMP',     'Q'],
              ['SWITCH',  '1·2·3'],
              ['PAUSE',   'ESC'],
            ].map(([k, v]) => (
              <div key={k} style={{
                background: cColors.cream, border: `2px solid ${cColors.ink}`,
                padding: '8px 14px',
              }}>
                <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.2em', color: cColors.mid }}>{k}</div>
                <div className="orb" style={{ fontSize: 22, fontWeight: 800, color: cColors.ink, letterSpacing: '0.06em' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* High score block */}
        <div style={{
          background: cColors.ink, color: cColors.cream, padding: 20, minWidth: 320,
          border: `4px solid ${cColors.ink}`,
        }}>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: cColors.red }}>
            ▌HIGH SCORE
          </div>
          <div className="orb" style={{
            fontSize: 56, fontWeight: 900, lineHeight: 1, marginTop: 6,
          }}>247,830</div>
          <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', marginTop: 8, color: cColors.paper }}>
            WAVE 08 · 04:12 · ×31
          </div>
          {/* audio */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: cColors.paper }}>SFX</span>
            <div style={{ flex: 1, height: 8, background: cColors.cream, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', background: cColors.red }} />
            </div>
            <span className="mono" style={{ fontSize: 12, color: cColors.cream, minWidth: 22 }}>72</span>
          </div>
        </div>
      </div>

      {/* tape strip */}
      <div style={{
        position: 'absolute', left: -40, top: 540, width: 280, height: 40,
        background: cColors.red, color: cColors.cream,
        fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700,
        letterSpacing: '0.4em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(-90deg)', transformOrigin: 'left top',
      }}>
        ▼ INSERT COIN ▼ INSERT COIN ▼
      </div>
    </div>
  );
}

/* ============== HUD ============== */
function CHud() {
  return (
    <div style={{
      width: '100%', height: '100%', background: cColors.dark, color: cColors.cream,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div className="starfield" />
      {/* red sun glow */}
      <div style={{
        position: 'absolute', right: 200, top: 100, width: 380, height: 380,
        borderRadius: '50%', background: cColors.dark,
        boxShadow: `inset 0 0 0 2px ${cColors.red}40, 0 0 200px ${cColors.red}30`,
      }} />

      <CEnemies />
      <CCrosshair />

      {/* === TOP-LEFT: WAVE block === */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        background: cColors.cream, color: cColors.ink,
        padding: '20px 28px',
      }}>
        <div className="mono upper" style={{ fontSize: 12, letterSpacing: '0.3em', color: cColors.red, fontWeight: 700 }}>
          ▌WAVE
        </div>
        <div className="orb" style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9, marginTop: 4 }}>
          03<span style={{ color: cColors.mid }}>/10</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              width: 18, height: 8,
              background: i < 2 ? cColors.ink : i === 2 ? cColors.red : cColors.paper,
            }} />
          ))}
        </div>
      </div>

      {/* === TOP-RIGHT: SCORE === */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        background: cColors.red, color: cColors.cream,
        padding: '20px 28px', textAlign: 'right',
      }}>
        <div className="mono upper" style={{ fontSize: 12, letterSpacing: '0.3em', fontWeight: 700 }}>
          ▌SCORE
        </div>
        <div className="orb" style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.9, marginTop: 4 }}>
          128,440
        </div>
        <div className="mono upper" style={{ fontSize: 13, letterSpacing: '0.22em', marginTop: 8 }}>
          47 KILLS · ×7 COMBO
        </div>
      </div>

      {/* === Boss alert === */}
      <div style={{
        position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
        background: cColors.red, color: cColors.cream,
        padding: '10px 32px', border: `3px solid ${cColors.cream}`,
        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 22,
        letterSpacing: '0.4em',
      }}>
        ▲ BOSS — WAVE 05 ▲
      </div>

      {/* === COMBO floating === */}
      <div style={{
        position: 'absolute', left: '64%', top: 380, pointerEvents: 'none',
      }}>
        <div className="orb" style={{
          fontSize: 140, fontWeight: 900, color: cColors.red,
          textShadow: `6px 6px 0 ${cColors.cream}`, lineHeight: 0.85,
          WebkitTextStroke: `2px ${cColors.cream}`,
        }}>×7</div>
        <div className="mono upper" style={{
          fontSize: 16, letterSpacing: '0.4em', color: cColors.cream, marginTop: -4,
          background: cColors.ink, padding: '4px 10px', display: 'inline-block',
        }}>COMBO</div>
      </div>

      {/* === BOTTOM-LEFT: HEALTH/SHIELD blocks === */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        background: cColors.cream, color: cColors.ink, padding: 20,
        display: 'flex', gap: 16,
      }}>
        <CStatBlock label="HULL" value="62" suffix="/100" pct={0.62} color={cColors.red} />
        <CStatBlock label="SHIELD" value="85" suffix="/100" pct={0.85} color={cColors.ink} />
      </div>

      {/* === BOTTOM-CENTER: speed === */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        background: cColors.ink, color: cColors.cream, padding: '14px 24px',
        border: `3px solid ${cColors.cream}`, borderBottom: 'none',
        textAlign: 'center', minWidth: 240,
      }}>
        <div className="orb" style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>
          184<span style={{ fontSize: 18, color: cColors.red, marginLeft: 6 }}>M/S</span>
        </div>
        <div className="mono upper" style={{ fontSize: 12, letterSpacing: '0.3em', color: cColors.red, marginTop: 4 }}>
          BOOST 74%
        </div>
      </div>

      {/* === BOTTOM-RIGHT: WEAPONS === */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        background: cColors.cream, color: cColors.ink, padding: 20,
        display: 'flex', gap: 12,
      }}>
        <CWeapon k="LMB" name="LASER" ammo="∞" hot />
        <CWeapon k="RMB" name="MISSILE" ammo="06/12" />
        <CWeapon k="Q"   name="EMP" ammo="READY" />
      </div>

      {/* off-screen arrow */}
      <div style={{
        position: 'absolute', left: 80, top: '52%', transform: 'translateY(-50%)',
      }}>
        <div style={{
          background: cColors.red, color: cColors.cream,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          border: `3px solid ${cColors.cream}`,
        }}>
          <span style={{ fontSize: 24 }}>◀</span>
          <div className="mono upper" style={{ fontSize: 12, letterSpacing: '0.24em', fontWeight: 700 }}>2 ENEMIES</div>
        </div>
      </div>

      {/* lock-on label */}
      <div style={{
        position: 'absolute', left: '50%', top: '38%', transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: cColors.red, color: cColors.cream,
          padding: '4px 10px', fontFamily: 'Space Mono, monospace',
          fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 700,
        }}>
          ▌LOCKED · TANK · 412M
        </div>
      </div>
    </div>
  );
}

function CStatBlock({ label, value, suffix, pct, color }) {
  return (
    <div style={{ minWidth: 240 }}>
      <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: cColors.mid, fontWeight: 700 }}>
        ▌{label}
      </div>
      <div className="orb" style={{ fontSize: 56, fontWeight: 900, lineHeight: 0.9, marginTop: 4, color: cColors.ink }}>
        {value}<span style={{ fontSize: 24, color: cColors.mid }}>{suffix}</span>
      </div>
      <div style={{ marginTop: 10, height: 12, background: cColors.paper, position: 'relative', border: `1px solid ${cColors.ink}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct*100}%`, background: color }} />
      </div>
    </div>
  );
}

function CWeapon({ k, name, ammo, hot }) {
  return (
    <div style={{
      minWidth: 130, textAlign: 'center',
      background: hot ? cColors.red : 'transparent',
      color: hot ? cColors.cream : cColors.ink,
      border: `2px solid ${cColors.ink}`,
      padding: '10px 14px',
    }}>
      <div className="orb" style={{
        background: hot ? cColors.cream : cColors.ink,
        color: hot ? cColors.red : cColors.cream,
        padding: '4px 0', fontWeight: 800, fontSize: 14,
        letterSpacing: '0.16em',
      }}>{k}</div>
      <div className="orb upper" style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.1em', marginTop: 8 }}>{name}</div>
      <div className="mono" style={{ fontSize: 14, letterSpacing: '0.16em', marginTop: 4 }}>{ammo}</div>
    </div>
  );
}

function CCrosshair() {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none',
    }}>
      <svg width="280" height="280" viewBox="0 0 280 280">
        <g stroke={cColors.cream} strokeWidth="3" fill="none">
          <path d="M40,40 L40,80 M40,40 L80,40" />
          <path d="M240,40 L240,80 M240,40 L200,40" />
          <path d="M40,240 L40,200 M40,240 L80,240" />
          <path d="M240,240 L240,200 M240,240 L200,240" />
        </g>
        <g stroke={cColors.red} strokeWidth="2.5" fill="none">
          <circle cx="140" cy="140" r="6" fill={cColors.red} />
          <line x1="140" y1="110" x2="140" y2="125"/>
          <line x1="140" y1="155" x2="140" y2="170"/>
          <line x1="110" y1="140" x2="125" y2="140"/>
          <line x1="155" y1="140" x2="170" y2="140"/>
        </g>
      </svg>
    </div>
  );
}

function CEnemies() {
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* Tank center (locked) */}
      <g transform="translate(960, 540)">
        <polygon points="-50,-18 50,-18 70,0 50,18 -50,18 -70,0" fill={cColors.dark} stroke={cColors.cream} strokeWidth="2" />
        <rect x="-16" y="-6" width="32" height="12" fill={cColors.red} />
      </g>
      <g transform="translate(700, 380)">
        <polygon points="0,-14 12,10 -12,10" fill={cColors.dark} stroke={cColors.cream} strokeWidth="1.5" />
      </g>
      <g transform="translate(1300, 420)">
        <polygon points="0,-12 10,8 -10,8" fill={cColors.dark} stroke={cColors.cream} strokeWidth="1.5" />
      </g>
      <g transform="translate(1240, 700) rotate(20)">
        <polygon points="0,-22 6,0 0,22 -6,0" fill={cColors.dark} stroke={cColors.red} strokeWidth="1.5" />
      </g>
      <g transform="translate(560, 600)">
        <polygon points="0,-10 8,7 -8,7" fill={cColors.dark} stroke={cColors.cream} strokeWidth="1" opacity="0.6" />
      </g>
    </svg>
  );
}

/* ============== END SCREEN ============== */
function CEnd() {
  return (
    <div style={{
      width: '100%', height: '100%', background: cColors.bg, color: cColors.ink,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }} />

      {/* Top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: cColors.ink, color: cColors.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', fontFamily: 'Space Mono, monospace', fontSize: 12,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        <span>★ AFTER ACTION REPORT ──── 06:42 RUNTIME</span>
        <span style={{ color: cColors.red }}>● SHIP DESTROYED</span>
      </div>

      {/* HUGE TITLE */}
      <div style={{ position: 'absolute', top: 90, left: 80, display: 'flex', alignItems: 'baseline', gap: 32 }}>
        <div className="orb" style={{
          fontSize: 320, fontWeight: 900, lineHeight: 0.78, letterSpacing: '-0.03em',
          color: cColors.red,
        }}>
          GAME
        </div>
        <div style={{
          background: cColors.ink, color: cColors.cream, padding: '10px 18px',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: 18,
          letterSpacing: '0.3em', alignSelf: 'flex-start', transform: 'rotate(-3deg)',
        }}>
          WAVE 07 · KO
        </div>
      </div>
      <div className="orb" style={{
        position: 'absolute', top: 312, left: 80,
        fontSize: 320, fontWeight: 900, lineHeight: 0.78, letterSpacing: '-0.03em',
        color: cColors.ink,
      }}>
        OVER<span style={{ color: cColors.red }}>.</span>
      </div>

      {/* Stats grid (right) */}
      <div style={{
        position: 'absolute', right: 80, top: 90, width: 720,
      }}>
        <div style={{
          background: cColors.ink, color: cColors.cream, padding: '14px 20px',
          fontFamily: 'Space Mono, monospace', fontSize: 12, letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          ▌STATS · RUN #047
        </div>
        <div style={{
          border: `3px solid ${cColors.ink}`, borderTop: 'none',
          background: cColors.cream,
        }}>
          {[
            ['SCORE FINAL',     '184,720', '+58,290 PB', true],
            ['VAGUES',          '07 / 10', 'PB 08'],
            ['TEMPS',           '06:42',   'PB 04:12 — RECORD'],
            ['PRÉCISION',       '64.3%',   '247 / 384'],
            ['DÉGÂTS INFLIGÉS', '12,840',  ''],
            ['DÉGÂTS REÇUS',    '2,180',   ''],
            ['COMBO MAX',       '×24',     'PB ×31'],
          ].map(([k, v, sub, hot], i) => (
            <div key={k} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < 6 ? `1px solid ${cColors.ink}` : 'none',
              background: hot ? cColors.red : 'transparent',
              color: hot ? cColors.cream : cColors.ink,
            }}>
              <div className="mono upper" style={{ fontSize: 12, letterSpacing: '0.24em', fontWeight: 700, opacity: hot ? 1 : 0.7 }}>{k}</div>
              <div className="orb" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em' }}>{v}</div>
              <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', minWidth: 180, textAlign: 'right', opacity: hot ? 1 : 0.7 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kills row */}
      <div style={{
        position: 'absolute', left: 80, bottom: 240, display: 'flex', gap: 0,
        border: `3px solid ${cColors.ink}`,
      }}>
        <div style={{
          background: cColors.ink, color: cColors.cream, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: cColors.red }}>HOSTILES</div>
          <div className="orb" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>57</div>
        </div>
        {[
          { t: 'FIGHTER', n: 38 },
          { t: 'SNIPER', n: 12 },
          { t: 'TANK',   n: 6  },
          { t: 'BOSS',   n: 1  },
        ].map((k, i) => (
          <div key={k.t} style={{
            padding: '20px 28px', minWidth: 160,
            borderLeft: `1px solid ${cColors.ink}`,
            background: cColors.cream,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
          }}>
            <EnemyIcon type={k.t} color={cColors.ink} />
            <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.24em', color: cColors.mid, fontWeight: 700, marginTop: 6 }}>{k.t}</div>
            <div className="orb" style={{ fontSize: 36, fontWeight: 900, color: cColors.ink, lineHeight: 1 }}>×{k.n}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ position: 'absolute', left: 80, bottom: 80, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <button style={{
          background: cColors.red, color: cColors.cream, border: `4px solid ${cColors.ink}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 36,
          letterSpacing: '0.2em', cursor: 'pointer',
          padding: '24px 56px', boxShadow: `8px 8px 0 ${cColors.ink}`,
          textShadow: `2px 2px 0 ${cColors.ink}`,
        }}>
          ↻ RETRY
        </button>
        <button style={{
          background: cColors.cream, color: cColors.ink, border: `4px solid ${cColors.ink}`,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: 22,
          letterSpacing: '0.2em', cursor: 'pointer',
          padding: '24px 36px',
        }}>
          MAIN MENU
        </button>
      </div>

      {/* tape strip */}
      <div style={{
        position: 'absolute', right: -40, top: 720, width: 280, height: 40,
        background: cColors.ink, color: cColors.cream,
        fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700,
        letterSpacing: '0.4em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(90deg)', transformOrigin: 'right top',
      }}>
        ▼ NEW RECORD ▼ +1 ★
      </div>
    </div>
  );
}

window.CStart = CStart;
window.CHud = CHud;
window.CEnd = CEnd;
window.cColors = cColors;
