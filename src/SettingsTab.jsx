// src/SettingsTab.jsx
// 設定：AI設定・データバックアップ/復元・キャッシュ管理・データ削除

import { useState, useRef } from 'react';
import { D } from './theme.js';
import {
  getSetting, setSetting, exportBackup, importBackup,
  clearFeedCache, clearAllData, clearSearchHistory,
} from './storage.js';

function Section({ title, children }) {
  return (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: D.accentLight }}>{title}</div>
      {children}
    </div>
  );
}

const btnStyle = {
  background: 'rgba(255,255,255,0.06)', border: `1px solid ${D.border}`,
  borderRadius: 10, padding: '10px 14px', color: D.text, fontSize: 12,
  fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'left',
  marginBottom: 8, transition: 'all 0.2s',
};

export default function SettingsTab({ onChangePush }) {
  const [aiDefault, setAiDefault] = useState(() => getSetting('aiDefault'));
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

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
    a.click();
    URL.revokeObjectURL(url);
    flash('💾 バックアップをダウンロードしました');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = importBackup(String(reader.result));
        flash(`🎉 ${count}項目を復元しました。再読み込みします…`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        flash(`⚠ ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    <div style={{ paddingBottom: 40 }}>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>設定</div>

      {msg && (
        <div style={{
          fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 12, lineHeight: 1.5,
          background: msg.startsWith('⚠') ? 'rgba(231,76,60,0.15)' : 'rgba(16,185,129,0.15)',
          color: msg.startsWith('⚠') ? '#e74c3c' : '#34d399',
        }}>{msg}</div>
      )}

      <Section title="🤖 AI">
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.text }}>URLアーカイブのAI自動判定</div>
            <div style={{ fontSize: 10, color: D.textSub, marginTop: 3, lineHeight: 1.5 }}>
              保存時にGeminiがメンバー・曲・会場を自動判定します
            </div>
          </div>
          <input type="checkbox" checked={aiDefault} onChange={toggleAi}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', flexShrink: 0 }} />
        </label>
      </Section>

      <Section title="💗 推し設定">
        <button onClick={onChangePush} style={btnStyle}>推しメンバーを変更する</button>
      </Section>

      <Section title="💾 データのバックアップ">
        <div style={{ fontSize: 10, color: D.textSub, marginBottom: 10, lineHeight: 1.6 }}>
          機種変更やブラウザの引っ越しに。ブックマーク・アーカイブ・推し設定をファイルに保存/復元できます。
        </div>
        <button onClick={downloadBackup} style={btnStyle}>📤 バックアップをダウンロード</button>
        <button onClick={() => fileRef.current?.click()} style={btnStyle}>📥 バックアップから復元</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
      </Section>

      <Section title="🔄 キャッシュ">
        <div style={{ fontSize: 10, color: D.textSub, marginBottom: 10, lineHeight: 1.6 }}>
          ホーム・推しタブのクリップは1時間キャッシュされます。今すぐ最新を取得したい場合はこちら。
        </div>
        <button onClick={refreshFeeds} style={btnStyle}>フィードを今すぐ更新</button>
        <button onClick={() => { clearSearchHistory(); flash('🧹 検索履歴を削除しました'); }} style={btnStyle}>検索履歴を削除</button>
      </Section>

      <Section title="⚠ データの削除">
        <button onClick={wipeAll} style={{ ...btnStyle, border: '1px solid rgba(231,76,60,0.35)', color: '#e74c3c', marginBottom: 0 }}>
          すべてのデータを削除
        </button>
      </Section>

      <div style={{ textAlign: 'center', fontSize: 10, color: D.textMuted, lineHeight: 1.8, marginTop: 18 }}>
        TORCA v2.0<br />
        きゅるしてのための撮可アーカイブ 💛💜🩷❤️
      </div>
    </div>
  );
}
