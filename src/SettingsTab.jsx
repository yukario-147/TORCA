// src/SettingsTab.jsx
// 設定：AI設定・データバックアップ/復元・キャッシュ管理・データ削除

import { useState, useRef } from 'react';
import {
  getSetting, setSetting, exportBackup, importBackup,
  clearFeedCache, clearAllData, clearSearchHistory,
} from './storage.js';
import { Notice } from './components.jsx';
import { Icon } from './icons.jsx';
import { useFlash } from './useFlash.js';

function Section({ title, desc, children }) {
  return (
    <section className="card card-pad" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: desc ? 4 : 12 }}>{title}</div>
      {desc && <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.6 }}>{desc}</div>}
      {children}
    </section>
  );
}

function RowButton({ onClick, icon, children, danger = false }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', marginBottom: 8,
      borderRadius: 14, textAlign: 'left', fontSize: 13, fontWeight: 700,
      background: danger ? 'var(--danger-soft)' : 'var(--surface-2)',
      color: danger ? 'var(--danger)' : 'var(--text)',
    }}>
      {icon && <Icon name={icon} size={17} style={{ color: danger ? 'var(--danger)' : 'var(--accent-deep)' }} />}
      <span style={{ flex: 1 }}>{children}</span>
      <Icon name="chevron" size={15} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}

export default function SettingsTab({ onChangePush }) {
  const [aiDefault, setAiDefault] = useState(() => getSetting('aiDefault'));
  const [msg, flash] = useFlash();
  const fileRef = useRef(null);

  const toggleAi = () => {
    const next = !aiDefault;
    setAiDefault(next);
    setSetting('aiDefault', next);
  };

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = `torca-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari は即時 revoke するとダウンロードが中断されることがあるため遅延させる
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    flash('💾 バックアップをダウンロードしました');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = importBackup(String(reader.result));
        flash(`🎉 ${count}項目を復元しました。再読み込みします…`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        flash(`⚠ ${err.message}`, 'err');
      }
    };
    reader.onerror = () => flash('⚠ ファイルを読み込めませんでした', 'err');
    reader.readAsText(file);
  };

  const refreshFeeds = () => {
    const n = clearFeedCache();
    flash(`🔄 フィードキャッシュ${n}件をクリアしました。再読み込みします…`);
    setTimeout(() => window.location.reload(), 1200);
  };

  const wipeAll = () => {
    if (!window.confirm('推し設定・ブックマーク・アーカイブを含むすべてのデータを削除します。よろしいですか？')) return;
    clearAllData();
    window.location.reload();
  };

  return (
    <div>
      <Notice msg={msg} style={{ marginBottom: 12 }} />

      <Section title="💗 推し設定">
        <RowButton onClick={onChangePush} icon="heart">推しメンバーを変更する</RowButton>
      </Section>

      <Section title="🤖 AI">
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>URLアーカイブのAI自動判定</div>
            <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 3, lineHeight: 1.5 }}>
              保存時にGeminiがメンバー・曲・会場を自動判定します
            </div>
          </div>
          <input type="checkbox" role="switch" checked={aiDefault} onChange={toggleAi} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
          <span aria-hidden="true" style={{
            width: 46, height: 28, borderRadius: 999, flexShrink: 0, position: 'relative',
            background: aiDefault ? 'var(--accent-grad)' : 'var(--border-strong)', transition: 'background 0.25s var(--ease)',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: aiDefault ? 21 : 3, width: 22, height: 22, borderRadius: '50%',
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s var(--spring)',
            }} />
          </span>
        </label>
      </Section>

      <Section title="💾 データのバックアップ" desc="機種変更やブラウザの引っ越しに。ブックマーク・アーカイブ・推し設定をファイルに保存/復元できます。">
        <RowButton onClick={downloadBackup} icon="download">バックアップをダウンロード</RowButton>
        <RowButton onClick={() => fileRef.current?.click()} icon="share">バックアップから復元</RowButton>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
      </Section>

      <Section title="🔄 キャッシュ" desc="ホーム・推しタブのクリップは1時間キャッシュされます。今すぐ最新を取得したい場合はこちら。">
        <RowButton onClick={refreshFeeds} icon="refresh">フィードを今すぐ更新</RowButton>
        <RowButton onClick={() => { clearSearchHistory(); flash('🧹 検索履歴を削除しました'); }} icon="clock">検索履歴を削除</RowButton>
      </Section>

      <Section title="⚠ データの削除">
        <RowButton onClick={wipeAll} icon="trash" danger>すべてのデータを削除</RowButton>
      </Section>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8, marginTop: 18 }}>
        <span className="logo" style={{ fontSize: 16 }}>TORCA</span> v3.0<br />
        きゅるしてのための撮可アーカイブ 💛💜🩷❤️
      </div>
    </div>
  );
}
