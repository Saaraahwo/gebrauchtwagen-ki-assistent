interface CarSVGProps {
  color?: string;
  type?: 'sedan' | 'suv' | 'cabrio';
}

export function CarSVG({ color = '#2a4a7a', type = 'sedan' }: CarSVGProps) {
  const body = color;
  const glass = '#b3d4f0';
  const wheel = '#222';
  const rim = '#aaa';

  if (type === 'suv') return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="30" y="80" width="300" height="68" rx="6" fill={body} />
      <path d="M 60 80 Q 70 38 120 34 L 260 34 Q 300 36 310 80 Z" fill={body} />
      <path d="M 72 78 Q 82 46 122 42 L 258 42 Q 292 44 300 78 Z" fill={glass} opacity="0.7" />
      <rect x="158" y="42" width="3" height="36" fill="#1a1a2a" opacity="0.4" />
      <rect x="26" y="90" width="14" height="28" rx="2" fill="#e53935" />
      <rect x="320" y="90" width="14" height="28" rx="2" fill="#fff9c4" />
      <ellipse cx="85" cy="148" rx="26" ry="26" fill={wheel} /><ellipse cx="85" cy="148" rx="15" ry="15" fill={rim} /><ellipse cx="85" cy="148" rx="5" ry="5" fill={wheel} />
      <ellipse cx="275" cy="148" rx="26" ry="26" fill={wheel} /><ellipse cx="275" cy="148" rx="15" ry="15" fill={rim} /><ellipse cx="275" cy="148" rx="5" ry="5" fill={wheel} />
    </svg>
  );

  if (type === 'cabrio') return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="30" y="95" width="300" height="58" rx="6" fill={body} />
      <path d="M 80 95 Q 100 60 160 56 Q 220 52 270 95 Z" fill={body} />
      <path d="M 88 93 Q 106 64 160 62 Q 218 60 264 93 Z" fill={glass} opacity="0.6" />
      <rect x="26" y="104" width="12" height="22" rx="2" fill="#e53935" />
      <rect x="322" y="104" width="12" height="22" rx="2" fill="#fff9c4" />
      <ellipse cx="88" cy="153" rx="24" ry="24" fill={wheel} /><ellipse cx="88" cy="153" rx="13" ry="13" fill={rim} /><ellipse cx="88" cy="153" rx="5" ry="5" fill={wheel} />
      <ellipse cx="272" cy="153" rx="24" ry="24" fill={wheel} /><ellipse cx="272" cy="153" rx="13" ry="13" fill={rim} /><ellipse cx="272" cy="153" rx="5" ry="5" fill={wheel} />
    </svg>
  );

  return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="22" y="95" width="316" height="58" rx="6" fill={body} />
      <path d="M 62 95 Q 80 52 138 46 L 230 46 Q 285 46 306 95 Z" fill={body} />
      <path d="M 74 93 Q 90 56 138 50 L 230 50 Q 278 50 296 93 Z" fill={glass} opacity="0.65" />
      <rect x="183" y="50" width="3" height="43" fill="#1a1a2a" opacity="0.35" />
      <rect x="18" y="104" width="14" height="24" rx="2" fill="#e53935" />
      <rect x="328" y="104" width="14" height="24" rx="2" fill="#fff9c4" />
      <ellipse cx="82" cy="153" rx="25" ry="25" fill={wheel} /><ellipse cx="82" cy="153" rx="14" ry="14" fill={rim} /><ellipse cx="82" cy="153" rx="5" ry="5" fill={wheel} />
      <ellipse cx="278" cy="153" rx="25" ry="25" fill={wheel} /><ellipse cx="278" cy="153" rx="14" ry="14" fill={rim} /><ellipse cx="278" cy="153" rx="5" ry="5" fill={wheel} />
    </svg>
  );
}
