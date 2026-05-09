/* global React */

/* Charte graphique — recap visuel pour les 3 directions */

function ChartePanel() {
  const sx = {
    root: {
      width: '100%', height: '100%', background: '#0a0a0e', color: '#e9eaef',
      fontFamily: 'Rajdhani, sans-serif', position: 'relative',
      padding: '60px 80px',
    },
    h1: {
      fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 64,
      letterSpacing: '-0.01em', margin: 0,
    },
    kicker: {
      fontFamily: 'Space Mono, monospace', fontSize: 14, letterSpacing: '0.3em',
      textTransform: 'uppercase', color: '#ff2d55',
    },
    grid: {
      marginTop: 48, display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)', gap: 32,
    },
    card: {
      border: '1px solid #1f2230', padding: 28,
      display: 'flex', flexDirection: 'column', gap: 18,
    },
    label: {
      fontFamily: 'Space Mono, monospace', fontSize: 11,
      letterSpacing: '0.24em', textTransform: 'uppercase',
      color: '#6a6e80',
    },
    swatchRow: { display: 'flex', gap: 8 },
  };

  const directions = [
    {
      name: 'A · STRIKE',
      tag: 'TACTIQUE — DENSE',
      blurb: 'Cockpit militaire saturé d\'informations. Brackets, readouts mono, micro-stats partout. Pour le pilote qui veut tout voir d\'un coup.',
      bg: '#08080c', fg: '#e9eaef', mid: '#6a6e80',
      colors: ['#ff2d55', '#ff3ea5', '#ffb84a', '#1f2230', '#08080c'],
      colorNames: ['SIGNAL', 'ACCENT', 'WARN', 'LINE', 'VOID'],
      typeStack: [
        ['DISPLAY', 'Orbitron Black 900'],
        ['BODY',    'Rajdhani 500'],
        ['DATA',    'Space Mono 400'],
      ],
    },
    {
      name: 'B · PULSE',
      tag: 'MINIMAL — CINÉTIQUE',
      blurb: 'Tout l\'espace pour respirer. Le HUD se contracte autour du crosshair, les chiffres prennent toute la place, le glow rose fait le reste.',
      bg: '#000', fg: '#fff', mid: '#5a5a64',
      colors: ['#ff2a6d', '#ff5b94', '#ffffff', '#15151a', '#000000'],
      colorNames: ['SIGNAL', 'GLOW', 'INK', 'FAINT', 'VOID'],
      typeStack: [
        ['DISPLAY', 'Orbitron Black 900'],
        ['BODY',    'Rajdhani 400'],
        ['DATA',    'Space Mono 400'],
      ],
    },
    {
      name: 'C · REACTOR',
      tag: 'ARCADE — POSTER',
      blurb: 'Crème + blocs noirs + rouge agressif. Référence borne d\'arcade et affiche imprimée. Forme d\'abord, données ensuite.',
      bg: '#efe9dd', fg: '#15110d', mid: '#7a7166',
      colors: ['#ff1f3d', '#15110d', '#efe9dd', '#e6dec9', '#0a0a0d'],
      colorNames: ['SIGNAL', 'INK', 'CREAM', 'PAPER', 'NIGHT'],
      typeStack: [
        ['DISPLAY', 'Orbitron Black 900'],
        ['BODY',    'Rajdhani 700'],
        ['DATA',    'Space Mono 700'],
      ],
    },
  ];

  return (
    <div style={sx.root}>
      <div style={sx.kicker}>▸ CHARTE GRAPHIQUE — STAR COMBAT</div>
      <h1 style={sx.h1}>Trois directions visuelles</h1>
      <div style={{ marginTop: 12, fontSize: 18, color: '#9295a6', maxWidth: 920, lineHeight: 1.4 }}>
        Même base typographique (Orbitron · Rajdhani · Space Mono), même palette dominante rouge/rose néon,
        mais trois traitements opposés : tactique dense, minimal cinétique, brutaliste arcade.
        Chaque direction décline les 3 écrans demandés.
      </div>

      <div style={sx.grid}>
        {directions.map(d => (
          <div key={d.name} style={{ ...sx.card, background: d.bg, color: d.fg }}>
            <div>
              <div style={{ ...sx.label, color: d.mid }}>{d.tag}</div>
              <div style={{
                fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 36,
                letterSpacing: '0.04em', marginTop: 6,
              }}>{d.name}</div>
            </div>

            <div style={{ fontSize: 16, lineHeight: 1.5, color: d.mid }}>{d.blurb}</div>

            {/* Color swatches */}
            <div>
              <div style={{ ...sx.label, color: d.mid, marginBottom: 8 }}>PALETTE</div>
              <div style={sx.swatchRow}>
                {d.colors.map((c, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 56, background: c, border: c === '#000000' || c === '#08080c' || c === '#0a0a0d' ? `1px solid ${d.mid}` : 'none' }} />
                    <div style={{
                      fontFamily: 'Space Mono, monospace', fontSize: 9,
                      letterSpacing: '0.16em', marginTop: 4, color: d.mid,
                    }}>{d.colorNames[i]}</div>
                    <div style={{
                      fontFamily: 'Space Mono, monospace', fontSize: 9,
                      color: d.fg, opacity: 0.7,
                    }}>{c.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div>
              <div style={{ ...sx.label, color: d.mid, marginBottom: 8 }}>TYPOGRAPHIE</div>
              <div style={{
                fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 56,
                letterSpacing: '-0.01em', lineHeight: 0.9, color: d.fg,
              }}>
                Aa·128
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
                {d.typeStack.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ ...sx.label, color: d.mid, fontSize: 10 }}>{k}</span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: d.fg, opacity: 0.85 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample widget — different per direction */}
            <div style={{ marginTop: 'auto' }}>
              <div style={{ ...sx.label, color: d.mid, marginBottom: 8 }}>HUD SAMPLE</div>
              {d.name.startsWith('A') && (
                <div style={{
                  border: `1px solid ${d.colors[0]}`,
                  background: 'rgba(255,45,85,0.08)',
                  padding: 12,
                }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: d.colors[0], letterSpacing: '0.18em' }}>▸ HULL INTEGRITY</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: 28 }}>62</div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: d.mid }}>/ 100</div>
                  </div>
                  <div style={{ height: 6, background: d.colors[3], position: 'relative', marginTop: 4 }}>
                    <div style={{ position: 'absolute', inset: 0, width: '62%', background: d.colors[0] }} />
                  </div>
                </div>
              )}
              {d.name.startsWith('B') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '0.32em', color: d.mid }}>HULL</span>
                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 18 }}>62 / 100</span>
                  </div>
                  <div style={{ height: 2, background: d.colors[3], marginTop: 8, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: '62%', background: d.colors[0] }} />
                  </div>
                </div>
              )}
              {d.name.startsWith('C') && (
                <div style={{ background: d.colors[2], color: d.colors[1], padding: 12, border: `2px solid ${d.colors[1]}` }}>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: d.colors[0], letterSpacing: '0.3em', fontWeight: 700 }}>▌HULL</div>
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 36, lineHeight: 0.9 }}>
                    62<span style={{ fontSize: 14, color: d.mid }}>/100</span>
                  </div>
                  <div style={{ height: 8, background: d.colors[3], marginTop: 6, border: `1px solid ${d.colors[1]}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: '62%', background: d.colors[0] }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Enemy types row */}
      <div style={{ marginTop: 56 }}>
        <div style={sx.label}>SILHOUETTES ENNEMIES</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 32 }}>
          {[
            { t: 'FIGHTER', desc: 'Triangle. Rapide, fragile. La masse.' },
            { t: 'SNIPER', desc: 'Losange étiré. Attaque longue distance.' },
            { t: 'TANK',   desc: 'Hexagone large. Lent, blindé.' },
            { t: 'BOSS',   desc: 'Croix imbriquée. Phases multiples.' },
          ].map(e => (
            <div key={e.t} style={{
              flex: 1, border: '1px solid #1f2230', padding: 20,
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BigEnemyIcon type={e.t} />
              </div>
              <div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, fontSize: 20, letterSpacing: '0.08em' }}>{e.t}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: '#9295a6', marginTop: 2 }}>{e.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BigEnemyIcon({ type }) {
  const c = '#ff2d55';
  const s = 56;
  switch (type) {
    case 'FIGHTER': return <svg width={s} height={s} viewBox="-32 -32 64 64"><polygon points="0,-22 18,18 -18,18" fill="none" stroke={c} strokeWidth="2.5"/></svg>;
    case 'SNIPER': return <svg width={s} height={s} viewBox="-32 -32 64 64"><polygon points="0,-26 9,0 0,26 -9,0" fill="none" stroke={c} strokeWidth="2.5"/></svg>;
    case 'TANK':   return <svg width={s} height={s} viewBox="-32 -32 64 64"><polygon points="-22,-9 -12,-19 12,-19 22,-9 22,9 12,19 -12,19 -22,9" fill="none" stroke={c} strokeWidth="2.5"/></svg>;
    case 'BOSS':   return <svg width={s} height={s} viewBox="-32 -32 64 64"><path d="M-26,0 L0,-26 L26,0 L0,26 Z M-13,0 L0,-13 L13,0 L0,13 Z" fill="none" stroke={c} strokeWidth="2.5"/></svg>;
  }
}

window.ChartePanel = ChartePanel;
