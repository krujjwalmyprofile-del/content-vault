import React from 'react';
import {
  AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate, Easing, delayRender, continueRender,
} from 'remotion';
import captionsData from './captions.json';
import {LENSMAP} from './lensmap';

// ---------- fonts ----------
const fontHandle = delayRender('fonts');
Promise.all(
  [
    ['InterTight', 'inter-tight-latin-800-normal.woff2', '800'],
    ['InterTight', 'inter-tight-latin-900-normal.woff2', '900'],
    ['Inter', 'inter-latin-600-normal.woff2', '600'],
    ['Inter', 'inter-latin-700-normal.woff2', '700'],
    ['Inter', 'inter-latin-800-normal.woff2', '800'],
  ].map(([fam, file, w]) =>
    new FontFace(fam, `url(${staticFile(file)}) format('woff2')`, {weight: w}).load().then((f) => document.fonts.add(f)),
  ),
).then(() => continueRender(fontHandle));

// ---------- timing: output frame 0 = source 2.5 s; all times below are SOURCE seconds ----------
const FPS = 30;
const OFF = 2.5;
const OFF_F = Math.round(OFF * FPS);
const F = (t: number) => Math.round((t - OFF) * FPS);

// ---------- muted palette: warm stone, charcoal, one dusty clay accent ----------
const TEXT = '#EEE9E1';
const MUTE = 'rgba(238,233,225,0.58)';
const DIM = 'rgba(238,233,225,0.30)';
const ACC = '#C49A7C';
const PANEL = '#1C1D20';
const CARD = '#25272B';
const LINE = 'rgba(238,233,225,0.14)';
const HEAD = 'InterTight, Inter, sans-serif';
const BODY = 'Inter, sans-serif';
const SPLIT = 1110; // presenter above, process explainer below

const out = Easing.out(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ramp = (f: number, a: number, b: number, from = 0, to = 1, e = out) =>
  interpolate(f, [a, b], [from, to], {...clamp, easing: e});
const soft = (f: number, f0: number) => ramp(f, f0, f0 + 12);

// section changes drive the premium transition kit (leak + edge lens + RGB split + panel wipe)
const SECTIONS = [9.42, 16.72, 31.32, 44.98];

// per-character kinetic reveal: glyphs rise from a mask, blur -> sharp
const Kinetic: React.FC<{text: string; at: number; frame: number; style?: React.CSSProperties; accentFrom?: number}> = ({text, at, frame, style, accentFrom}) => {
  const f0 = F(at);
  const st = Math.min(1, 14 / Math.max(1, text.length));
  if (frame < f0) return <div style={{...style, opacity: 0}}>{text}</div>;
  return (
    <div style={{...style, whiteSpace: 'nowrap'}}>
      {text.split('').map((ch, i) => {
        const p = ramp(frame, f0 + i * st, f0 + i * st + 9);
        return (
          <span key={i} style={{
            display: 'inline-block', whiteSpace: 'pre', opacity: p, color: accentFrom !== undefined && i >= accentFrom ? ACC : undefined,
            transform: `translateY(${(1 - p) * 40}px)`, filter: p < 0.99 ? `blur(${(1 - p) * 7}px)` : undefined,
          }}>{ch}</span>
        );
      })}
    </div>
  );
};

// one glass shine pass
const Sweep: React.FC<{frame: number; f0: number; radius?: number; strength?: number}> = ({frame, f0, radius = 24, strength = 0.16}) => {
  if (frame < f0 || frame > f0 + 22) return null;
  const x = interpolate(frame, [f0, f0 + 22], [-130, 130], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${x}%)`,
        background: `linear-gradient(105deg, rgba(255,250,240,0) 35%, rgba(255,250,240,${strength}) 50%, rgba(255,250,240,0) 65%)`}} />
    </div>
  );
};

// slow travelling edge light in the muted accent
const EdgeLight: React.FC<{frame: number; radius?: number; o?: number}> = ({frame, radius = 24, o = 1}) => (
  <div style={{
    position: 'absolute', inset: -2, borderRadius: radius + 2, padding: 2, pointerEvents: 'none', opacity: o,
    background: `conic-gradient(from ${(frame * 3) % 360}deg, rgba(196,154,124,0) 0deg, rgba(232,205,184,0.95) 40deg, rgba(196,154,124,0) 100deg, rgba(196,154,124,0) 360deg)`,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude',
  }} />
);

// ---------- presenter: matted figure (Robust Video Matting) on a new backdrop ----------
const SHOTS: [number, number, number][] = [
  [2.5, 1.0, 1.02], [9.42, 1.045, 1.055], [16.72, 1.0, 1.02], [23.66, 1.035, 1.045],
  [31.32, 1.055, 1.065], [34.42, 1.0, 1.02], [44.98, 1.03, 1.06], [99, 1, 1],
];
const camAt = (frame: number) => {
  const t = frame / FPS + OFF;
  let i = 0;
  while (i < SHOTS.length - 2 && SHOTS[i + 1][0] <= t) i++;
  const [s, z0, z1] = SHOTS[i];
  const e = Math.min(SHOTS[i + 1][0], 47.9);
  return z0 + (z1 - z0) * Math.min(1, (t - s) / Math.max(0.01, e - s));
};
// rack focus: backdrop defocuses while she says "this is where you need a mentor"
const focusPull = (frame: number) =>
  interpolate(frame, [F(31.32), F(31.32) + 14, F(34.2), F(34.42) + 10], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
const fxAmount = (frame: number) => {
  let k = 0;
  for (const t of SECTIONS) {
    const f0 = F(t);
    k = Math.max(k, interpolate(frame, [f0 - 2, f0, f0 + 10], [0, 1, 0], {...clamp, easing: Easing.out(Easing.quad)}));
  }
  return k;
};
const FxDefs: React.FC = () => {
  const frame = useCurrentFrame();
  const k = fxAmount(frame);
  const sp = 6 * k;
  return (
    <svg width="0" height="0" style={{position: 'absolute'}}>
      <defs>
        <filter id="tfx" x="0" y="0" width="1080" height="1110" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={LENSMAP} x="0" y="0" width="1080" height="1110" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={70 * k} xChannelSelector="R" yChannelSelector="G" result="d" />
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

const Backdrop: React.FC<{frame: number; z: number}> = ({frame, z}) => {
  const bz = 1 + (z - 1) * 0.35; // backdrop moves less than the figure -> depth
  const drift = Math.sin(frame / 240) * 14;
  const fp = focusPull(frame);
  return (
    <AbsoluteFill style={{transform: `scale(${bz * (1 + 0.03 * fp)}) translateX(${drift}px)`, transformOrigin: '540px 500px', filter: fp > 0.01 ? `blur(${fp * 9}px) brightness(${1 - 0.06 * fp})` : undefined}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #E3DCD1 0%, #D6CDC0 55%, #C7BDAE 100%)'}} />
      {/* soft key light behind the head */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 46% 34% at 50% 36%, rgba(255,251,244,0.85) 0%, rgba(255,251,244,0) 70%)'}} />
      {/* quiet architectural arch + panel lines, out of focus */}
      <div style={{position: 'absolute', left: 250, top: 120, width: 580, height: 1100, borderRadius: '290px 290px 0 0',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.06))', filter: 'blur(6px)'}} />
      {[90, 170, 910, 990].map((x) => (
        <div key={x} style={{position: 'absolute', left: x, top: 0, width: 3, height: 1100, background: 'rgba(120,108,94,0.12)', filter: 'blur(2px)'}} />
      ))}
      {/* drifting bokeh dust */}
      {Array.from({length: 14}).map((_, i) => {
        const sx = (i * 197) % 1040 + 20;
        const sz = 14 + ((i * 37) % 30);
        const y = 1100 - ((frame * (0.35 + (i % 5) * 0.12) + i * 140) % 1250);
        return <div key={i} style={{position: 'absolute', left: sx + Math.sin((frame + i * 40) / 60) * 12, top: y, width: sz, height: sz,
          borderRadius: sz, background: 'rgba(255,248,238,0.55)', filter: `blur(${3 + (i % 3) * 2}px)`, opacity: 0.35 + (i % 4) * 0.12}} />;
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,0,0,0) 60%, rgba(70,60,50,0.22) 100%)'}} />
    </AbsoluteFill>
  );
};

const PresenterHalf: React.FC = () => {
  const frame = useCurrentFrame();
  const z = camAt(frame);
  const k = fxAmount(frame);
  const fx = Math.sin(frame / 47) * 3, fy = Math.cos(frame / 61) * 3;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SPLIT, overflow: 'hidden', filter: k > 0.02 ? 'url(#tfx)' : undefined}}>
      <Backdrop frame={frame} z={z} />
      <AbsoluteFill style={{transform: `translate(${fx}px, ${-90 + fy}px) scale(${z * (1 + 0.012 * focusPull(frame))})`, transformOrigin: '540px 760px'}}>
        <OffthreadVideo
          src={staticFile('fg.webm')} transparent muted trimBefore={OFF_F}
          style={{width: 1080, height: 1920, filter: 'drop-shadow(0 24px 36px rgba(60,48,36,0.22)) saturate(0.96)'}}
        />
      </AbsoluteFill>
      {/* lower fade into the split line */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'linear-gradient(180deg, rgba(28,29,32,0) 0%, rgba(28,29,32,0.35) 100%)'}} />
    </div>
  );
};

// ---------- captions (on the split, inside the panel) ----------
type W = {t: string; s: number; e: number; h: boolean};
const PHRASES = captionsData as W[][];
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + OFF;
  let idx = -1;
  for (let i = 0; i < PHRASES.length; i++) {
    const p = PHRASES[i];
    const st = p[0].s - 0.08;
    const nx = i + 1 < PHRASES.length ? PHRASES[i + 1][0].s - 0.08 : 99;
    if (t >= st && t < Math.min(nx, p[p.length - 1].e + 0.8)) idx = i;
  }
  if (idx < 0) return null;
  const p = PHRASES[idx];
  const f0 = F(p[0].s - 0.08);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: SPLIT + 34, height: 70, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontFamily: BODY, fontWeight: 700, fontSize: 48, whiteSpace: 'nowrap', opacity: ramp(frame, f0, f0 + 5)}}>
        {p.map((w, i) => {
          const wp = ramp(frame, F(w.s - 0.03), F(w.s - 0.03) + 5);
          return (
            <span key={i}>
              <span style={{display: 'inline-block', color: w.h && wp > 0.5 ? ACC : TEXT, opacity: 0.32 + 0.68 * wp, transform: `translateY(${(1 - wp) * 6}px)`}}>{w.t}</span>
              {i < p.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- process explainer ----------
const Label: React.FC<{text: string; color?: string; size?: number}> = ({text, color = MUTE, size = 22}) => (
  <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: size, letterSpacing: '0.2em', color}}>{text}</div>
);

const Check: React.FC<{size?: number; p?: number; color?: string}> = ({size = 30, p = 1, color = PANEL}) => (
  <svg width={size} height={size} viewBox="0 0 30 30">
    <path d="M7 15.5l5 5 11-12" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="30" strokeDashoffset={30 * (1 - p)} />
  </svg>
);

const ICON: Record<string, React.ReactNode> = {
  table: <g fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="9" width="36" height="30" rx="4" /><path d="M6 19h36M6 29h36M18 9v30M30 9v30" /></g>,
  plug: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="14" cy="24" r="6" /><circle cx="34" cy="14" r="6" /><circle cx="34" cy="34" r="6" /><path d="M19 21l10-5M19 27l10 5" /></g>,
  credits: <g fill="none" stroke="currentColor" strokeWidth="3"><ellipse cx="24" cy="14" rx="13" ry="5" /><path d="M11 14v10c0 3 6 5 13 5s13-2 13-5V14" /><path d="M11 24v10c0 3 6 5 13 5s13-2 13-5V24" /></g>,
  pipe: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M8 12h32l-10 12v12l-12 4V24z" strokeLinejoin="round" /></g>,
  play: <g><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M20 16l12 8-12 8z" fill="currentColor" /></g>,
  mentor: <g fill="none" stroke="currentColor" strokeWidth="3"><circle cx="24" cy="17" r="8" /><path d="M9 41c2-9 8-13 15-13s13 4 15 13" strokeLinecap="round" /></g>,
};
const Icon: React.FC<{k: string; size?: number; color?: string}> = ({k, size = 48, color = TEXT}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{color}}>{ICON[k]}</svg>
);

// scene envelope: calm fade + rise + slight defocus
const Scene: React.FC<{frame: number; from: number; to: number; children: React.ReactNode}> = ({frame, from, to, children}) => {
  const fi = F(from);
  const fo = F(to);
  if (frame < fi || frame >= fo + 10) return null;
  const a = ramp(frame, fi, fi + 12);
  const b = ramp(frame, fo, fo + 10, 0, 1, Easing.in(Easing.cubic));
  const v = a * (1 - b);
  return (
    <AbsoluteFill style={{
      opacity: v, transform: `translateY(${(1 - a) * 28 - b * 20}px)`, filter: v < 0.98 ? `blur(${(1 - v) * 6}px)` : undefined,
      WebkitMaskImage: a < 1 ? `linear-gradient(90deg, #000 ${a * 120 - 20}%, transparent ${a * 120}%)` : undefined,
    }}>
      {children}
    </AbsoluteFill>
  );
};

const HEADER_Y = SPLIT + 140;
const SectionHeader: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS + OFF;
  const items: [number, number, string][] = [
    [2.5, 9.3, 'WHERE IT STARTS'], [9.42, 16.6, 'THE COMMON COMPLAINT'], [16.72, 31.2, 'THE PROBLEM'],
    [31.32, 44.9, 'THE FIX'], [44.98, 99, 'NEXT STEP'],
  ];
  const it = items.find(([a, b]) => t >= a && t < b);
  if (!it) return null;
  const f0 = F(it[0]);
  const w = ramp(frame, f0, f0 + 12);
  return (
    <div style={{position: 'absolute', left: 72, top: HEADER_Y, display: 'flex', alignItems: 'center', gap: 16}}>
      <div style={{width: 34 * w, height: 2, background: ACC}} />
      <div style={{clipPath: `inset(0 ${100 - w * 100}% 0 0)`}}><Label text={it[2]} /></div>
    </div>
  );
};

// S0: every Clay video watched, still no results
const StartScene: React.FC<{frame: number}> = ({frame}) => {
  const lineP = ramp(frame, F(7.6), F(8.6));
  return (
    <div style={{position: 'absolute', left: 72, top: HEADER_Y + 64, width: 936}}>
      <div style={{display: 'flex', gap: 16}}>
        {[0, 1, 2, 3, 4].map((i) => {
          const fi = F(3.64) + i * 6;
          const p = soft(frame, fi);
          const ck = ramp(frame, fi + 8, fi + 16);
          return (
            <div key={i} style={{position: 'relative', width: 172, height: 120, borderRadius: 16, background: CARD, border: `1.5px solid ${LINE}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
              <Icon k="play" size={46} color={DIM} />
              <div style={{position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, background: ACC, opacity: ck, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Check size={24} p={ck} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 22, opacity: soft(frame, F(4.2))}}><Label text="EVERY CLAY VIDEO, WATCHED" color={TEXT} size={24} /></div>
      <div style={{marginTop: 34, display: 'flex', alignItems: 'center', gap: 28, opacity: soft(frame, F(5.88))}}>
        <svg width="420" height="110" viewBox="0 0 420 110">
          <path d="M10 10v90h400" fill="none" stroke={LINE} strokeWidth="2" />
          <path d={`M14 88 L${14 + 392 * lineP} 88`} stroke={ACC} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div>
          <Label text="RESULTS" />
          <Kinetic text="Still flat." at={7.82} frame={frame} style={{marginTop: 8, fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: TEXT}} />
        </div>
      </div>
    </div>
  );
};

// S1: the complaint
const ComplaintScene: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', left: 72, top: HEADER_Y + 70, width: 936}}>
    <div style={{fontFamily: 'Georgia, serif', fontSize: 150, lineHeight: 0.6, color: ACC, opacity: soft(frame, F(9.42)), height: 70}}>“</div>
    <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: 56, lineHeight: 1.14, color: TEXT, letterSpacing: '-0.01em'}}>
      <Kinetic text="I've gone through every Clay video." at={9.6} frame={frame} />
      <Kinetic text="Still no results." at={10.3} frame={frame} style={{color: MUTE}} />
    </div>
    <div style={{marginTop: 30, display: 'flex', alignItems: 'center', gap: 14, opacity: soft(frame, F(10.64))}}>
      <div style={{width: 40, height: 2, background: LINE}} />
      <Label text="EVERY LEAD GEN AGENCY OWNER" size={22} />
    </div>
  </div>
);

// S2–S3: the workflow (problem state -> fixed state)
type Node = {k: string; label: string; show: number; probTag: string; probAt: number; fixAt: number; fixTag: string; checkAt: number};
const NODES: Node[] = [
  {k: 'table', label: 'CLAY TABLE', show: 16.94, probTag: 'UNUSED', probAt: 22.46, fixAt: 38.64, fixTag: 'IN USE', checkAt: 43.02},
  {k: 'plug', label: 'INTEGRATIONS', show: 19.74, probTag: 'WHICH ONES?', probAt: 19.74, fixAt: 40.28, fixTag: 'RIGHT STACK', checkAt: 43.3},
  {k: 'credits', label: 'CREDITS', show: 25.04, probTag: 'HOW TO USE?', probAt: 26.8, fixAt: 42.32, fixTag: 'USED WELL', checkAt: 43.44},
  {k: 'pipe', label: 'PIPELINE', show: 29.36, probTag: 'NOT BUILT', probAt: 29.36, fixAt: 42.78, fixTag: 'BUILT', checkAt: 43.64},
];
const NW = 210, NH = 206, GAP = 32, NX0 = 72, NY = HEADER_Y + 62;
const nx = (i: number) => NX0 + i * (NW + GAP);

const WorkflowScene: React.FC<{frame: number}> = ({frame}) => {
  const mentorIn = soft(frame, F(32.74));
  const rail = ramp(frame, F(36.42), F(39.36));
  const prog = ramp(frame, F(38.26), F(43.64), 0, 1, Easing.inOut(Easing.cubic));
  return (
    <>
      {/* connectors */}
      <svg width="1080" height="840" style={{position: 'absolute', left: 0, top: SPLIT}}>
        {[0, 1, 2].map((i) => {
          const a = NODES[i + 1];
          const shown = soft(frame, F(a.show));
          const fixed = ramp(frame, F(NODES[i].fixAt), F(a.fixAt));
          const x1 = nx(i) + NW, x2 = nx(i + 1), y = NY - SPLIT + NH / 2;
          return (
            <g key={i} opacity={shown}>
              <line x1={x1 + 6} y1={y} x2={x2 - 6} y2={y} stroke={DIM} strokeWidth="2.5" strokeDasharray="6 7" />
              <line x1={x1 + 6} y1={y} x2={x1 + 6 + (x2 - x1 - 12) * fixed} y2={y} stroke={ACC} strokeWidth="3.5" strokeLinecap="round" />
              {fixed >= 1 && <circle cx={x1 + 6 + (x2 - x1 - 12) * (((frame + i * 9) % 30) / 30)} cy={y} r="5" fill="#F1DCCB" style={{filter: 'drop-shadow(0 0 6px rgba(232,200,175,0.9))'}} />}
            </g>
          );
        })}
      </svg>
      {NODES.map((n, i) => {
        const sp = soft(frame, F(n.show));
        if (sp <= 0) return null;
        const prob = soft(frame, F(n.probAt));
        const fix = ramp(frame, F(n.fixAt), F(n.fixAt) + 14);
        const ck = ramp(frame, F(n.checkAt), F(n.checkAt) + 10);
        const unused = n.k === 'table' ? prob * (1 - fix) : 0;
        const dashed = n.k === 'pipe' && fix < 0.5;
        return (
          <div key={n.k} style={{
            position: 'absolute', left: nx(i), top: NY, width: NW, height: NH, borderRadius: 24, boxSizing: 'border-box',
            background: fix > 0 ? `rgba(196,154,124,${0.10 * fix})` : CARD,
            border: `2px ${dashed ? 'dashed' : 'solid'} ${fix > 0.5 ? ACC : LINE}`,
            opacity: sp * (1 - 0.45 * unused), transform: `translateY(${(1 - sp) * 24}px)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28,
          }}>
            <Sweep frame={frame} f0={F(n.show) + 6} />
            <Sweep frame={frame} f0={F(n.fixAt) + 4} strength={0.24} />
            <EdgeLight frame={frame} o={interpolate(frame, [F(n.fixAt), F(n.fixAt) + 8, F(n.checkAt) + 30, F(n.checkAt) + 50], [0, 1, 1, 0], clamp)} />
            <div style={{position: 'absolute', left: 16, top: 14, fontFamily: HEAD, fontWeight: 800, fontSize: 18, color: DIM, letterSpacing: '0.1em'}}>0{i + 1}</div>
            <Icon k={n.k} size={58} color={fix > 0.5 ? ACC : TEXT} />
            <div style={{marginTop: 16, fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: TEXT, letterSpacing: '0.04em'}}>{n.label}</div>
            <div style={{position: 'absolute', bottom: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
              <div style={{position: 'relative', height: 32}}>
                <div style={{opacity: prob * (1 - fix), padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${DIM}`,
                  fontFamily: HEAD, fontWeight: 800, fontSize: 18, letterSpacing: '0.1em', color: MUTE, whiteSpace: 'nowrap'}}>{n.probTag}</div>
                <div style={{position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', opacity: fix, padding: '5px 12px', borderRadius: 8,
                  background: ACC, fontFamily: HEAD, fontWeight: 800, fontSize: 18, letterSpacing: '0.1em', color: PANEL, whiteSpace: 'nowrap'}}>{n.fixTag}</div>
              </div>
            </div>
            <div style={{position: 'absolute', right: -12, top: -12, width: 40, height: 40, borderRadius: 20, background: ACC,
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ck, transform: `scale(${0.7 + 0.3 * ck})`, boxShadow: `0 0 0 5px ${PANEL}`}}>
              <Check size={28} p={ck} />
            </div>
          </div>
        );
      })}
      {/* mentor: joins below the workflow and guides every step */}
      <div style={{position: 'absolute', left: 72, top: NY + NH + 46, width: 936, opacity: mentorIn, transform: `translateY(${(1 - mentorIn) * 18}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <div style={{width: 62, height: 62, borderRadius: 31, border: `2px solid ${ACC}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon k="mentor" size={38} color={ACC} />
          </div>
          <div>
            <Label text="MENTOR" color={ACC} />
            {frame < F(36.42)
              ? <Kinetic key="a" text="Someone to help you out" at={32.9} frame={frame} style={{marginTop: 4, fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: TEXT}} />
              : <Kinetic key="b" text="With you through the complete workflow" at={36.42} frame={frame} style={{marginTop: 4, fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: TEXT}} />}
          </div>
        </div>
        <div style={{marginTop: 22, height: 6, borderRadius: 3, background: LINE, opacity: rail > 0 ? 1 : 0}}>
          <div style={{position: 'relative', height: 6, borderRadius: 3, background: ACC, width: `${prog * 100}%`, boxShadow: '0 0 14px rgba(196,154,124,0.5)', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: 0, bottom: 0, width: 80, left: `${((frame % 45) / 45) * 120 - 20}%`, background: 'linear-gradient(90deg, rgba(255,240,228,0), rgba(255,240,228,0.8), rgba(255,240,228,0))'}} />
          </div>
        </div>
        <div style={{marginTop: 10, display: 'flex', justifyContent: 'space-between', opacity: rail}}>
          <Label text="EACH AND EVERY STEP" size={20} />
          <Label text={`${Math.round(prog * 4)} / 4`} size={20} color={prog > 0.99 ? ACC : MUTE} />
        </div>
      </div>
    </>
  );
};

// S4: spoken CTA
const ApplyScene: React.FC<{frame: number}> = ({frame}) => {
  const u = ramp(frame, F(46.08), F(46.08) + 16);
  return (
    <div style={{position: 'absolute', left: 72, top: HEADER_Y + 80, width: 936}}>
      <div style={{opacity: soft(frame, F(44.98))}}><Label text="JOIN THE COHORT" /></div>
      <div style={{position: 'relative', marginTop: 18}}>
        <Kinetic text="Sandbox GTM" at={45.5} accentFrom={8} frame={frame}
          style={{fontFamily: HEAD, fontWeight: 900, fontSize: 112, lineHeight: 1.05, color: TEXT, letterSpacing: '-0.02em'}} />
        {/* soft light pass across the wordmark once it settles */}
        <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.5,
          background: `linear-gradient(100deg, rgba(255,240,225,0) ${interpolate(frame % 90, [0, 30], [-30, 130], clamp)}%, rgba(255,240,225,0.6) ${interpolate(frame % 90, [0, 30], [-20, 140], clamp)}%, rgba(255,240,225,0) ${interpolate(frame % 90, [0, 30], [-10, 150], clamp)}%)`,
          WebkitMaskImage: 'linear-gradient(#000,#000)', display: frame > F(46.2) ? 'block' : 'none'}} />
      </div>
      <div style={{marginTop: 22, width: 520 * u, height: 3, background: ACC}} />
      <div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 16, opacity: soft(frame, F(44.98))}}>
        <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: TEXT}}>Apply now</div>
        <svg width="44" height="24" viewBox="0 0 44 24" style={{transform: `translateX(${Math.sin(frame / 8) * 4}px)`}}>
          <path d="M2 12h36M28 3l10 9-10 9" fill="none" stroke={ACC} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

const ProcessPanel: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, top: SPLIT, width: 1080, height: 1920 - SPLIT, background: PANEL}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(196,154,124,0.07), rgba(0,0,0,0) 70%)'}} />
      <div style={{position: 'absolute', left: 540 - 540 * ramp(frame, 0, 18), width: 1080 * ramp(frame, 0, 18), top: 0, height: 2, background: 'rgba(196,154,124,0.6)', boxShadow: '0 0 18px rgba(196,154,124,0.45)'}} />
      <div style={{position: 'absolute', left: 72, right: 72, top: 122, height: 1, background: LINE}} />
      <div style={{position: 'absolute', inset: 0, top: -SPLIT}}>
        <Scene frame={frame} from={2.5} to={9.3}><StartScene frame={frame} /></Scene>
        <Scene frame={frame} from={9.42} to={16.6}><ComplaintScene frame={frame} /></Scene>
        <Scene frame={frame} from={16.72} to={44.9}><WorkflowScene frame={frame} /></Scene>
        <Scene frame={frame} from={44.98} to={99}><ApplyScene frame={frame} /></Scene>
      </div>
    </div>
  );
};

// muted warm light leaks on section changes (low opacity, peach/sand, never saturated)
const LightLeaks: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {[2.5, ...SECTIONS].map((t, j) => {
        const f0 = F(t);
        if (frame < f0 - 3 || frame > f0 + 30) return null;
        const o = interpolate(frame, [f0 - 3, f0 + 3, f0 + 30], [0, j === 0 ? 0.3 : 0.38, 0], clamp);
        const dir = j % 2 ? -1 : 1;
        const x = interpolate(frame, [f0 - 3, f0 + 30], dir > 0 ? [-10, 85] : [110, 15], clamp);
        return (
          <AbsoluteFill key={t} style={{mixBlendMode: 'screen', opacity: o,
            background: `radial-gradient(ellipse 40% 50% at ${x}% 30%, rgba(240,200,165,0.9) 0%, rgba(220,170,135,0.35) 40%, rgba(200,150,120,0) 70%),
              radial-gradient(ellipse 18% 70% at ${x + dir * 20}% 58%, rgba(250,228,205,0.5) 0%, rgba(250,228,205,0) 70%)`}} />
        );
      })}
    </>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: 0.08}}>
      <img src={staticFile(`grain${frame % 8}.png`)} style={{width: 1080, height: 1920}} />
    </AbsoluteFill>
  );
};

export const Ad004: React.FC = () => (
  <AbsoluteFill style={{background: PANEL}}>
    <FxDefs />
    <PresenterHalf />
    <ProcessPanel />
    <SectionHeader />
    <Captions />
    <LightLeaks />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.28) 100%)'}} />
    <Grain />
  </AbsoluteFill>
);
