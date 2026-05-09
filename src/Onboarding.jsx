import { useState } from 'react';

const MEMBERS = [
  {
    id: 'uta',
    name: '島村嬉唄',
    nick: 'うたちゃん / うちゃたん',
    catchphrase: '最恐かわいい、歌姫べびちゃん',
    emoji: '💛',
    color: '#FFD700',
    colorRgb: '255,215,0',
    cls: 'gold',
  },
  {
    id: 'yane',
    name: '環やね',
    nick: 'やねちゃん / やねぴ',
    catchphrase: '安心安全女神リーダー',
    emoji: '💜',
    color: '#9B59B6',
    colorRgb: '155,89,182',
    cls: 'purple',
  },
  {
    id: 'yuna',
    name: 'チバゆな',
    nick: 'ゆなちゃん',
    catchphrase: 'みんなの元カノ',
    emoji: '🩷',
    color: '#FF69B4',
    colorRgb: '255,105,180',
    cls: 'pink',
  },
  {
    id: 'amu',
    name: '逃げ水あむ',
    nick: 'あむちゃん / あむち',
    catchphrase: '赤い喜ばせ屋',
    emoji: '❤️',
    color: '#E74C3C',
    colorRgb: '231,76,60',
    cls: 'red',
  },
];

const DEFAULT_MEMBER = {
  id: 'all',
  name: '全員推し',
  nick: '',
  catchphrase: 'きゅるしてピンクで表示',
  emoji: '💛💜🩷❤️',
  color: '#FF69B4',
  colorRgb: '255,105,180',
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0); // 0=welcome, 1=member, 2=confirm
  const [selected, setSelected] = useState(null);

  const confirmed = selected ?? DEFAULT_MEMBER;

  const handleComplete = () => {
    onComplete?.({
      memberId: confirmed.id,
      memberColor: confirmed.color,
      memberColorRgb: confirmed.colorRgb,
      memberName: confirmed.name,
    });
  };

  const applyTheme = (member) => {
    document.documentElement.style.setProperty('--accent', member.color);
    document.documentElement.style.setProperty('--accent-rgb', member.colorRgb);
  };

  const selectMember = (m) => {
    setSelected(m);
    applyTheme(m);
  };

  const skipMember = () => {
    setSelected(DEFAULT_MEMBER);
    applyTheme(DEFAULT_MEMBER);
    setStep(2);
  };

  return (
    <div style={s.overlay}>
      <div style={{
        ...s.glow1,
        background: confirmed.color,
      }} />
      <div style={s.glow2} />

      <div style={{
        ...s.card,
        borderColor: `rgba(${confirmed.colorRgb},0.28)`,
        boxShadow: `0 0 60px rgba(${confirmed.colorRgb},0.13)`,
      }}>
        {step > 0 && (
          <div style={s.steps}>
            {[1, 2].map(i => (
              <div key={i} style={{
                ...s.stepDot,
                width: step === i ? 28 : 14,
                background: step > i
                  ? `rgba(${confirmed.colorRgb},0.4)`
                  : step === i
                  ? confirmed.color
                  : 'rgba(255,255,255,0.15)',
              }} />
            ))}
          </div>
        )}

        {step === 0 && (
          <div style={s.stepWrap}>
            <div style={s.logoBig}>TORCA</div>
            <div style={s.logoSub}>きゅるしてのための撮可アーカイブ</div>
            <div style={s.featureList}>
              {[
                { icon: '📹', title: '撮可クリップ', desc: 'をメンバー別・曲別で整理' },
                { icon: '🤖', title: 'AI検索', desc: 'でURLからクリップを自動登録' },
                { icon: '💜', title: '推しカラー', desc: 'でアプリ全体がカスタマイズ' },
              ].map(f => (
                <div key={f.title} style={s.featureItem}>
                  <span style={s.featureIcon}>{f.icon}</span>
                  <span style={s.featureText}>
                    <strong style={{ color: '#fff', fontWeight: 700 }}>{f.title}</strong>
                    {f.desc}
                  </span>
                </div>
              ))}
            </div>
            <button style={s.btnPrimary} onClick={() => setStep(1)}>
              はじめる →
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={s.stepWrap}>
            <div style={{ ...s.stepLabel, color: confirmed.color }}>STEP 1 / 2</div>
            <div style={s.stepTitle}>推しメンバーを<br />選んでね 💫</div>
            <div style={s.stepDesc}>テーマカラーがそのメンバーカラーに変わります</div>
            <div style={s.memberGrid}>
              {MEMBERS.map(m => {
                const isSelected = selected?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => selectMember(m)}
                    style={{
                      ...s.memberCard,
                      borderColor: isSelected ? m.color : 'rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? `0 0 24px rgba(${m.colorRgb},0.4)` : 'none',
                      transform: isSelected ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
                    }}
                  >
                    {isSelected && (
                      <div style={{ ...s.checkBadge, background: m.color, color: m.id === 'uta' ? '#0c0c12' : '#fff' }}>✓</div>
                    )}
                    <span style={s.memberEmojiBig}>{m.emoji}</span>
                    <div style={s.memberNameMain}>{m.name}</div>
                    <div style={s.memberCatch}>{m.catchphrase}</div>
                  </div>
                );
              })}
            </div>
            <button
              style={{ ...s.btnPrimary, opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed' }}
              onClick={() => selected && setStep(2)}
            >
              次へ →
            </button>
            <button style={s.btnSkip} onClick={skipMember}>
              全員推しなのでスキップ
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={s.stepWrap}>
            <div style={{ ...s.stepLabel, color: confirmed.color }}>STEP 2 / 2</div>
            <div style={s.stepTitle}>テーマカラーの<br />確認 🎨</div>
            <div style={s.stepDesc}>このカラーでTORCAが彩られます</div>

            <div style={{
              ...s.colorCard,
              background: `rgba(${confirmed.colorRgb},0.12)`,
              borderColor: confirmed.color,
            }}>
              <div style={{
                ...s.colorRing,
                background: `rgba(${confirmed.colorRgb},0.2)`,
                boxShadow: `0 0 32px rgba(${confirmed.colorRgb},0.55), inset 0 0 16px rgba(${confirmed.colorRgb},0.15)`,
              }}>
                <span style={{ fontSize: 36 }}>{confirmed.emoji}</span>
              </div>
              <div style={{ ...s.colorMemberName, color: confirmed.color }}>
                {confirmed.name}
              </div>
              <div style={s.colorNick}>{confirmed.nick}</div>
              <div style={s.colorCatch}>{confirmed.catchphrase}</div>
              <div style={{
                ...s.colorChip,
                borderColor: `rgba(${confirmed.colorRgb},0.5)`,
                background: `rgba(${confirmed.colorRgb},0.15)`,
              }}>
                <span style={{ ...s.colorSwatch, background: confirmed.color }} />
                <span style={{ color: confirmed.color, fontWeight: 800, letterSpacing: '0.1em' }}>
                  {confirmed.color.toUpperCase()}
                </span>
              </div>
            </div>

            <button style={s.btnPrimary} onClick={handleComplete}>
              TORCAをはじめる ✨
            </button>
            <button style={s.btnSkip} onClick={() => setStep(1)}>
              ← 選び直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 35%, #1e0a35 0%, #0c0c12 55%, #080810 100%)',
    padding: 16, overflow: 'hidden',
  },
  glow1: {
    position: 'fixed', width: 500, height: 500, borderRadius: '50%',
    top: -150, left: -150, filter: 'blur(100px)', opacity: 0.14, pointerEvents: 'none',
    transition: 'background 0.8s ease',
  },
  glow2: {
    position: 'fixed', width: 360, height: 360, borderRadius: '50%',
    bottom: -100, right: -100, filter: 'blur(90px)', opacity: 0.12,
    background: '#a855f7', pointerEvents: 'none',
  },
  card: {
    background: 'rgba(19,18,31,0.95)',
    border: '1px solid rgba(244,114,182,0.22)',
    borderRadius: 24, padding: '36px 32px 32px',
    width: '100%', maxWidth: 460,
    backdropFilter: 'blur(12px)',
    transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
    position: 'relative', zIndex: 1,
  },
  steps: {
    display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28,
  },
  stepDot: {
    height: 4, borderRadius: 2,
    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
  },
  stepWrap: { display: 'flex', flexDirection: 'column' },
  stepLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', marginBottom: 10,
    transition: 'color 0.5s',
  },
  stepTitle: {
    fontSize: 26, fontWeight: 900, lineHeight: 1.25,
    marginBottom: 8, letterSpacing: '0.02em', color: '#fff',
  },
  stepDesc: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.8, marginBottom: 24,
  },
  logoBig: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 56, fontWeight: 900, letterSpacing: '0.12em',
    background: 'linear-gradient(130deg,#FFD700 0%,#f472b6 40%,#a855f7 75%,#E74C3C 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    filter: 'drop-shadow(0 0 24px rgba(232,64,160,0.5))',
    textAlign: 'center', marginBottom: 6,
  },
  logoSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', letterSpacing: '0.05em', marginBottom: 24,
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  featureItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)',
  },
  featureIcon: { fontSize: 20, width: 32, textAlign: 'center', flexShrink: 0 },
  featureText: {},
  memberGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  memberCard: {
    borderRadius: 14, border: '2px solid rgba(255,255,255,0.08)',
    padding: '16px 12px', cursor: 'pointer', textAlign: 'center',
    background: 'rgba(255,255,255,0.03)', position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    userSelect: 'none',
  },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
  },
  memberEmojiBig: { fontSize: 32, marginBottom: 8, display: 'block' },
  memberNameMain: { fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#fff' },
  memberCatch: { fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 },
  colorCard: {
    border: '2px solid',
    borderRadius: 18, padding: '28px 20px 24px',
    marginBottom: 24, textAlign: 'center',
    transition: 'all 0.6s ease',
  },
  colorRing: {
    width: 88, height: 88, borderRadius: '50%',
    margin: '0 auto 18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.6s ease',
  },
  colorMemberName: {
    fontSize: 24, fontWeight: 900, marginBottom: 4,
    transition: 'color 0.5s', letterSpacing: '0.03em',
  },
  colorNick: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6,
  },
  colorCatch: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    fontWeight: 500, marginBottom: 18, lineHeight: 1.6,
  },
  colorChip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    border: '1.5px solid', borderRadius: 24,
    padding: '8px 18px', fontSize: 14,
    fontFamily: "'DM Sans', monospace",
  },
  colorSwatch: {
    width: 14, height: 14, borderRadius: '50%', display: 'inline-block',
  },
  btnPrimary: {
    width: '100%', padding: '14px',
    borderRadius: 14, border: 'none',
    fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.05em',
    background: 'linear-gradient(120deg,#e040a0,#a855f7)',
    color: '#fff',
    boxShadow: '0 4px 24px rgba(232,64,160,0.3)',
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
  },
  btnSkip: {
    width: '100%', padding: '10px',
    borderRadius: 10, border: 'none',
    background: 'transparent', color: 'rgba(255,255,255,0.35)',
    fontSize: 12, cursor: 'pointer', marginTop: 8,
    fontFamily: "'DM Sans', sans-serif",
  },
};
