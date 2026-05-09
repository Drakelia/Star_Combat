/* global React */

/* =========================================================
   DIRECTION B — PULSE
   Minimal · cinétique · ultra clean · neon pink #ff2a6d
   ========================================================= */

const bColors = {
  bg: '#000000',
  fg: '#ffffff',
  mid: '#5a5a64',
  pink: '#ff2a6d',
  glow: '#ff5b94',
  faint: '#15151a',
};

/* ============== START SCREEN ============== */
function BStart() {
  const diffs = [
    { name: 'CADET',    sub: '× 0.5',  hot: false },
    { name: 'PILOT',    sub: '× 1.0',  hot: true },
    { name: 'ACE',      sub: '× 1.6',  hot: false },
    { name: 'OVERLORD', sub: '× 2.4',  hot: false },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: bColors.bg, color: bColors.fg,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div className="starfield" style={{ opacity: 0.6 }} />
      <div className="nebula-b" />

      {/* Top thin line + label */}
      <div style={{
        position: 'absolute', top: 56, left: 80, right: 80,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Space Mono, monospace', fontSize: 12,
        letterSpacing: '0.32em', textTransform: 'uppercase', color: bColors.mid,
      }}>
        <span>STAR / COMBAT</span>
        <span style={{ color: bColors.pink }}>● READY</span>
        <span>2026 — V0.4.1</span>
      </div>
      <div style={{ position: 'absolute', top: 84, left: 80, right: 80, height: 1, background: bColors.faint }} />

      {/* Center title block */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        <div className="mono upper" style={{
          fontSize: 14, letterSpacing: '0.5em', color: bColors.pink, marginBottom: 24,
        }}>
          ── ARCADE COMBAT — INFINITE WAVES ──
        </div>

        <h1 className="orb" style={{
          fontWeight: 900, fontSize: 280, lineHeight: 0.85, margin: 0,
          letterSpacing: '-0.04em', color: bColors.fg,
        }}>
          STAR<span style={{ color: bColors.pink }}>·</span>COMBAT
        </h1>

        <div className="raj" style={{
          fontSize: 24, color: bColors.mid, marginTop: 28,
          letterSpacing: '0.06em', maxWidth: 760,
        }}>
          Un seul vaisseau. Dix vagues. Aucune extraction.
        </div>

        {/* Difficulty inline */}
        <div style={{
          marginTop: 64, display: 'flex', gap: 0,
          border: `1px solid ${bColors.faint}`,
        }}>
          {diffs.map((d, i) => (
            <div key={d.name} style={{
              padding: '20px 36px',
              borderRight: i < diffs.length - 1 ? `1px solid ${bColors.faint}` : 'none',
              background: d.hot ? bColors.pink : 'transparent',
              color: d.hot ? bColors.bg : bColors.fg,
              textAlign: 'center', cursor: 'pointer',
            }}>
              <div className="orb upper" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.1em' }}>{d.name}</div>
              <div className="mono" style={{ fontSize: 12, opacity: 0.6, marginTop: 4, letterSpacing: '0.16em' }}>{d.sub}</div>
            </div>
          ))}
        </div>

        {/* Launch button */}
        <button style={{
          marginTop: 56,
          background: 'transparent', border: `2px solid ${bColors.pink}`,
          color: bColors.pink,
          fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
          fontSize: 32, letterSpacing: '0.32em',
          padding: '24px 80px', cursor: 'pointer', position: 'relative',
        }}>
          ▶  LAUNCH
        </button>
        <div className="mono upper" style={{
          marginTop: 18, fontSize: 12, color: bColors.mid, letterSpacing: '0.32em',
        }}>
          PRESS  [ ENTER ]
        </div>
      </div>

      {/* Left bottom: controls */}
      <div style={{ position: 'absolute', left: 80, bottom: 80, fontSize: 16 }}>
        <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: bColors.pink, marginBottom: 18 }}>
          /// CONTROLS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 18, rowGap: 10 }}>
          {[
            ['MOVE',     'W A S D'],
            ['BOOST',    'SHIFT'],
            ['FIRE',     'LMB'],
            ['MISSILE',  'RMB'],
            ['LOCK-ON',  'TAB'],
            ['PAUSE',    'ESC'],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="raj upper" style={{ color: bColors.mid, letterSpacing: '0.14em' }}>{k}</span>
              <span className="orb" style={{ color: bColors.fg, fontWeight: 700, letterSpacing: '0.12em' }}>{v}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right bottom: best run + audio */}
      <div style={{ position: 'absolute', right: 80, bottom: 80, textAlign: 'right', minWidth: 320 }}>
        <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: bColors.pink, marginBottom: 18 }}>
          /// PERSONAL BEST
        </div>
        <div className="orb" style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>247,830</div>
        <div className="mono" style={{ fontSize: 13, color: bColors.mid, letterSpacing: '0.18em', marginTop: 6 }}>
          WAVE 08 · 04:12 · COMBO ×31
        </div>

        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <span className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: bColors.mid }}>SFX</span>
          <div style={{ width: 140, height: 2, background: bColors.faint, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', background: bColors.pink }} />
            <div style={{ position: 'absolute', left: '72%', top: -5, width: 12, height: 12, background: bColors.pink, transform: 'translateX(-6px)' }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: bColors.fg, minWidth: 24 }}>72</span>
        </div>
      </div>
    </div>
  );
}

/* ============== HUD ============== */
function BHud() {
  return (
    <div style={{
      width: '100%', height: '100%', background: bColors.bg, color: bColors.fg,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div className="starfield" style={{ opacity: 0.5 }} />
      <div className="nebula-b" />

      {/* Distant planet */}
      <div style={{
        position: 'absolute', left: 200, top: -200, width: 600, height: 600,
        borderRadius: '50%', background: bColors.bg,
        boxShadow: `inset -80px -80px 200px rgba(255,42,109,0.15), 0 0 1px ${bColors.faint}`,
        border: `1px solid ${bColors.faint}`,
      }} />

      {/* Enemies */}
      <BEnemies />

      {/* TOP — wave + score */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', padding: '0 80px',
      }}>
        <div>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>
            WAVE
          </div>
          <div className="orb" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            03 <span style={{ color: bColors.mid, fontWeight: 400 }}>/ 10</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                width: 24, height: 2,
                background: i < 2 ? bColors.fg : i === 2 ? bColors.pink : bColors.faint,
              }} />
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          {/* Boss alert */}
          <div className="orb upper" style={{
            fontSize: 14, letterSpacing: '0.5em', color: bColors.pink,
            border: `1px solid ${bColors.pink}`, padding: '8px 24px',
          }}>
            BOSS — WAVE 05
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>
            SCORE
          </div>
          <div className="orb" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>
            128,440
          </div>
          <div className="mono" style={{ fontSize: 13, letterSpacing: '0.18em', color: bColors.mid, marginTop: 8 }}>
            47 KILLS
          </div>
        </div>
      </div>

      {/* CENTER crosshair (very minimal) */}
      <BCrosshair />

      {/* COMBO floating */}
      <div style={{
        position: 'absolute', left: '58%', top: 380, pointerEvents: 'none',
      }}>
        <div className="orb" style={{
          fontSize: 120, fontWeight: 900, color: bColors.pink, lineHeight: 0.9,
          textShadow: `0 0 60px ${bColors.glow}80`,
        }}>×7</div>
        <div className="mono upper" style={{ fontSize: 13, letterSpacing: '0.4em', color: bColors.glow }}>
          C O M B O
        </div>
      </div>

      {/* BOTTOM — health/shield arcs */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '0 80px',
      }}>
        {/* Hull */}
        <div style={{ flex: 1, maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>HULL</span>
            <span className="orb" style={{ fontSize: 18, fontWeight: 700 }}>62 / 100</span>
          </div>
          <div style={{ height: 4, background: bColors.faint, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%', background: bColors.pink }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
            <span className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>SHIELD</span>
            <span className="orb" style={{ fontSize: 18, fontWeight: 700 }}>85 / 100</span>
          </div>
          <div style={{ height: 4, background: bColors.faint, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '85%', background: bColors.fg }} />
          </div>
        </div>

        {/* Center: speed */}
        <div style={{ textAlign: 'center', flex: 0 }}>
          <div className="orb" style={{ fontSize: 56, fontWeight: 900, lineHeight: 1 }}>184</div>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid, marginTop: 4 }}>M/S · BOOST 74%</div>
          <div style={{ width: 200, height: 2, background: bColors.faint, position: 'relative', marginTop: 10, marginInline: 'auto' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '74%', background: bColors.pink }} />
          </div>
        </div>

        {/* Weapons minimal */}
        <div style={{ flex: 1, maxWidth: 480, textAlign: 'right' }}>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid, marginBottom: 12 }}>ARMAMENT</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
            <BWeapon label="LASER" sub="∞" hot ammo={1} />
            <BWeapon label="MISSILE" sub="06/12" ammo={0.5} />
            <BWeapon label="EMP" sub="READY" ammo={1} />
          </div>
        </div>
      </div>

      {/* off-screen arrow */}
      <div style={{
        position: 'absolute', left: 100, top: '50%', transform: 'translate(-50%,-50%)',
      }}>
        <svg width="40" height="60" viewBox="0 0 40 60">
          <polygon points="0,30 30,10 30,50" fill={bColors.pink} />
        </svg>
        <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.3em', color: bColors.pink, marginTop: 6, textAlign: 'center' }}>
          2 HOSTILES
        </div>
      </div>
    </div>
  );
}

function BCrosshair() {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none',
    }}>
      <svg width="240" height="240" viewBox="0 0 240 240">
        {/* outer brackets */}
        <g stroke={bColors.pink} strokeWidth="1.5" fill="none">
          <path d="M30,30 L30,60 M30,30 L60,30" />
          <path d="M210,30 L210,60 M210,30 L180,30" />
          <path d="M30,210 L30,180 M30,210 L60,210" />
          <path d="M210,210 L210,180 M210,210 L180,210" />
        </g>
        {/* center dot */}
        <circle cx="120" cy="120" r="2" fill={bColors.pink} />
        <line x1="120" y1="100" x2="120" y2="115" stroke={bColors.pink} strokeWidth="1.5"/>
        <line x1="120" y1="125" x2="120" y2="140" stroke={bColors.pink} strokeWidth="1.5"/>
        <line x1="100" y1="120" x2="115" y2="120" stroke={bColors.pink} strokeWidth="1.5"/>
        <line x1="125" y1="120" x2="140" y2="120" stroke={bColors.pink} strokeWidth="1.5"/>
        <text x="120" y="20" fontFamily="Space Mono" fontSize="10" fill={bColors.pink} textAnchor="middle" letterSpacing="3">LOCKED · 412m</text>
      </svg>
    </div>
  );
}

function BWeapon({ label, sub, ammo, hot }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 100 }}>
      <div className="orb upper" style={{
        fontSize: 14, fontWeight: 700, letterSpacing: '0.18em',
        color: hot ? bColors.pink : bColors.fg,
      }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, color: bColors.fg, letterSpacing: '0.14em', marginTop: 6 }}>{sub}</div>
      <div style={{
        width: '100%', height: 2, marginTop: 8, background: bColors.faint, position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ammo*100}%`, background: hot ? bColors.pink : bColors.fg }} />
      </div>
    </div>
  );
}

function BEnemies() {
  return (
    <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* Tank center (locked) */}
      <g transform="translate(960, 540)">
        <polygon points="-50,-18 50,-18 70,0 50,18 -50,18 -70,0" fill="#0a0a0e" stroke={bColors.pink} strokeWidth="1.5" />
      </g>
      <g transform="translate(700, 380)">
        <polygon points="0,-14 12,10 -12,10" fill="#0a0a0e" stroke={bColors.fg} strokeWidth="1" opacity="0.7" />
      </g>
      <g transform="translate(1300, 420)">
        <polygon points="0,-12 10,8 -10,8" fill="#0a0a0e" stroke={bColors.fg} strokeWidth="1" opacity="0.6" />
      </g>
      <g transform="translate(1240, 700) rotate(20)">
        <polygon points="0,-22 6,0 0,22 -6,0" fill="#0a0a0e" stroke={bColors.glow} strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/* ============== END SCREEN ============== */
function BEnd() {
  const stats = [
    ['SCORE',          '184,720',  '+58,290 PB', true],
    ['WAVES',          '07 / 10',  ''],
    ['TIME',           '06:42',    ''],
    ['ACCURACY',       '64.3%',    '247/384'],
    ['DAMAGE OUT',     '12,840',   ''],
    ['DAMAGE IN',      '2,180',    ''],
    ['MAX COMBO',      '×24',      ''],
    ['KILLS',          '57',       ''],
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: bColors.bg, color: bColors.fg,
      fontFamily: 'Rajdhani, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div className="starfield" style={{ opacity: 0.4 }} />
      <div className="nebula-b" />

      {/* Verdict */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="mono upper" style={{ fontSize: 14, letterSpacing: '0.5em', color: bColors.pink, marginBottom: 24 }}>
          ── SHIP DESTROYED ──
        </div>
        <h1 className="orb" style={{
          fontWeight: 900, fontSize: 240, lineHeight: 0.85, margin: 0,
          letterSpacing: '-0.04em', color: bColors.fg,
        }}>
          DEFEAT<span style={{ color: bColors.pink }}>.</span>
        </h1>
        <div className="raj" style={{ fontSize: 22, color: bColors.mid, marginTop: 12, letterSpacing: '0.1em' }}>
          Tu as tenu jusqu'à la vague 07. La flotte se souviendra.
        </div>

        {/* Stats grid */}
        <div style={{
          marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 0, width: 1280, border: `1px solid ${bColors.faint}`,
        }}>
          {stats.map(([k, v, sub, hot], i) => (
            <div key={k} style={{
              padding: '28px 28px',
              borderRight: (i + 1) % 4 !== 0 ? `1px solid ${bColors.faint}` : 'none',
              borderBottom: i < 4 ? `1px solid ${bColors.faint}` : 'none',
            }}>
              <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>{k}</div>
              <div className="orb" style={{
                fontSize: 48, fontWeight: 900, lineHeight: 1, marginTop: 8,
                color: hot ? bColors.pink : bColors.fg,
              }}>{v}</div>
              {sub && <div className="mono" style={{ fontSize: 12, color: bColors.glow, letterSpacing: '0.16em', marginTop: 6 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* kill breakdown row */}
        <div style={{
          marginTop: 32, width: 1280, padding: '24px 32px',
          border: `1px solid ${bColors.faint}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div className="mono upper" style={{ fontSize: 11, letterSpacing: '0.32em', color: bColors.mid }}>HOSTILES</div>
          {[
            { t: 'FIGHTER', n: 38 },
            { t: 'SNIPER', n: 12 },
            { t: 'TANK', n: 6 },
            { t: 'BOSS', n: 1 },
          ].map(k => (
            <div key={k.t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <EnemyIcon type={k.t} color={bColors.fg} />
              <div>
                <div className="mono upper" style={{ fontSize: 10, letterSpacing: '0.28em', color: bColors.mid }}>{k.t}</div>
                <div className="orb" style={{ fontSize: 24, fontWeight: 800 }}>×{k.n}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ marginTop: 56, display: 'flex', gap: 16 }}>
          <button style={{
            background: bColors.pink, color: bColors.bg, border: 'none',
            fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
            fontSize: 28, letterSpacing: '0.32em',
            padding: '22px 64px', cursor: 'pointer',
          }}>↻  RETRY</button>
          <button style={{
            background: 'transparent', color: bColors.fg, border: `1px solid ${bColors.faint}`,
            fontFamily: 'Orbitron, sans-serif', fontWeight: 600,
            fontSize: 18, letterSpacing: '0.24em',
            padding: '22px 36px', cursor: 'pointer',
          }}>MENU</button>
        </div>
      </div>
    </div>
  );
}

window.BStart = BStart;
window.BHud = BHud;
window.BEnd = BEnd;
window.bColors = bColors;
