// src/Onboarding.jsx
// 初回オンボーディング / 推しメンバーの変更
// initialMemberId を渡すと「推し変更モード」（ようこそ画面を飛ばし、キャンセル可能）

import { useState } from 'react';
import { KYURUSHITE } from './data.js';
import { ACCENTS, applyAccent } from './theme.js';
import { Icon } from './icons.jsx';

const ALL = {
  id: 'all',
  name: '全員推し',
  nickname: 'きゅるして箱推し',
  catchphrase: '4人まとめて大好き！',
  emoji: '💛💜🩷❤️',
  color: '#FF69B4',
};

const OPTIONS = [...KYURUSHITE.members, ALL];

export default function Onboarding({ initialMemberId = null, onComplete, onCancel }) {
  const isChange = !!initialMemberId;
  const [step, setStep] = useState(isChange ? 1 : 0); // 0=ようこそ, 1=推し選択, 2=確認
  const [selected, setSelected] = useState(() => OPTIONS.find(o => o.id === initialMemberId) || null);
  const [leaving, setLeaving] = useState(false);

  const confirmed = selected ?? ALL;
  const pal = ACCENTS[confirmed.id] || ACCENTS.all;

  const select = (m) => {
    setSelected(m);
    applyAccent(m.id); // 選んだ瞬間にアプリ全体の色をプレビュー
  };

  const finish = (cb) => {
    setLeaving(true);
    setTimeout(cb, 380);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="推しメンバーの設定" style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
      overflowY: 'auto',
      background:
        `radial-gradient(45vmax 45vmax at 10% 10%, rgba(${pal.rgb},0.22), transparent 65%),` +
        'radial-gradient(40vmax 40vmax at 90% 20%, rgba(227,200,255,0.45), transparent 65%),' +
        'radial-gradient(40vmax 40vmax at 70% 95%, rgba(196,228,255,0.45), transparent 65%), #fdfbff',
      opacity: leaving ? 0 : 1,
      transition: 'opacity 0.38s var(--ease), background 0.6s var(--ease)',
      pointerEvents: leaving ? 'none' : 'auto',
    }}>
      <div className="holo-card" style={{ width: '100%', maxWidth: 440, padding: '30px 24px 24px', margin: 'auto', animation: 'sheetIn 0.4s var(--ease)' }}>
        {onCancel && (
          <button className="icon-btn" onClick={() => finish(onCancel)} aria-label="閉じる"
            style={{ position: 'absolute', top: 14, right: 14 }}>
            <Icon name="close" size={16} />
          </button>
        )}

        {step > 0 && !isChange && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22 }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                height: 5, borderRadius: 5, width: step === i ? 28 : 12,
                background: step >= i ? 'var(--accent-grad)' : 'var(--border-strong)',
                transition: 'all 0.35s var(--ease)',
              }} />
            ))}
          </div>
        )}

        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div className="logo" style={{ fontSize: 54, letterSpacing: '0.08em', marginBottom: 6, animation: 'floaty 3s ease-in-out infinite' }}>TORCA</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-sub)', fontWeight: 700, marginBottom: 22 }}>きゅるしてのための撮可アーカイブ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24, textAlign: 'left' }}>
              {[
                { icon: '📹', title: '撮可クリップ', desc: 'をYouTube・X・TikTok・Instaから横断検索' },
                { icon: '📼', title: 'アーカイブ', desc: 'でお気に入りを保存・ファン同士で共有' },
                { icon: '🎨', title: '推しカラー', desc: 'でアプリ全体がカスタマイズ' },
              ].map(f => (
                <div key={f.title} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14,
                  background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--text-sub)', fontWeight: 500,
                }}>
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{f.icon}</span>
                  <span><strong style={{ color: 'var(--text)', fontWeight: 800 }}>{f.title}</strong>{f.desc}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 15 }} onClick={() => setStep(1)}>
              はじめる <Icon name="chevron" size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            {!isChange && <div className="eyebrow" style={{ color: 'var(--accent-deep)' }}>STEP 1 / 2</div>}
            <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.35, marginBottom: 6 }}>推しメンバーを<br />選んでね 💫</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-sub)', marginBottom: 18 }}>テーマカラーがメンバーカラーに変わります</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {KYURUSHITE.members.map(m => (
                <MemberOption key={m.id} m={m} active={selected?.id === m.id} onClick={() => select(m)} />
              ))}
            </div>
            <MemberOption m={ALL} wide active={selected?.id === 'all'} onClick={() => select(ALL)} />

            <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 15, marginTop: 18 }}
              disabled={!selected} onClick={() => setStep(2)}>
              次へ <Icon name="chevron" size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            {!isChange && <div className="eyebrow" style={{ color: 'var(--accent-deep)' }}>STEP 2 / 2</div>}
            <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.35, marginBottom: 6 }}>このカラーで<br />はじめよう 🎨</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-sub)', marginBottom: 18 }}>あとからいつでも変更できます</div>

            <div style={{
              textAlign: 'center', padding: '26px 18px 22px', borderRadius: 20, marginBottom: 20,
              background: pal.soft, border: `2px solid rgba(${pal.rgb},0.45)`,
            }}>
              <div style={{
                width: 86, height: 86, margin: '0 auto 14px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fff', boxShadow: `0 6px 24px rgba(${pal.rgb},0.4)`,
                fontSize: confirmed.id === 'all' ? 20 : 38, animation: 'floaty 3s ease-in-out infinite',
              }}>{confirmed.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: pal.deep }}>{confirmed.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3 }}>{confirmed.nickname}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginTop: 8 }}>「{confirmed.catchphrase}」</div>
            </div>

            <button className="btn btn-primary btn-block" style={{ padding: 14, fontSize: 15 }}
              onClick={() => finish(() => onComplete?.({ memberId: confirmed.id }))}>
              {isChange ? 'この推しに変更する' : 'TORCAをはじめる'} ✨
            </button>
            <button className="btn btn-block" style={{ marginTop: 8, color: 'var(--text-sub)', fontWeight: 700 }} onClick={() => setStep(1)}>
              ← 選び直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberOption({ m, active, onClick, wide = false }) {
  const pal = ACCENTS[m.id] || ACCENTS.all;
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={m.name} style={{
      position: 'relative', width: '100%', textAlign: 'center',
      display: wide ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: wide ? '12px 14px' : '16px 10px 14px', borderRadius: 16,
      background: active ? pal.soft : 'var(--surface)',
      border: `2px solid ${active ? pal.accent : 'var(--border)'}`,
      boxShadow: active ? `0 6px 20px rgba(${pal.rgb},0.3)` : 'var(--shadow-sm)',
      transform: active ? 'translateY(-2px)' : 'none',
      transition: 'all 0.3s var(--spring)',
    }}>
      {active && (
        <span style={{
          position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: '50%',
          background: pal.grad, color: pal.on, fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✓</span>
      )}
      <span style={{ display: 'block', fontSize: wide ? 16 : 30, marginBottom: wide ? 0 : 6 }}>{m.emoji}</span>
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: active ? pal.deep : 'var(--text)' }}>{m.name}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-sub)', marginTop: 3, lineHeight: 1.45 }}>{m.catchphrase}</span>
      </span>
    </button>
  );
}
