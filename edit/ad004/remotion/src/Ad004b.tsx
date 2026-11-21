import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate, Easing, delayRender, continueRender} from 'remotion';
import caps from './captions_cut.json';
import cuts from './cuts.json';
import {LENSMAP} from './lensmap';

// ---------- fonts ----------
const fh = delayRender('fonts');
Promise.all([
  ['InterTight', 'inter-tight-latin-800-normal.woff2', '800'], ['InterTight', 'inter-tight-latin-900-normal.woff2', '900'],
  ['Inter', 'inter-latin-700-normal.woff2', '700'], ['Inter', 'inter-latin-800-normal.woff2', '800'],
].map(([f, file, w]) => new FontFace(f, `url(${staticFile(file)}) format('woff2')`, {weight: w}).load().then((x) => document.fonts.add(x))))
  .then(() => continueRender(fh));

// ---------- tokens (muted) — all times are seconds on the CUT timeline ----------
const FPS = 30;
const F = (t: number) => Math.round(t * FPS);
const INK = '#2A2A2D';
const TEXT = '#F1ECE4';
const MUTE_D = 'rgba(42,42,45,0.55)';
const MUTE_L = 'rgba(241,236,228,0.6)';
const ACC = '#BE9273';
const HEAD = 'InterTight, Inter, sans-serif';
const BODY = 'Inter, sans-serif';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const out = Easing.out(Easing.cubic);
const ramp = (f: number, a: number, b: number, x = 0, y = 1, e = out) => interpolate(f, [a, b], [x, y], {...clamp, easing: e});
const CUTS: number[] = (cuts as {cum: number[]}).cum;
const DUR = (cuts as {dur: number}).dur;

// ---------- camera: punch-in alternates on every cut (hides the jump, adds rhythm) ----------
const ZS: [number, number][] = [[1.0, 1.02], [1.1, 1.11], [1.0, 1.02], [1.12, 1.13], [1.03, 1.05], [1.0, 1.03], [1.1, 1.11], [1.02, 1.04], [1.1, 1.11],
  [1.05, 1.07], [1.0, 1.02], [1.08, 1.09], [1.0, 1.08], [1.06, 1.07], [1.0, 1.05]];
const cam = (frame: number) => {
  const t = frame / FPS;
  let i = 0;
  while (i < CUTS.length - 1 && CUTS[i + 1] <= t) i++;
  const s = CUTS[i], e = i + 1 < CUTS.length ? CUTS[i + 1] : DUR;
  const [a, b] = ZS[Math.min(i, ZS.length - 1)];
  const kick = i > 0 ? Math.max(0, 1 - (frame - F(s)) / 4) : 0;
  return {z: (a + (b - a) * Math.min(1, (t - s) / (e - s))) * (1 + 0.025 * kick), blur: 3 * kick};
};
const BEATS = [5.73, 9.95, 16.07, 21.63, 24.22, 33.1];
const LENS_AT = [9.95, 21.63, 33.1];
const lensK = (frame: number) => Math.max(0, ...LENS_AT.map((t) => interpolate(frame, [F(t) - 2, F(t), F(t) + 10], [0, 1, 0], clamp)));
const focus = (frame: number) => interpolate(frame, [F(21.63), F(21.63) + 12, F(24.0), F(24.22) + 8], [0, 1, 1, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});

// ---------- backdrop ----------
const Backdrop: React.FC<{frame: number; z: number}> = ({frame, z}) => {
  const fp = focus(frame);
  return (
    <AbsoluteFill style={{transform: `scale(${(1 + (z - 1) * 0.3) * (1 + 0.03 * fp)}) translateX(${Math.sin(frame / 240) * 14}px)`, transformOrigin: '540px 600px',
      filter: fp > 0.01 ? `blur(${fp * 9}px)` : undefined}}>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #E3DCD1 0%, #D6CDC0 55%, #C4BAAB 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 46% 30% at 50% 30%, rgba(255,251,244,0.85) 0%, rgba(255,251,244,0) 70%)'}} />
      <div style={{position: 'absolute', left: 250, top: 160, width: 580, height: 1500, borderRadius: '290px 290px 0 0', background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.04))', filter: 'blur(6px)'}} />
      {[90, 170, 910, 990].map((x) => <div key={x} style={{position: 'absolute', left: x, top: 0, width: 3, height: 1920, background: 'rgba(120,108,94,0.1)', filter: 'blur(2px)'}} />)}
      {Array.from({length: 16}).map((_, i) => {
        const sz = 12 + ((i * 37) % 28);
        const y = 1900 - ((frame * (0.4 + (i % 5) * 0.12) + i * 150) % 2000);
        return <div key={i} style={{position: 'absolute', left: ((i * 197) % 1040) + 20 + Math.sin((frame + i * 40) / 60) * 12, top: y, width: sz, height: sz, borderRadius: sz,
          background: 'rgba(255,248,238,0.6)', filter: `blur(${3 + (i % 3) * 2}px)`, opacity: 0.3 + (i % 4) * 0.1}} />;
      })}
    </AbsoluteFill>
  );
};

// ---------- 3D floating card ----------
type CardP = {x: number; y: number; w: number; h?: number; at: number; until: number; from?: [number, number]; ry?: number; rx?: number; rz?: number;
  depth?: number; phase?: number; tone?: 'light' | 'dark' | 'none'; radius?: number; to?: {x: number; y: number; t: number}; children?: React.ReactNode};
const Card: React.FC<CardP & {frame: number; z: number}> = ({frame, z, x, y, w, h, at, until, from = [0, 160], ry = 0, rx = 0, rz = 0, depth = 0, phase = 0, tone = 'light', radius = 26, to, children}) => {
  const f0 = F(at), f1 = F(until);
  if (frame < f0 || frame > f1 + 14) return null;
  const p = ramp(frame, f0, f0 + 16, 0, 1, Easing.out(Easing.back(1.2)));
  const q = ramp(frame, f1, f1 + 13, 0, 1, Easing.in(Easing.cubic));
  let cx = x, cy = y;
  if (to) { const m = ramp(frame, F(to.t), F(to.t) + 16, 0, 1, Easing.inOut(Easing.cubic)); cx = x + (to.x - x) * m; cy = y + (to.y - y) * m; }
  const par = 1 - depth;
  const px = (cx - 540) * (z - 1) * par * 0.8, py = (cy - 760) * (z - 1) * par * 0.8; // follows the camera punch-ins
  const fy = Math.sin(frame / 34 + phase) * 9, fr = Math.sin(frame / 52 + phase) * 4;
  const scale = (1 - depth * 0.22) * (0.75 + 0.25 * p) * (1 + 0.15 * q);
  const style: React.CSSProperties = {
    position: 'absolute', left: cx + px - w / 2, top: cy + py + fy - (h ?? 0) / 2, width: w, height: h, borderRadius: radius, boxSizing: 'border-box',
    transform: `translate(${(1 - p) * from[0]}px, ${(1 - p) * from[1]}px) translateZ(${-260 * (1 - p) - 200 * q}px) rotateX(${rx * 1 + (1 - p) * 25}deg) rotateY(${ry + fr + (1 - p) * (from[0] > 0 ? -40 : 40)}deg) rotateZ(${rz}deg) scale(${scale})`,
    opacity: Math.min(1, p * 1.4) * (1 - q), filter: `blur(${depth * 2.5 + (1 - p) * 8 + q * 8}px)`,
    ...(tone === 'light' ? {background: 'rgba(250,247,242,0.82)', border: '1.5px solid rgba(255,255,255,0.9)', color: INK, boxShadow: '0 30px 60px rgba(60,46,32,0.25), inset 0 1px 0 rgba(255,255,255,0.9)'} : {}),
    ...(tone === 'dark' ? {background: 'rgba(30,30,33,0.86)', border: '1.5px solid rgba(255,255,255,0.12)', color: TEXT, boxShadow: '0 34px 70px rgba(30,22,14,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'} : {}),
  };
  return <div style={style}>{children}<Shine frame={frame} f0={f0 + 10} radius={radius} /></div>;
};
const Shine: React.FC<{frame: number; f0: number; radius: number}> = ({frame, f0, radius}) => {
  if (frame < f0 || frame > f0 + 22) return null;
  const x = interpolate(frame, [f0, f0 + 22], [-130, 130], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${x}%)`, background: 'linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 65%)'}} /></div>;
};

// ---------- small parts ----------
const Lbl: React.FC<{t: string; c?: string; s?: number}> = ({t, c = MUTE_D, s = 18}) => <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: s, letterSpacing: '0.16em', color: c}}>{t}</div>;
const ICON: Record<string, React.ReactNode> = {
  play: <g><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M20 16l12 8-12 8z" fill="currentColor" /></g>,
  table: <g fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="9" width="36" height="30" rx="4" /><path d="M6 19h36M6 29h36M18 9v30M30 9v30" /></g>,
  plug: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="14" cy="24" r="6" /><circle cx="34" cy="14" r="6" /><circle cx="34" cy="34" r="6" /><path d="M19 21l10-5M19 27l10 5" /></g>,
  credits: <g fill="none" stroke="currentColor" strokeWidth="3"><ellipse cx="24" cy="14" rx="13" ry="5" /><path d="M11 14v10c0 3 6 5 13 5s13-2 13-5V14" /><path d="M11 24v10c0 3 6 5 13 5s13-2 13-5V24" /></g>,
  pipe: <path d="M8 12h32l-10 12v12l-12 4V24z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />,
  mentor: <g fill="none" stroke="currentColor" strokeWidth="3"><circle cx="24" cy="17" r="8" /><path d="M9 41c2-9 8-13 15-13s13 4 15 13" strokeLinecap="round" /></g>,
  bolt: <path d="M27 5L11 27h11l-3 16 18-24H26z" fill="currentColor" />,
  mail: <g fill="none" stroke="currentColor" strokeWidth="3"><rect x="7" y="12" width="34" height="24" rx="3" /><path d="M8 14l16 12 16-12" /></g>,
  chart: <g fill="currentColor"><rect x="9" y="26" width="7" height="14" rx="1" /><rect x="20" y="17" width="7" height="23" rx="1" /><rect x="31" y="9" width="7" height="31" rx="1" /></g>,
  gear: <g><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="4" />{[0, 60, 120, 180, 240, 300].map((a) => <rect key={a} x="22" y="5" width="4" height="8" rx="1" fill="currentColor" transform={`rotate(${a} 24 24)`} />)}</g>,
};
const Ic: React.FC<{k: string; s?: number; c?: string}> = ({k, s = 44, c = INK}) => <svg width={s} height={s} viewBox="0 0 48 48" style={{color: c}}>{ICON[k]}</svg>;
const Check: React.FC<{p: number; s?: number}> = ({p, s = 34}) => (
  <div style={{width: s, height: s, borderRadius: s, background: ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * p})`, opacity: p}}>
    <svg width={s * 0.7} height={s * 0.7} viewBox="0 0 30 30"><path d="M7 15.5l5 5 11-12" fill="none" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset={30 * (1 - p)} /></svg>
  </div>
);
const Kin: React.FC<{t: string; at: number; frame: number; style?: React.CSSProperties; acc?: number}> = ({t, at, frame, style, acc}) => (
  <div style={{whiteSpace: 'nowrap', ...style}}>
    {t.split('').map((ch, i) => {
      const p = ramp(frame, F(at) + i * 0.8, F(at) + i * 0.8 + 9);
      return <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: p, color: acc !== undefined && i >= acc ? ACC : undefined, transform: `translateY(${(1 - p) * 40}px)`, filter: p < 0.99 ? `blur(${(1 - p) * 7}px)` : undefined}}>{ch}</span>;
    })}
  </div>
);
// generic avatar "floating head" (abstract, not a real person)
const AV = ['#A7A08F', '#8E9A8C', '#9AA3AC', '#B9A48E', '#A39087', '#8F8A99', '#B3AA97'];
const Avatar: React.FC<{i: number; s: number}> = ({i, s}) => (
  <div style={{width: s, height: s, borderRadius: s, background: `linear-gradient(160deg, ${AV[i % 7]}, #6F6A62)`, border: '4px solid rgba(255,255,255,0.92)', overflow: 'hidden', position: 'relative', boxShadow: '0 22px 44px rgba(60,46,32,0.28)'}}>
    <div style={{position: 'absolute', left: '30%', top: '18%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(255,255,255,0.55)'}} />
    <div style={{position: 'absolute', left: '12%', top: '62%', width: '76%', height: '60%', borderRadius: '50%', background: 'rgba(255,255,255,0.55)'}} />
  </div>
);

// ---------- the element choreography ----------
type El = CardP & {layer: 'back' | 'front'};
const H = 230; // hero card height (front, lower third)
const els = (frame: number): El[] => {
  const L: El[] = [];
  // B1 — every Clay video watched, still no results
  const thumbs: [number, number, number, number][] = [[170, 380, -18, 0.2], [905, 330, 16, 0.35], [120, 820, -14, 0.5], [960, 790, 18, 0.65], [540, 300, 0, 0.8]];
  thumbs.forEach(([x, y, r, d], i) => L.push({layer: 'back', x, y, w: 244, h: 162, ry: r, at: 0.5 + i * 0.22, until: 5.6, depth: i === 4 ? 0.5 : 0.2, phase: i, from: [x < 540 ? -200 : 200, 60],
    children: <div style={{position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Ic k="play" s={52} c={MUTE_D} />
      <div style={{position: 'absolute', left: 16, bottom: 14, width: 110, height: 8, borderRadius: 4, background: 'rgba(42,42,45,0.18)'}} />
      <div style={{position: 'absolute', right: -12, top: -12}}><Check p={ramp(frame, F(1.6 + i * 0.18), F(1.6 + i * 0.18) + 8)} /></div>
    </div>}));
  L.push({layer: 'front', x: 540, y: 1470, w: 640, h: H, at: 3.95, until: 5.6, tone: 'dark', rx: 8,
    children: <div style={{padding: '26px 32px', display: 'flex', gap: 30, alignItems: 'center', height: '100%', boxSizing: 'border-box'}}>
      <svg width="300" height="150" viewBox="0 0 300 150"><path d="M10 10v130h280" fill="none" stroke="rgba(241,236,228,0.2)" strokeWidth="2" /><path d={`M14 122 L${14 + 270 * ramp(frame, F(4.6), F(5.3))} 122`} stroke={ACC} strokeWidth="5" strokeLinecap="round" /></svg>
      <div><Lbl t="RESULTS" c={MUTE_L} /><Kin t="Still flat." at={4.85} frame={frame} style={{marginTop: 10, fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: TEXT}} /></div>
    </div>});
  // B2 — floating heads: every lead gen agency owner
  const heads: [number, number, number, 'back' | 'front'][] = [[160, 420, 150, 'back'], [920, 380, 130, 'back'], [110, 880, 120, 'back'], [975, 860, 140, 'back'], [540, 290, 110, 'back'], [105, 1380, 100, 'front'], [975, 1390, 104, 'front']];
  heads.forEach(([x, y, s, layer], i) => L.push({layer, x, y, w: s, h: s, tone: 'none', radius: s, at: 6.9 + i * 0.2, until: 9.85, depth: layer === 'back' ? 0.25 : 0, phase: i * 1.3, from: [x < 540 ? -180 : 180, 40],
    children: <div style={{position: 'relative'}}><Avatar i={i} s={s} />
      <div style={{position: 'absolute', right: -26, top: -18, padding: '6px 12px', borderRadius: 14, background: 'rgba(250,247,242,0.95)', fontFamily: HEAD, fontWeight: 900, fontSize: 20, color: INK, boxShadow: '0 10px 20px rgba(0,0,0,0.12)', opacity: ramp(frame, F(7.3 + i * 0.2), F(7.3 + i * 0.2) + 8)}}>···</div></div>}));
  L.push({layer: 'front', x: 540, y: 1470, w: 680, h: 200, at: 5.95, until: 9.85, tone: 'dark', rx: 8,
    children: <div style={{padding: '30px 36px'}}><Lbl t="THE COMPLAINT" c={ACC} /><Kin t="Every Clay video." at={6.2} frame={frame} style={{marginTop: 12, fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: TEXT}} />
      <Kin t="Still no results." at={6.7} frame={frame} style={{fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: MUTE_L}} /></div>});
  // B3 — Clay table, integrations/features, unused
  const unused = ramp(frame, F(15.63), F(15.63) + 10);
  L.push({layer: 'front', x: 540, y: 1475, w: 720, h: 250, at: 10.17, until: 15.95, rx: 10,
    children: <div style={{padding: 22, position: 'relative', height: '100%', boxSizing: 'border-box', filter: `grayscale(${unused}) opacity(${1 - 0.35 * unused})`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}><Ic k="table" s={34} /><div style={{fontFamily: HEAD, fontWeight: 900, fontSize: 28, color: INK}}>Clay table</div></div>
      <div style={{marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10}}>
        {Array.from({length: 12}).map((_, i) => <div key={i} style={{height: 34, borderRadius: 8, background: i < 4 ? 'rgba(190,146,115,0.28)' : 'rgba(42,42,45,0.08)', opacity: ramp(frame, F(10.5) + i, F(10.5) + i + 6)}} />)}
      </div>
    </div>});
  L.push({layer: 'front', x: 760, y: 1385, w: 230, h: 76, tone: 'none', at: 15.63, until: 15.95, rz: -8,
    children: <div style={{border: `4px solid ${INK}`, borderRadius: 12, padding: '8px 18px', fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: INK, letterSpacing: '0.1em', background: 'rgba(250,247,242,0.9)', transform: `scale(${1.6 - 0.6 * unused})`}}>UNUSED</div>});
  const chips: [number, number, string][] = [[150, 360, 'plug'], [930, 330, 'bolt'], [110, 760, 'mail'], [970, 720, 'chart'], [300, 1150, 'gear'], [800, 1160, 'plug']];
  chips.forEach(([x, y, k], i) => L.push({layer: i >= 4 ? 'front' : 'back', x, y, w: 138, h: 138, at: 12.9 + i * 0.15, until: 15.95, depth: i >= 4 ? 0 : 0.2, phase: i * 0.9, ry: x < 540 ? -20 : 20, from: [x < 540 ? -160 : 160, 0],
    children: <div style={{position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ic k={k} s={54} />
      <div style={{position: 'absolute', right: -10, top: -10, width: 36, height: 36, borderRadius: 18, background: INK, color: TEXT, fontFamily: HEAD, fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>?</div></div>}));
  L.push({layer: 'back', x: 540, y: 300, w: 300, h: 70, at: 13.79, until: 15.95, depth: 0.3, tone: 'dark', radius: 35,
    children: <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Lbl t="WHICH FEATURES?" c={TEXT} s={20} /></div>});
  // B4 — credits, pipeline
  L.push({layer: 'back', x: 210, y: 600, w: 260, h: 236, at: 17.2, until: 21.55, ry: -22, depth: 0.15, phase: 1, from: [-220, 0],
    children: <div style={{padding: 22}}><Ic k="credits" s={46} /><div style={{marginTop: 8, fontFamily: HEAD, fontWeight: 900, fontSize: 28}}>Credits</div>
      <div style={{marginTop: 12, height: 10, borderRadius: 5, background: 'rgba(42,42,45,0.12)'}}><div style={{width: `${60 * ramp(frame, F(17.4), F(18.4))}%`, height: 10, borderRadius: 5, background: ACC}} /></div>
      <div style={{marginTop: 12}}><Lbl t="WHICH ONES?" /></div></div>});
  L.push({layer: 'back', x: 905, y: 540, w: 240, h: 92, at: 18.8, until: 21.55, ry: 22, depth: 0.15, phase: 2, tone: 'dark', radius: 46, from: [220, 0],
    children: <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Lbl t="HOW TO USE?" c={TEXT} s={20} /></div>});
  L.push({layer: 'front', x: 540, y: 1475, w: 720, h: 220, at: 20.65, until: 21.55, tone: 'dark', rx: 8,
    children: <div style={{padding: '24px 30px'}}><div style={{display: 'flex', justifyContent: 'space-between'}}><Lbl t="PIPELINE" c={ACC} /><Lbl t="NOT BUILT" c={MUTE_L} /></div>
      <svg width="660" height="120" viewBox="0 0 660 120">{[60, 240, 420, 600].map((cx, i) => <g key={i}><circle cx={cx} cy="60" r="26" fill="none" stroke={i < 2 ? TEXT : 'rgba(241,236,228,0.3)'} strokeWidth="3" strokeDasharray={i < 2 ? undefined : '6 6'} />
        {i < 3 && <line x1={cx + 34} y1="60" x2={cx + 146} y2="60" stroke="rgba(241,236,228,0.35)" strokeWidth="3" strokeDasharray="8 8" />}</g>)}
        <path d="M318 44l14 32M332 44l-14 32" stroke={ACC} strokeWidth="4" strokeLinecap="round" /></svg></div>});
  // B5 — you need a mentor
  L.push({layer: 'front', x: 540, y: 1470, w: 600, h: 190, at: 23.0, until: 24.15, rx: 8,
    children: <div style={{padding: '30px 34px', display: 'flex', gap: 24, alignItems: 'center'}}>
      <div style={{width: 96, height: 96, borderRadius: 48, border: `3px solid ${ACC}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ic k="mentor" s={60} c={ACC} /></div>
      <div><Lbl t="MENTOR" c={ACC} /><div style={{marginTop: 8, fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: INK}}>To help you out</div></div></div>});
  // B6 — cohort: the complete workflow, built step by step
  L.push({layer: 'back', x: 880, y: 360, w: 250, h: 84, at: 24.72, until: 33.0, ry: 20, depth: 0.2, tone: 'dark', radius: 42, from: [200, 0],
    children: <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10}}><Ic k="mentor" s={30} c={ACC} /><Lbl t="THE COHORT" c={TEXT} s={20} /></div>});
  const steps: [string, string, string][] = [['table', 'CLAY TABLE', 'IN USE'], ['plug', 'INTEGRATIONS', 'RIGHT STACK'], ['credits', 'CREDITS', 'USED WELL'], ['pipe', 'PIPELINE', 'BUILT']];
  const checkT = [32.32, 32.6, 32.74, 32.94];
  steps.forEach(([k, lab, ok], i) => {
    const x = 165 + i * 250, ck = ramp(frame, F(checkT[i]), F(checkT[i]) + 8);
    const solved = i === 1 ? ramp(frame, F(30.6), F(30.6) + 10) : ck;
    L.push({layer: 'front', x, y: 1480 + Math.abs(i - 1.5) * -18, w: 220, h: 200, at: 28.4 + i * 0.15, until: 33.0, ry: (i - 1.5) * -12, rx: 10, phase: i, from: [0, 220],
      children: <div style={{position: 'relative', padding: 20, height: '100%', boxSizing: 'border-box', textAlign: 'center'}}>
        <Ic k={k} s={52} c={solved > 0.5 ? ACC : INK} />
        <div style={{marginTop: 10, fontFamily: HEAD, fontWeight: 900, fontSize: 21, letterSpacing: '0.04em'}}>{lab}</div>
        <div style={{marginTop: 12, display: 'inline-block', padding: '5px 12px', borderRadius: 8, background: solved > 0.5 ? ACC : 'rgba(42,42,45,0.08)', color: solved > 0.5 ? '#fff' : MUTE_D, fontFamily: HEAD, fontWeight: 800, fontSize: 15, letterSpacing: '0.1em'}}>{solved > 0.5 ? ok : '···'}</div>
        <div style={{position: 'absolute', right: -14, top: -14}}><Check p={ck} s={40} /></div>
      </div>});
  });
  // integration chips fly in and snap into step 02 on "integrate the right tech stack"
  [[140, 420, 'bolt'], [940, 400, 'mail'], [120, 900, 'chart'], [960, 880, 'gear']].forEach(([x, y, k], i) => L.push({layer: i < 2 ? 'back' : 'front', x: x as number, y: y as number, w: 100, h: 100, at: 29.78 + i * 0.08, until: 30.55,
    to: {x: 415, y: 1470, t: 30.0}, phase: i, children: <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ic k={k as string} s={46} c={ACC} /></div>}));
  // B7 — CTA
  L.push({layer: 'front', x: 540, y: 1460, w: 720, h: 250, at: 33.1, until: 99, tone: 'dark', rx: 8,
    children: <div style={{padding: '30px 38px', position: 'relative'}}>
      <Lbl t="JOIN THE COHORT" c={MUTE_L} />
      <Kin t="Sandbox GTM" at={33.69} acc={8} frame={frame} style={{marginTop: 10, fontFamily: HEAD, fontWeight: 900, fontSize: 92, lineHeight: 1, color: TEXT, letterSpacing: '-0.02em'}} />
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(frame, F(33.3), F(33.3) + 10)}}>
        <div style={{fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: ACC}}>Apply now</div>
        <svg width="40" height="22" viewBox="0 0 44 24" style={{transform: `translateX(${Math.sin(frame / 8) * 4}px)`}}><path d="M2 12h36M28 3l10 9-10 9" fill="none" stroke={ACC} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={{position: 'absolute', inset: -2, borderRadius: 28, padding: 2, background: `conic-gradient(from ${(frame * 3) % 360}deg, rgba(190,146,115,0) 0deg, rgba(232,205,184,0.95) 40deg, rgba(190,146,115,0) 100deg, rgba(190,146,115,0) 360deg)`,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude'}} />
    </div>});
  [[170, 420, 0], [920, 400, 2], [130, 860, 4], [960, 840, 6]].forEach(([x, y, i]) => L.push({layer: 'back', x, y, w: 120, h: 120, tone: 'none', radius: 60, at: 33.3 + i * 0.05, until: 99, depth: 0.3, phase: i,
    from: [x < 540 ? -160 : 160, 0], children: <Avatar i={i} s={120} />}));
  return L;
};

const Layer: React.FC<{which: 'back' | 'front'}> = ({which}) => {
  const frame = useCurrentFrame();
  const {z} = cam(frame);
  return (
    <AbsoluteFill style={{perspective: 1600, perspectiveOrigin: '540px 900px'}}>
      {els(frame).filter((e) => e.layer === which).map((e, i) => <Card key={i} {...e} frame={frame} z={z} />)}
    </AbsoluteFill>
  );
};

// ---------- headline (only for the turning point) ----------
const Headline: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < F(22.0) || frame > F(24.15) + 10) return null;
  const q = ramp(frame, F(24.15), F(24.15) + 9);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 228, textAlign: 'center', opacity: 1 - q, filter: q > 0 ? `blur(${q * 10}px)` : undefined}}>
      <Kin t="YOU NEED" at={22.33} frame={frame} style={{fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: INK, letterSpacing: '-0.01em', lineHeight: 1}} />
      <Kin t="A MENTOR" at={22.85} frame={frame} acc={2} style={{fontFamily: HEAD, fontWeight: 900, fontSize: 100, color: INK, lineHeight: 1}} />
    </div>
  );
};

// ---------- captions ----------
type Wd = {t: string; s: number; e: number; h: boolean};
const PH = caps as Wd[][];
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let idx = -1;
  PH.forEach((p, i) => {
    const st = p[0].s - 0.06, nx = i + 1 < PH.length ? PH[i + 1][0].s - 0.06 : 99;
    if (t >= st && t < Math.min(nx, p[p.length - 1].e + 0.7)) idx = i;
  });
  if (idx < 0) return null;
  const p = PH[idx], f0 = F(p[0].s - 0.06);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1236, display: 'flex', justifyContent: 'center'}}>
      <div style={{padding: '10px 24px 12px', borderRadius: 20, background: 'rgba(30,30,33,0.74)', backdropFilter: 'blur(10px)', fontFamily: BODY, fontWeight: 800, fontSize: 48, whiteSpace: 'nowrap',
        transform: `scale(${ramp(frame, f0, f0 + 5, 0.92, 1)})`, opacity: ramp(frame, f0, f0 + 4)}}>
        {p.map((w, i) => {
          const wp = ramp(frame, F(w.s - 0.03), F(w.s - 0.03) + 4);
          return <span key={i}><span style={{display: 'inline-block', color: w.h && wp > 0.5 ? '#D9B79C' : TEXT, opacity: 0.4 + 0.6 * wp, transform: `translateY(${(1 - wp) * 6}px)`}}>{w.t}</span>{i < p.length - 1 ? ' ' : ''}</span>;
        })}
      </div>
    </div>
  );
};

// ---------- presenter + finishing ----------
const FxDefs: React.FC = () => {
  const k = lensK(useCurrentFrame()), sp = 6 * k;
  return (
    <svg width="0" height="0" style={{position: 'absolute'}}><defs>
      <filter id="tfx" x="0" y="0" width="1080" height="1920" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={LENSMAP} x="0" y="0" width="1080" height="1920" preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={80 * k} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" /><feOffset in="r" dx={sp} result="ro" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" /><feOffset in="b" dx={-sp} result="bo" />
        <feBlend in="ro" in2="g" mode="screen" result="rg" /><feBlend in="rg" in2="bo" mode="screen" />
      </filter></defs></svg>
  );
};
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const {z, blur} = cam(frame);
  const k = lensK(frame);
  return (
    <AbsoluteFill style={{filter: k > 0.02 ? 'url(#tfx)' : undefined}}>
      <Backdrop frame={frame} z={z} />
      <Layer which="back" />
      <AbsoluteFill style={{transform: `translate(${Math.sin(frame / 47) * 3}px, ${Math.cos(frame / 61) * 3}px) scale(${z})`, transformOrigin: '540px 760px', filter: blur > 0.1 ? `blur(${blur}px)` : undefined}}>
        <OffthreadVideo src={staticFile('fg_cut.webm')} transparent muted style={{width: 1080, height: 1920, filter: 'drop-shadow(0 26px 40px rgba(60,46,32,0.25))'}} />
      </AbsoluteFill>
      <Layer which="front" />
    </AbsoluteFill>
  );
};
const Leaks: React.FC = () => {
  const frame = useCurrentFrame();
  return <>{BEATS.map((t, j) => {
    const f0 = F(t);
    if (frame < f0 - 3 || frame > f0 + 28) return null;
    const o = interpolate(frame, [f0 - 3, f0 + 3, f0 + 28], [0, 0.34, 0], clamp), d = j % 2 ? -1 : 1;
    const x = interpolate(frame, [f0 - 3, f0 + 28], d > 0 ? [-10, 85] : [110, 15], clamp);
    return <AbsoluteFill key={t} style={{mixBlendMode: 'screen', opacity: o, background: `radial-gradient(ellipse 40% 45% at ${x}% 30%, rgba(240,200,165,0.9) 0%, rgba(220,170,135,0.35) 40%, rgba(200,150,120,0) 70%)`}} />;
  })}</>;
};
const Grain: React.FC = () => <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: 0.08}}><img src={staticFile(`grain${useCurrentFrame() % 8}.png`)} style={{width: 1080, height: 1920}} /></AbsoluteFill>;

export const Ad004b: React.FC = () => (
  <AbsoluteFill style={{background: '#CFC6B8'}}>
    <FxDefs />
    <Scene />
    <Headline />
    <Captions />
    <Leaks />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(0,0,0,0) 62%, rgba(40,30,20,0.25) 100%)'}} />
    <Grain />
  </AbsoluteFill>
);
