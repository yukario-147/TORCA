import { useEffect, useState } from 'react';

export default function Splash({ onFinish }) {
  const [phase, setPhase] = useState('visible');

  useEffect(() => {
    const MIN_DISPLAY = 1500;
    const start = Date.now();
    const finish = () => {
      const remaining = Math.max(0, MIN_DISPLAY - (Date.now() - start));
      setTimeout(() => {
        setPhase('fadeout');
        setTimeout(() => { setPhase('done'); onFinish?.(); }, 600);
      }, remaining);
    };
    if (document.readyState === 'complete') finish();
    else { window.addEventListener('load', finish, { once: true }); return () => window.removeEventListener('load', finish); }
  }, [onFinish]);

  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0c0c12 60%, #080810 100%)',
      opacity: phase === 'fadeout' ? 0 : 1,
      pointerEvents: phase === 'fadeout' ? 'none' : 'auto',
      transition: phase === 'fadeout' ? 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        transform: phase === 'fadeout' ? 'scale(1.08)' : 'scale(1)',
        transition: phase === 'fadeout' ? 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' : 'none',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 64, fontWeight: 900, letterSpacing: '0.15em',
          fontFamily: "'DM Sans', sans-serif",
          background: 'linear-gradient(135deg,#FFD700 0%,#FF69B4 35%,#9B59B6 65%,#E74C3C 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 0 24px rgba(255,105,180,0.6))',
        }}>TORCA</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 1.8, letterSpacing: '0.05em' }}>
          💛💜🩷❤️<br />きゅるしてのための撮可アーカイブ
        </div>
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', border: '1.5px solid rgba(255,105,180,0.25)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(155,91,182,0.15)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
