// src/Splash.jsx
// 起動スプラッシュ（短時間・タップでスキップ可）

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_DISPLAY = 1200;
const FADE_MS = 450;

export default function Splash({ onFinish }) {
  const [fading, setFading] = useState(false);
  const onFinishRef = useRef(onFinish);
  const doneRef = useRef(false);
  const fadeTimer = useRef(null);

  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    fadeTimer.current = setTimeout(() => onFinishRef.current?.(), FADE_MS);
  }, []);

  useEffect(() => {
    const t = setTimeout(finish, MIN_DISPLAY);
    return () => { clearTimeout(t); clearTimeout(fadeTimer.current); };
  }, [finish]);

  return (
    <div onClick={finish} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background:
        'radial-gradient(40vmax 40vmax at 20% 20%, rgba(255,194,226,0.55), transparent 65%),' +
        'radial-gradient(40vmax 40vmax at 85% 30%, rgba(227,200,255,0.55), transparent 65%),' +
        'radial-gradient(40vmax 40vmax at 60% 90%, rgba(196,228,255,0.5), transparent 65%), #fff',
      opacity: fading ? 0 : 1,
      transition: `opacity ${FADE_MS}ms var(--ease)`,
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative',
        transform: fading ? 'scale(1.06)' : 'scale(1)', transition: `transform ${FADE_MS}ms var(--ease)`,
        animation: 'pageIn 0.5s var(--ease)',
      }}>
        {[
          { top: -28, left: -34, size: 22, delay: '0s', color: '#ffbbd9' },
          { top: -10, right: -40, size: 16, delay: '0.4s', color: '#c9a6ef' },
          { bottom: 6, left: -44, size: 14, delay: '0.8s', color: '#9fd0f5' },
          { bottom: -18, right: -26, size: 20, delay: '0.2s', color: '#ffd95e' },
        ].map((s, i) => (
          <span key={i} style={{
            position: 'absolute', ...s, fontSize: s.size, color: s.color, lineHeight: 1,
            animation: `twinkle 1.6s ease-in-out ${s.delay} infinite`,
          }}>✦</span>
        ))}
        <div className="logo" style={{ fontSize: 64, letterSpacing: '0.08em' }}>TORCA</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.9, letterSpacing: '0.06em' }}>
          💛💜🩷❤️<br />きゅるしてのための撮可アーカイブ
        </div>
      </div>
    </div>
  );
}
