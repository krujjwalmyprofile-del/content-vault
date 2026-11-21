import React from 'react';
import {
  AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Easing,
  delayRender, continueRender,
} from 'remotion';
import captionsData from './captions.json';
import {LENSMAP} from './lensmap';

// ---------- fonts (local woff2 from @fontsource) ----------
const fontHandle = delayRender('fonts');
Promise.all(
  [
    ['InterTight', 'inter-tight-latin-800-normal.woff2', '800'],
    ['InterTight', 'inter-tight-latin-900-normal.woff2', '900'],
    ['Inter', 'inter-latin-600-normal.woff2', '600'],
    ['Inter', 'inter-latin-700-normal.woff2', '700'],
    ['Inter', 'inter-latin-800-normal.woff2', '800'],
  ].map(([fam, file, w]) =>
    new FontFace(fam, `url(${staticFile(file)}) format('woff2')`, {weight: w})
      .load()
      .then((f) => document.fonts.add(f)),
  ),
).then(() => continueRender(fontHandle));

// ---------- tokens ----------
const FPS = 30;
// the silent 4 s reaction intro is cut: output frame 0 = source 4.0 s. All times below stay in SOURCE seconds.
export const OFF = 4.0;
const OFF_F = Math.round(OFF * FPS);
const F = (t: number) => Math.round((t - OFF) * FPS);
const YEL = '#FFD43B';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.62)';
const PANEL = 'rgba(13,14,17,0.74)';
const HEAD = 'InterTight, Inter, sans-serif';
const BODY = 'Inter, sans-serif';
const out = Easing.out(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (f: number, a: number, b: number, from = 0, to = 1, ease = out) =>
  interpolate(f, [a, b], [from, to], {...clamp, easing: ease});
// quick object pop: 0.6 -> 1.06 -> 1
const pop = (f: number, f0: number) =>
  interpolate(f, [f0, f0 + 4, f0 + 8], [0.6, 1.06, 1], {...clamp, easing: Easing.out(Easing.quad)});

// ---------- camera: shots in seconds [start, zStart, zEnd, lensBump] ----------
const SHOTS: [number, number, number, boolean?][] = [
  [4.0, 1.0, 1.02],
  [6.32, 1.07, 1.08],
  [7.82, 1.02, 1.04],
  [9.28, 1.1, 1.11, true],
  [10.42, 1.0, 1.01],
  [11.96, 1.05, 1.06],
  [15.4, 1.0, 1.02],
  [18.2, 1.04, 1.05],
  [21.14, 1.0, 1.02],
  [25.14, 1.04, 1.05],
  [28.72, 1.0, 1.01],
  [30.28, 1.06, 1.07, true],
  [34.9, 1.06, 1.08],
  [37.72, 1.08, 1.09],
  [41.06, 1.0, 1.01],
  [44.04, 1.02, 1.06],
  [99, 1, 1],
];
const camAt = (frame: number) => {
  const t = frame / FPS + OFF;
  let i = 0;
  while (i < SHOTS.length - 2 && SHOTS[i + 1][0] <= t) i++;
  const [s, z0, z1, bump] = SHOTS[i];
  const e = Math.min(SHOTS[i + 1][0], 48.77);
  let z = z0 + (z1 - z0) * Math.min(1, (t - s) / Math.max(0.01, e - s));
  let blur = 0;
  if (bump) {
    const k = Math.max(0, 1 - (frame - F(s)) / 6);
    z *= 1 + 0.035 * k;
    blur = 3 * k;
  }
  return {z, blur};
};

const INVERT: [number, number][] = [[37.72, 37.72 + 5 / FPS]];
const FLASHES: [number, number][] = [[9.28, 0.55], [21.14, 0.22], [34.9, 0.55], [41.06, 0.45]];
const TRAILS: [number, number][] = [[15.36, 15.76], [44.0, 44.36]];

const VideoLayer: React.FC<{frame: number; trim?: number}> = ({frame, trim}) => {
  const {z, blur} = camAt(frame);
  const t = frame / FPS + OFF;
  const inv = INVERT.some(([a, b]) => t >= a && t < b);
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${z})`,
        transformOrigin: '540px 900px',
        filter: `contrast(1.06) saturate(1.07) brightness(1.01)${inv ? ' invert(1) hue-rotate(180deg)' : ''}${blur > 0.05 ? ` blur(${blur}px)` : ''}`,
      }}
    >
      <OffthreadVideo
        src={staticFile('ad002.mp4')}
        muted
        trimBefore={trim ?? OFF_F}
        style={{width: 1080, height: 1920, objectFit: 'cover'}}
      />
    </AbsoluteFill>
  );
};

// transition moments: edge-only lens distortion + RGB split (face centre stays neutral in the map)
const TFX = [9.28, 21.14, 34.9, 41.06];
const fxAmount = (frame: number) => {
  let k = 0;
  for (const t of TFX) {
    const f0 = F(t);
    k = Math.max(k, interpolate(frame, [f0 - 2, f0, f0 + 9], [0, 1, 0], {...clamp, easing: Easing.out(Easing.quad)}));
  }
  return k;
};
const FxDefs: React.FC = () => {
  const frame = useCurrentFrame();
  const k = fxAmount(frame);
  const sp = 10 * k;
  return (
    <svg width="0" height="0" style={{position: 'absolute'}}>
      <defs>
        <filter id="tfx" x="0" y="0" width="1080" height="1920" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={LENSMAP} x="0" y="0" width="1080" height="1920" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={90 * k} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={sp} dy="0" result="ro" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feOffset in="b" dx={-sp} dy="0" result="bo" />
          <feBlend in="ro" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="bo" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
};

const Presenter: React.FC = () => {
  const frame = useCurrentFrame();
  const k = fxAmount(frame);
  return (
    <AbsoluteFill style={{filter: k > 0.02 ? 'url(#tfx)' : undefined}}>
      <VideoLayer frame={frame} />
      {/* low-shutter trails: delayed copies of the same footage, short windows only */}
      {TRAILS.map(([a, b]) => (
        <Sequence key={a} from={F(a)} durationInFrames={F(b) - F(a)}>
          {[3, 6, 9].map((k, i) => (
            <AbsoluteFill key={k} style={{opacity: [0.42, 0.28, 0.16][i]}}>
              <VideoLayer frame={frame} trim={OFF_F + F(a) - k} />
            </AbsoluteFill>
          ))}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  let o = 0;
  for (const [t, peak] of FLASHES) {
    const f0 = F(t);
    o = Math.max(o, interpolate(frame, [f0 - 1, f0, f0 + 5], [0, peak, 0], clamp));
  }
  return o > 0 ? <AbsoluteFill style={{background: WHITE, opacity: o}} /> : null;
};

// ---------- level 1: headlines ----------
type Line = {text: string; at: number; size: number; label?: boolean};
type Head = {from: number; to: number; lines: Line[]; brackets?: boolean; endLine?: number};
const HEADS: Head[] = [
  {from: 0, to: 9.2, lines: [
    {text: 'GTME COHORT', at: 4.0, size: 42, label: true},
    {text: 'AT A FRACTION', at: 4.1, size: 112},
    {text: 'OF THE *PRICE*', at: 4.32, size: 112},
  ]},
  {from: 9.28, to: 10.36, brackets: true, lines: [{text: 'BUT *WHY?*', at: 9.28, size: 168}]},
  {from: 34.9, to: 36.14, lines: [
    {text: "THAT'S", at: 34.9, size: 128},
    {text: 'EVERYTHING', at: 35.32, size: 128},
  ]},
  {from: 36.18, to: 37.62, lines: [
    {text: 'SANDBOX', at: 36.18, size: 136},
    {text: '*GTME*', at: 36.58, size: 136},
  ]},
  {from: 38.02, to: 40.95, lines: [
    {text: 'APART FROM THAT', at: 38.02, size: 42, label: true},
    {text: 'A LOT MORE', at: 39.6, size: 124},
    {text: '*SURPRISES*', at: 40.06, size: 124},
  ]},
  {from: 41.06, to: 43.95, brackets: true, lines: [
    {text: '*APPLY*', at: 41.06, size: 156},
    {text: 'RIGHT NOW', at: 41.4, size: 118},
  ]},
  {from: 45.06, to: 99, endLine: 46.22, lines: [
    {text: 'BUILD YOUR', at: 45.06, size: 118},
    {text: 'GTME *CAREER*', at: 45.76, size: 118},
  ]},
];

const Accent: React.FC<{text: string}> = ({text}) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((p, i) =>
      p.startsWith('*') ? <span key={i} style={{color: YEL}}>{p.slice(1, -1)}</span> : <span key={i}>{p}</span>,
    )}
  </>
);


const parseSegs = (text: string) =>
  text.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => (p.startsWith('*') ? {t: p.slice(1, -1), a: true} : {t: p, a: false}));

// gold shine sweep across accent words (After Effects-style gradient pass)
const shine = (since: number): React.CSSProperties => {
  const cyc = since % 80;
  const pos = interpolate(cyc, [0, 22], [120, -20], clamp);
  return {
    backgroundImage: `linear-gradient(100deg, ${YEL} 0%, ${YEL} 40%, #FFF6CF 50%, ${YEL} 60%, ${YEL} 100%)`,
    backgroundSize: '250% 100%', backgroundPosition: `${pos}% 0`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  };
};

// per-character kinetic reveal: each glyph rises out of a mask, blur -> sharp
const KineticLine: React.FC<{l: Line; frame: number}> = ({l, frame}) => {
  const f0 = F(l.at);
  const segs = parseSegs(l.text);
  const total = segs.reduce((n, x) => n + x.t.length, 0);
  const stagger = Math.min(1.1, 11 / Math.max(1, total));
  const doneAt = f0 + total * stagger + 9;
  const base: React.CSSProperties = {
    fontFamily: HEAD, fontWeight: 900, fontSize: l.size, lineHeight: 1.04, color: WHITE,
    letterSpacing: '-0.02em', whiteSpace: 'nowrap', paddingBottom: l.size * 0.04,
  };
  if (frame >= doneAt) {
    return (
      <div style={base}>
        {segs.map((x, i) => (x.a ? <span key={i} style={shine(frame - doneAt)}>{x.t}</span> : <span key={i}>{x.t}</span>))}
      </div>
    );
  }
  let idx = 0;
  return (
    <div style={{...base, overflow: 'hidden'}}>
      {segs.map((x, si) => (
        <span key={si} style={{color: x.a ? YEL : WHITE}}>
          {x.t.split('').map((ch, ci) => {
            const d = f0 + idx++ * stagger;
            const p = ramp(frame, d, d + 8);
            return (
              <span key={ci} style={{
                display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, p * 1.6),
                transform: `translateY(${(1 - p) * 85}%) scale(${0.9 + 0.1 * p})`,
                filter: p < 0.99 ? `blur(${(1 - p) * 9}px)` : undefined,
              }}>{ch}</span>
            );
          })}
        </span>
      ))}
    </div>
  );
};

// viewfinder brackets closing in on a key statement
const Brackets: React.FC<{frame: number; f0: number; w: number; h: number}> = ({frame, f0, w, h}) => {
  const p = ramp(frame, f0, f0 + 12);
  const gap = 40 * (1 - p);
  const L = 46, T = 7;
  const c = (st: React.CSSProperties) => <div style={{position: 'absolute', width: L, height: L, borderColor: YEL, borderStyle: 'solid', borderWidth: 0, opacity: p, ...st}} />;
  return (
    <div style={{position: 'absolute', left: -26, top: -16, width: w + 52, height: h + 32}}>
      {c({left: -gap, top: -gap, borderLeftWidth: T, borderTopWidth: T})}
      {c({right: -gap, top: -gap, borderRightWidth: T, borderTopWidth: T})}
      {c({left: -gap, bottom: -gap, borderLeftWidth: T, borderBottomWidth: T})}
      {c({right: -gap, bottom: -gap, borderRightWidth: T, borderBottomWidth: T})}
    </div>
  );
};

const Headlines: React.FC = () => {
  const frame = useCurrentFrame();
  const h = HEADS.find((x) => frame >= F(x.from) && frame < F(x.to) + 9);
  if (!h) return null;
  const exitP = ramp(frame, F(h.to), F(h.to) + 8);
  const blockW = Math.max(...h.lines.map((l) => l.text.replace(/\*/g, '').length * l.size * (l.label ? 0.78 : 0.66)));
  const blockH = h.lines.reduce((n, l) => n + (l.label ? l.size * 1.5 : l.size * 1.08), 0);
  const settle = h.endLine ? ramp(frame, F(h.endLine), F(h.endLine) + 90, 0, 1, Easing.inOut(Easing.cubic)) : 0;
  return (
    <div style={{
      position: 'absolute', left: 64, top: 246, width: 940, opacity: 1 - exitP,
      transform: `translateY(${-36 * exitP}px)`, filter: exitP > 0.01 ? `blur(${exitP * 10}px)` : undefined,
    }}>
      {h.brackets && <Brackets frame={frame} f0={F(h.lines[0].at)} w={Math.min(940, blockW)} h={blockH} />}
      {h.lines.map((l, i) => {
        const f0 = F(l.at);
        if (frame < f0) return <div key={i} style={{height: l.label ? l.size * 1.5 : l.size * 1.08}} />;
        if (l.label) {
          const w = ramp(frame, f0, f0 + 10);
          return (
            <div key={i} style={{
              fontFamily: HEAD, fontWeight: 800, fontSize: l.size, letterSpacing: `${0.2 + 0.04 * w}em`, color: YEL,
              height: l.size * 1.5, clipPath: `inset(0 ${100 - w * 100}% 0 0)`,
            }}>
              <Accent text={l.text} />
            </div>
          );
        }
        return (
          <div key={i} style={{letterSpacing: `${settle * 0.03}em`}}>
            <KineticLine l={l} frame={frame} />
          </div>
        );
      })}
      {h.endLine && (
        <div style={{marginTop: 18, height: 8, borderRadius: 4, background: YEL, width: 420 * ramp(frame, F(h.endLine), F(h.endLine) + 16)}} />
      )}
    </div>
  );
};

// ---------- layer 2: progressive information panel ----------
type Card = {x: number; at: number; heading: string; start: number; items: [string, number][]};
const PANEL_OUT = 34.72;
const CARDS: Card[] = [
  {x: 40, at: 10.42, heading: 'WHY THIS PRICE?', start: 1, items: [
    ['LIMITED TIME', 10.42], ['FULL GTME TECH STACK', 11.96], ['PIPELINE BUILT FOR YOU', 15.4],
  ]},
  {x: 558, at: 21.14, heading: 'WHAT YOU GET', start: 4, items: [
    ['50+ HRS OF VIDEO', 21.14], ['40+ PLAYBOOKS', 23.88], ['ACCOUNTABILITY', 25.14], ['2 LIVE SESSIONS/WEEK', 26.46],
  ]},
];

const InfoPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const fo = F(PANEL_OUT);
  if (frame < F(10.42) || frame > fo + 10) return null;
  const wipe = ramp(frame, fo, fo + 9); // mask exit upward
  return (
    <AbsoluteFill style={{clipPath: `inset(0 0 ${wipe * 100}% 0)`}}>
      {CARDS.map((c, ci) => {
        const f0 = F(c.at);
        if (frame < f0) return null;
        const inP = ramp(frame, f0, f0 + 12);
        const h = 86 + c.items.reduce((acc, [, t]) => acc + 54 * ramp(frame, F(t), F(t) + 8), 0);
        return (
          <div key={ci} style={{
            position: 'absolute', left: c.x, top: 236, width: 482, height: h,
            background: PANEL, borderRadius: 26, backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden',
            opacity: inP, transform: `translateX(${(ci === 0 ? -40 : 40) * (1 - inP)}px)`,
            transition: 'none',
          }}>
            <Sweep frame={frame} f0={f0 + 8} radius={26} />
            <div style={{position: 'absolute', left: 24, top: 22, fontFamily: HEAD, fontWeight: 800, fontSize: 25, letterSpacing: '0.16em', color: YEL}}>
              {c.heading}
            </div>
            {c.items.map(([label, t], i) => {
              const fi = F(t);
              if (frame < fi) return null;
              const rev = ramp(frame, fi, fi + 10);
              const fresh = interpolate(frame, [fi, fi + 6, fi + 45, fi + 60], [0, 1, 1, 0], clamp);
              return (
                <div key={i} style={{position: 'absolute', left: 24, top: 72 + i * 54, height: 46, display: 'flex', alignItems: 'center', gap: 14}}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, background: YEL, color: '#111',
                    fontFamily: HEAD, fontWeight: 900, fontSize: 23, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `scale(${pop(frame, fi)})`,
                  }}>{c.start + i}</div>
                  <div style={{
                    fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE, letterSpacing: '0.01em',
                    clipPath: `inset(0 ${100 - rev * 100}% 0 0)`, whiteSpace: 'nowrap',
                    borderBottom: `3px solid rgba(255,212,59,${fresh})`, paddingBottom: 2,
                  }}>{label}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- layer 3: demonstration window ----------
type Rect = {x: number; y: number; w: number; h: number};
type SceneDef = {from: number; to: number; label: string; C: React.FC<{f: number}>};
type Session = {from: number; to: number; rect: Rect; dir: 1 | -1; bw?: boolean; scenes: SceneDef[]};

const ICONS: React.ReactNode[] = [
  // gear
  <g key="g"><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="4" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="22" y="4" width="4" height="8" rx="1" fill="currentColor" transform={`rotate(${a} 24 24)`} />)}</g>,
  // database
  <g key="d" fill="none" stroke="currentColor" strokeWidth="4"><ellipse cx="24" cy="12" rx="14" ry="5" /><path d="M10 12v24c0 3 6 5 14 5s14-2 14-5V12" /><path d="M10 24c0 3 6 5 14 5s14-2 14-5" /></g>,
  // mail
  <g key="m" fill="none" stroke="currentColor" strokeWidth="4"><rect x="7" y="12" width="34" height="24" rx="3" /><path d="M8 14l16 12 16-12" /></g>,
  // bolt
  <path key="b" d="M27 5L11 27h11l-3 16 18-24H26z" fill="currentColor" />,
  // chart
  <g key="c" fill="currentColor"><rect x="9" y="26" width="7" height="14" rx="1" /><rect x="20" y="17" width="7" height="23" rx="1" /><rect x="31" y="9" width="7" height="31" rx="1" /></g>,
  // link
  <g key="l" fill="none" stroke="currentColor" strokeWidth="4"><rect x="6" y="18" width="20" height="12" rx="6" /><rect x="22" y="18" width="20" height="12" rx="6" /></g>,
];
const Icon: React.FC<{i: number; size?: number; color?: string}> = ({i, size = 48, color = WHITE}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{color}}>{ICONS[i % ICONS.length]}</svg>
);

const Tag: React.FC<{text: string; size?: number; color?: string}> = ({text, size = 22, color = MUTED}) => (
  <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: size, letterSpacing: '0.14em', color}}>{text}</div>
);
const Big: React.FC<{children: React.ReactNode; size?: number; color?: string}> = ({children, size = 54, color = WHITE}) => (
  <div style={{fontFamily: HEAD, fontWeight: 900, fontSize: size, lineHeight: 1, color, letterSpacing: '-0.01em'}}>{children}</div>
);

// 1. price comparison (no numbers: the speaker gives none)
const PriceBars: React.FC<{f: number}> = ({f}) => {
  const a = ramp(f, F(4.5), F(5.3));
  const b = ramp(f, F(6.32), F(6.9));
  const tag = ramp(f, F(6.78), F(7.1));
  const row = (label: string, w: number, color: string, txt: string, o: number) => (
    <div style={{marginBottom: 22}}>
      <Tag text={label} size={20} />
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 8}}>
        <div style={{height: 34, width: 620 * w, background: color, borderRadius: 10}} />
        <div style={{opacity: o, fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: YEL, whiteSpace: 'nowrap'}}>{txt}</div>
      </div>
    </div>
  );
  return (
    <div style={{paddingTop: 6}}>
      {row('OTHER GTME COHORTS', a, 'rgba(255,255,255,0.28)', '', 0)}
      {row('THIS GTME COHORT', 0.2 * b, YEL, 'A FRACTION OF THE PRICE', tag)}
    </div>
  );
};

// 2. limited time
const LimitedTime: React.FC<{f: number}> = ({f}) => {
  const p = ramp(f, F(10.45), F(11.9), 0, 1, Easing.linear);
  const C = 2 * Math.PI * 56;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 34, height: '100%'}}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="56" stroke="rgba(255,255,255,0.15)" strokeWidth="12" fill="none" />
        <circle cx="70" cy="70" r="56" stroke={YEL} strokeWidth="12" fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (0.15 + 0.6 * p)} transform="rotate(-90 70 70)" />
        <line x1="70" y1="70" x2="70" y2="34" stroke={WHITE} strokeWidth="6" strokeLinecap="round" transform={`rotate(${p * 300} 70 70)`} />
        <circle cx="70" cy="70" r="7" fill={WHITE} />
      </svg>
      <div>
        <Tag text="FOR A" size={24} />
        <div style={{transform: `scale(${pop(f, F(11.12))})`, transformOrigin: 'left center'}}>
          <Big size={64} color={YEL}>LIMITED TIME</Big>
        </div>
      </div>
    </div>
  );
};

// 3. tech stack: generic tool tiles (icons only, no third-party brands)
const TechStack: React.FC<{f: number}> = ({f}) => (
  <div>
    <div style={{display: 'flex', gap: 14, marginTop: 4}}>
      {ICONS.map((_, i) => {
        const fi = F(12.6) + i * 4;
        return (
          <div key={i} style={{
            width: 96, height: 96, borderRadius: 20, background: i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,212,59,0.16)',
            border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${f < fi ? 0 : pop(f, fi)})`,
          }}><Icon i={i} size={50} color={i % 2 ? WHITE : YEL} /></div>
        );
      })}
    </div>
    <div style={{marginTop: 22, opacity: ramp(f, F(13.38), F(13.7))}}>
      <Big size={40}>ALL THE <span style={{color: YEL}}>TECH STACK</span> YOU NEED</Big>
    </div>
  </div>
);

// 4. pipeline, nodes land on their words
const Pipeline: React.FC<{f: number}> = ({f}) => {
  const nodes: [string, number][] = [['PIPELINE', 16.32], ['FOR YOU', 18.2], ['YOUR INDUSTRY', 19.54]];
  const xs = [80, 336, 592];
  const line1 = ramp(f, F(16.6), F(18.2));
  const line2 = ramp(f, F(18.5), F(19.54));
  const dotP = ((f - F(16.3)) % 50) / 50;
  return (
    <div style={{position: 'relative', height: 170}}>
      <svg width="672" height="170" style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={xs[0]} y1="58" x2={xs[0] + (xs[1] - xs[0]) * line1} y2="58" stroke={YEL} strokeWidth="5" />
        <line x1={xs[1]} y1="58" x2={xs[1] + (xs[2] - xs[1]) * line2} y2="58" stroke={YEL} strokeWidth="5" />
        {line2 >= 1 && <circle cx={xs[0] + (xs[2] - xs[0]) * dotP} cy="58" r="8" fill={WHITE} />}
      </svg>
      {nodes.map(([label, t], i) => {
        const fi = F(t);
        const on = f >= fi;
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - 90, top: 14, width: 180, textAlign: 'center', opacity: on ? 1 : 0.0}}>
            <div style={{
              width: 88, height: 88, margin: '0 auto', borderRadius: 44, background: i === 2 ? YEL : '#1d1f24',
              border: `4px solid ${YEL}`, transform: `scale(${on ? pop(f, fi) : 0})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon i={[4, 0, 5][i]} size={44} color={i === 2 ? '#111' : YEL} /></div>
            <div style={{marginTop: 12, fontFamily: HEAD, fontWeight: 900, fontSize: 24, color: WHITE, letterSpacing: '0.04em'}}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

// 5. hours of video
const Hours: React.FC<{f: number}> = ({f}) => {
  const n = Math.round(ramp(f, F(21.14), F(22.2)) * 50);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 40, height: '100%'}}>
      <div style={{width: 330}}>
        <Big size={120} color={YEL}>{n}+</Big>
        <div style={{marginTop: 8}}><Tag text="HOURS OF VIDEO" size={26} color={WHITE} /></div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 140px)', gap: 12}}>
        {Array.from({length: 6}).map((_, i) => {
          const fi = F(21.5) + i * 3;
          return (
            <div key={i} style={{
              height: 82, borderRadius: 14, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${f < fi ? 0 : pop(f, fi)})`,
            }}>
              <svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="16" fill={YEL} /><path d="M13 10l11 7-11 7z" fill="#111" /></svg>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 6. playbooks
const Playbooks: React.FC<{f: number}> = ({f}) => {
  const n = Math.round(ramp(f, F(23.88), F(24.5)) * 40);
  const fan = ramp(f, F(24.0), F(24.6));
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 40, height: '100%'}}>
      <div style={{width: 330}}>
        <Big size={120} color={YEL}>{n}+</Big>
        <div style={{marginTop: 8}}><Tag text="PLAYBOOKS" size={26} color={WHITE} /></div>
      </div>
      <div style={{position: 'relative', width: 400, height: 190}}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            position: 'absolute', left: 120 + (i - 2) * 56 * fan, top: 14, width: 130, height: 166, borderRadius: 14,
            background: i === 4 ? YEL : '#24262c', border: '1px solid rgba(255,255,255,0.16)',
            transform: `rotate(${(i - 2) * 7 * fan}deg)`, transformOrigin: '50% 120%', padding: 16, boxSizing: 'border-box',
          }}>
            {[0, 1, 2, 3].map((k) => <div key={k} style={{height: 8, borderRadius: 4, marginBottom: 12, width: `${90 - k * 15}%`, background: i === 4 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.25)'}} />)}
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. accountability
const Accountability: React.FC<{f: number}> = ({f}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 44, height: '100%'}}>
    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
      {[0, 1, 2].map((i) => {
        const fi = F(25.2) + i * 5;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{width: 44, height: 44, borderRadius: 10, border: `3px solid ${YEL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: f >= fi ? YEL : 'transparent'}}>
              {f >= fi && <svg width="28" height="28" viewBox="0 0 28 28" style={{transform: `scale(${pop(f, fi)})`}}><path d="M5 14l6 6 12-13" stroke="#111" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <div style={{width: 220, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.22)'}} />
          </div>
        );
      })}
    </div>
    <div>
      <Big size={58}>ACCOUNTABILITY</Big>
      <div style={{marginTop: 10}}><Tag text="SESSIONS" size={28} color={YEL} /></div>
    </div>
  </div>
);

// 8. live expert sessions every week
const Live: React.FC<{f: number}> = ({f}) => {
  const blink = 0.5 + 0.5 * Math.sin((f / FPS) * Math.PI * 2.2);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 40, height: '100%'}}>
      <div style={{display: 'flex', gap: 16}}>
        {[0, 1].map((i) => {
          const fi = F(26.46) + i * 4;
          return (
            <div key={i} style={{
              width: 150, height: 170, borderRadius: 18, background: '#1d1f24', border: '1px solid rgba(255,255,255,0.16)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
              transform: `scale(${f < fi ? 0 : pop(f, fi)})`,
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8, background: '#E5383B', padding: '6px 14px', borderRadius: 8}}>
                <div style={{width: 12, height: 12, borderRadius: 6, background: WHITE, opacity: blink}} />
                <span style={{fontFamily: HEAD, fontWeight: 900, fontSize: 22, color: WHITE, letterSpacing: '0.1em'}}>LIVE</span>
              </div>
              <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="20" r="11" fill="rgba(255,255,255,0.5)" /><path d="M8 52c2-12 10-18 20-18s18 6 20 18z" fill="rgba(255,255,255,0.5)" /></svg>
            </div>
          );
        })}
      </div>
      <div>
        <Big size={46}>2 LIVE EXPERT</Big>
        <Big size={46}>SESSIONS</Big>
        <div style={{marginTop: 14, opacity: ramp(f, F(27.98), F(28.2)), transform: `scale(${f < F(27.98) ? 1 : pop(f, F(27.98))})`, transformOrigin: 'left center'}}>
          <Big size={46} color={YEL}>EVERY WEEK</Big>
        </div>
        <div style={{marginTop: 12, opacity: ramp(f, F(29.04), F(29.3))}}><Tag text="+ SO MUCH MORE" size={26} color={WHITE} /></div>
      </div>
    </div>
  );
};

// 9. tech stack in your own account (callback to the stack tiles)
const OwnAccount: React.FC<{f: number}> = ({f}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 36, height: '100%'}}>
    <div style={{width: 430, height: 190, borderRadius: 16, background: '#16181c', border: '1px solid rgba(255,255,255,0.16)', overflow: 'hidden'}}>
      <div style={{height: 38, background: '#23252b', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}
        <span style={{marginLeft: 12, fontFamily: HEAD, fontWeight: 800, fontSize: 17, letterSpacing: '0.12em', color: MUTED}}>YOUR ACCOUNT</span>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, padding: 16}}>
        {ICONS.map((_, i) => {
          const fi = F(31.24) + i * 3;
          const p = ramp(f, fi, fi + 8);
          return (
            <div key={i} style={{
              width: 56, height: 56, borderRadius: 12, background: 'rgba(255,212,59,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: p, transform: `translateY(${-60 * (1 - p)}px)`,
            }}><Icon i={i} size={32} color={YEL} /></div>
          );
        })}
      </div>
    </div>
    <div>
      <Tag text="IN-HOUSE" size={26} color={YEL} />
      <div style={{marginTop: 10, opacity: ramp(f, F(32.84), F(33.1))}}><Big size={46}>YOUR OWN</Big><Big size={46}>ACCOUNT</Big></div>
    </div>
  </div>
);

// 10. surprises: black-and-white glow insert
const Surprises: React.FC<{f: number}> = ({f}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, height: '100%'}}>
    {[0, 1, 2].map((i) => {
      const fi = F(39.6) + i * 4;
      const flip = ramp(f, fi, fi + 9);
      return (
        <div key={i} style={{
          width: 150, height: 170, borderRadius: 18, background: '#2a2a2a', border: '2px solid rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `perspective(600px) rotateY(${(1 - flip) * 90}deg)`,
          boxShadow: '0 0 28px rgba(255,255,255,0.55)',
        }}>
          <span style={{fontFamily: HEAD, fontWeight: 900, fontSize: 110, color: WHITE, textShadow: '0 0 24px rgba(255,255,255,0.9)'}}>?</span>
        </div>
      );
    })}
  </div>
);

// glass shine sweep (one pass) starting at frame f0
const Sweep: React.FC<{frame: number; f0: number; radius?: number}> = ({frame, f0, radius = 30}) => {
  if (frame < f0 || frame > f0 + 20) return null;
  const x = interpolate(frame, [f0, f0 + 20], [-120, 120], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${x}%)`,
        background: 'linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 65%)'}} />
    </div>
  );
};

// rotating gold edge light on the demo window
const EdgeLight: React.FC<{frame: number; radius?: number}> = ({frame, radius = 30}) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: radius, padding: 2, pointerEvents: 'none',
    background: `conic-gradient(from ${(frame * 4) % 360}deg, rgba(255,212,59,0) 0deg, rgba(255,212,59,0.95) 50deg, rgba(255,212,59,0) 110deg, rgba(255,212,59,0) 360deg)`,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor', maskComposite: 'exclude',
  }} />
);

const SMALL: Rect = {x: 180, y: 1532, w: 720, h: 252};
const WIDE: Rect = {x: 60, y: 1522, w: 900, h: 270};
const SESSIONS: Session[] = [
  {from: 4.3, to: 9.15, rect: SMALL, dir: -1, scenes: [{from: 4.3, to: 9.15, label: 'PRICE CHECK', C: PriceBars}]},
  {from: 10.45, to: 20.95, rect: SMALL, dir: 1, scenes: [
    {from: 10.45, to: 11.93, label: 'REASON 1', C: LimitedTime},
    {from: 11.96, to: 15.37, label: 'REASON 2', C: TechStack},
    {from: 15.4, to: 20.95, label: 'REASON 3', C: Pipeline},
  ]},
  {from: 21.14, to: 34.4, rect: WIDE, dir: -1, scenes: [
    {from: 21.14, to: 23.85, label: 'INSIDE THE COHORT', C: Hours},
    {from: 23.88, to: 25.11, label: 'INSIDE THE COHORT', C: Playbooks},
    {from: 25.14, to: 26.43, label: 'INSIDE THE COHORT', C: Accountability},
    {from: 26.46, to: 30.25, label: 'INSIDE THE COHORT', C: Live},
    {from: 30.28, to: 34.4, label: 'PLUS', C: OwnAccount},
  ]},
  {from: 38.02, to: 40.95, rect: SMALL, dir: 1, bw: true, scenes: [{from: 38.02, to: 40.95, label: 'AND MORE', C: Surprises}]},
];

const DemoWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const s = SESSIONS.find((x) => frame >= F(x.from) && frame < F(x.to) + 10);
  if (!s) return null;
  const fi = F(s.from);
  const fo = F(s.to);
  const inP = ramp(frame, fi, fi + 12);
  const outP = ramp(frame, fo, fo + 9, 0, 1, Easing.in(Easing.cubic));
  const dx = s.dir * 300 * (1 - inP) - s.dir * 300 * outP;
  const motion = Math.max(1 - inP, outP);
  const sc = s.scenes.find((x) => frame >= F(x.from) && frame < F(x.to)) ?? s.scenes[s.scenes.length - 1];
  const sf = F(sc.from);
  const cIn = sf === fi ? 1 : ramp(frame, sf, sf + 9);
  const {x, y, w, h} = s.rect;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 30,
      background: 'rgba(14,15,18,0.92)', border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 28px 70px rgba(0,0,0,0.5)', overflow: 'hidden',
      transform: `translateX(${dx}px)`, opacity: 1 - outP * 0.9 - (1 - inP) * 0.6,
      filter: `${motion > 0.02 ? `blur(${motion * 16}px)` : ''}${s.bw ? ' grayscale(1) contrast(1.15)' : ''}` || undefined,
    }}>
      {!s.bw && <EdgeLight frame={frame} />}
      <Sweep frame={frame} f0={sf + (sf === fi ? 10 : 6)} />
      <div style={{position: 'absolute', left: 26, top: 20, display: 'flex', alignItems: 'center', gap: 10}}>
        <div style={{width: 10, height: 10, borderRadius: 5, background: s.bw ? WHITE : YEL}} />
        <Tag text={sc.label} size={19} />
      </div>
      <div style={{
        position: 'absolute', left: 26, top: 54, width: w - 52, height: h - 74,
        opacity: cIn, transform: `translateX(${40 * (1 - cIn)}px)`, filter: cIn < 0.98 ? `blur(${(1 - cIn) * 8}px)` : undefined,
      }}>
        <sc.C f={frame} />
      </div>
    </div>
  );
};

// ---------- level 2: spoken captions ----------
type W = {t: string; s: number; e: number; h: boolean};
const PHRASES = captionsData as W[][];
const CAP_HIDE: [number, number][] = [[9.28, 10.36]];

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + OFF;
  if (CAP_HIDE.some(([a, b]) => t >= a && t < b)) return null;
  let idx = -1;
  for (let i = 0; i < PHRASES.length; i++) {
    const p = PHRASES[i];
    const start = p[0].s - 0.08;
    const nextS = i + 1 < PHRASES.length ? PHRASES[i + 1][0].s - 0.08 : 99;
    const end = Math.min(nextS, p[p.length - 1].e + 0.7);
    if (t >= start && t < end) idx = i;
  }
  if (idx < 0) return null;
  const p = PHRASES[idx];
  const f0 = F(p[0].s - 0.08);
  const s = interpolate(frame, [f0, f0 + 5], [0.9, 1], {...clamp, easing: out});
  const o = ramp(frame, f0, f0 + 4);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1416, display: 'flex', justifyContent: 'center'}}>
      <div style={{
        maxWidth: 960, padding: '12px 26px 14px', borderRadius: 22, background: 'rgba(8,8,10,0.74)',
        fontFamily: BODY, fontWeight: 800, fontSize: 54, lineHeight: 1.12, textAlign: 'center',
        transform: `scale(${s})`, opacity: o, whiteSpace: 'nowrap',
      }}>
        {p.map((w, i) => {
          const spoken = t >= w.s - 0.03;
          const wp = ramp(frame, F(w.s - 0.03), F(w.s - 0.03) + 4);
          return (
            <span key={i}>
              <span style={{
                display: 'inline-block', color: w.h && spoken ? YEL : WHITE, opacity: 0.42 + 0.58 * wp,
                transform: `translateY(${(1 - wp) * 8}px)`,
              }}>{w.t}</span>
              {i < p.length - 1 ? '\u00A0' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- subtle readability grade for the top text zone ----------
const TopShade: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.22) 22%, rgba(0,0,0,0) 34%)'}} />
);

// ---------- premium finishing layers ----------
const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.34) 100%)'}} />
);

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: 0.13}}>
      <img src={staticFile(`grain${frame % 8}.png`)} style={{width: 1080, height: 1920}} />
    </AbsoluteFill>
  );
};

// warm anamorphic light leaks that sweep across on section changes
const LEAKS: [number, number, 1 | -1][] = [[4.0, 0.4, 1], [9.28, 0.42, -1], [21.14, 0.38, 1], [34.9, 0.42, -1], [41.06, 0.42, 1], [45.06, 0.3, -1]];
const LightLeaks: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {LEAKS.map(([t, peak, dir]) => {
        const f0 = F(t);
        if (frame < f0 - 3 || frame > f0 + 26) return null;
        const o = interpolate(frame, [f0 - 3, f0 + 2, f0 + 26], [0, peak, 0], clamp);
        const x = interpolate(frame, [f0 - 3, f0 + 26], dir > 0 ? [-10, 80] : [110, 20], clamp);
        return (
          <AbsoluteFill key={t} style={{
            mixBlendMode: 'screen', opacity: o,
            background: `radial-gradient(ellipse 38% 55% at ${x}% 28%, rgba(255,176,64,0.95) 0%, rgba(255,120,48,0.45) 35%, rgba(255,90,40,0) 70%),
              radial-gradient(ellipse 22% 80% at ${x + dir * 18}% 60%, rgba(255,220,140,0.55) 0%, rgba(255,200,120,0) 70%)`,
          }} />
        );
      })}
    </>
  );
};

export const Ad002: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <FxDefs />
    <Presenter />
    <Vignette />
    <TopShade />
    <InfoPanel />
    <Headlines />
    <DemoWindow />
    <Captions />
    <LightLeaks />
    <Flash />
    <Grain />
  </AbsoluteFill>
);
