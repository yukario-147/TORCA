// src/App.jsx
// アプリシェル：ナビゲーション・レイアウト・オンボーディング・Web Share Target 受信
// 各画面は src/HomeTab.jsx / MyTab.jsx / SearchTab.jsx / ArchiveTab.jsx / LiveTab.jsx 等に分割

import { useState, useEffect } from "react";
import Onboarding from './Onboarding.jsx';
import Splash from './Splash.jsx';
import { findMember } from './data.js';
import { D, DEFAULT_ACCENT, DEFAULT_ACCENT_RGB, ACCENT_RGB_MAP, applyAccent, useBreakpoint } from './theme.js';
import { Footer } from './components.jsx';
import { MemberPage } from './pages.jsx';
import { KYURUSHITE, findArtist } from './data.js';
import HomeTab from './HomeTab.jsx';
import MyTab from './MyTab.jsx';
import SearchTab from './SearchTab.jsx';
import ArchiveTab from './ArchiveTab.jsx';
import LiveTab from './LiveTab.jsx';
import SettingsTab from './SettingsTab.jsx';
import { TermsTab, PrivacyTab, AboutTab, TakedownTab } from './LegalTabs.jsx';
import { PlayerProvider } from './player.jsx';
import { KEYS, recordOshiSince } from './storage.js';

// Web Share Target（PWA）で渡されたパラメータから SNS の URL を取り出す
function consumeSharedUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const candidates = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean);
    for (const c of candidates) {
      const m = c.match(/https?:\/\/[^\s]+/);
      if (m && /(x\.com|twitter\.com|tiktok\.com|instagram\.com|youtube\.com|youtu\.be)/.test(m[0])) {
        // URL をクリーンにして再共有時の二重処理を防ぐ
        window.history.replaceState({}, '', window.location.pathname);
        return m[0];
      }
    }
    if (candidates.length > 0) window.history.replaceState({}, '', window.location.pathname);
  } catch { /* URL 解析失敗は無視 */ }
  return null;
}

export default function App() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  // Web Share Target 経由で開かれた場合は検索タブ（アーカイブ欄）で起動
  const [sharedUrl] = useState(() => consumeSharedUrl());
  const [tab, setTab] = useState(() => (sharedUrl ? "search" : "home"));
  const [viewArtist, setViewArtist] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [profile, setProfile] = useState(() => ({
    artistId: "kyurushite",
    memberId: localStorage.getItem(KEYS.member) || null,
  }));
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem(KEYS.onboarding)
  );
  const [accentColor, setAccentColor] = useState(
    () => localStorage.getItem(KEYS.accent) || DEFAULT_ACCENT
  );
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    el.style.cssText = "height:100%;margin:0;padding:0;background:#0c0c12;";
    el.style.setProperty("--bg-primary", "#0c0c12");
    el.style.setProperty("--bg-card", "#13121f");
    el.style.setProperty("--bg-card-hover", "#1a1828");
    el.style.setProperty("--accent", accentColor);
    el.style.setProperty("--accent-rgb", ACCENT_RGB_MAP[accentColor] || DEFAULT_ACCENT_RGB);
    el.style.setProperty("--accent-light", "#f472b6");
    el.style.setProperty("--accent2", "#a855f7");
    el.style.setProperty("--text-primary", "#ffffff");
    el.style.setProperty("--text-secondary", "rgba(255,255,255,0.55)");
    el.style.setProperty("--text-muted", "rgba(255,255,255,0.35)");
    el.style.setProperty("--border-subtle", "rgba(232,64,160,0.18)");
    el.style.setProperty("--border-accent", "rgba(232,64,160,0.35)");
    document.body.style.cssText = [
      "height:100%;margin:0;padding:0;overflow:hidden;background:#0c0c12;",
      "font-family:'DM Sans','Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;",
      "-webkit-font-smoothing:antialiased;",
      "background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px);",
      "background-size:32px 32px;",
    ].join("");
    const root = document.getElementById("root");
    if (root) root.style.cssText = "width:100%;height:100%;margin:0;padding:0;";
  }, []);

  useEffect(() => {
    const m = profile.memberId ? findMember("kyurushite", profile.memberId) : null;
    applyAccent(m?.color || accentColor);
  }, [profile.memberId]);

  const setPushMember = (memberId) => {
    if (memberId) {
      localStorage.setItem(KEYS.member, memberId);
      recordOshiSince(memberId);
    } else {
      localStorage.removeItem(KEYS.member);
    }
    setProfile(p => ({ ...p, memberId }));
  };

  const handleOnboardingComplete = ({ memberId, memberColor }) => {
    localStorage.setItem(KEYS.onboarding, '1');
    localStorage.setItem(KEYS.accent, memberColor);
    document.documentElement.style.setProperty('--accent', memberColor);
    setAccentColor(memberColor);
    setOnboardingDone(true);
    setPushMember(memberId === 'all' ? null : memberId);
  };

  const navigateTo = (t) => { setTab(t); setViewArtist(null); setViewMember(null); };

  const goToMember = (memberId) => {
    setPushMember(memberId);
    setTab("my");
    setViewArtist(null);
    setViewMember(null);
  };

  const mainTabs = [
    { key: "home",    icon: "🏠", label: "ホーム" },
    { key: "my",      icon: "💖", label: "推し" },
    { key: "search",  icon: "🔍", label: "検索" },
    { key: "archive", icon: "📼", label: "みんなの撮可" },
    { key: "live",    icon: "🎪", label: "ライブ" },
  ];

  const tabTitles = {
    "search":  "🔍 撮可を探す",
    "archive": "📼 みんなの撮可",
    "live":    "🎪 ライブ",
    "settings":"⚙ 設定",
    "terms":   "利用規約",
    "privacy": "プライバシーポリシー",
    "about":   "運営者情報",
    "takedown":"削除申請",
  };

  const isLegalTab = ["terms","privacy","about","takedown","settings"].includes(tab);

  const renderBody = () => {
    if (viewMember && viewArtist) return (
      <MemberPage artist={findArtist(viewArtist) || KYURUSHITE} member={findMember(viewArtist, viewMember)}
        onBack={() => setViewMember(null)} />
    );
    switch (tab) {
      case "home": return (
        <HomeTab onGoToMember={goToMember} onGoLive={() => navigateTo("live")} onGoSearch={() => navigateTo("search")} />
      );
      case "my": return (
        <MyTab profile={profile}
          onSelectMember={(aId, mId) => { setViewArtist(aId); setViewMember(mId); }}
          onChangePush={() => { localStorage.removeItem(KEYS.onboarding); setOnboardingDone(false); }} />
      );
      case "search":  return <SearchTab sharedUrl={sharedUrl} />;
      case "archive": return <ArchiveTab />;
      case "live":    return <LiveTab />;
      case "settings": return <SettingsTab onChangePush={() => { localStorage.removeItem(KEYS.onboarding); setOnboardingDone(false); }} />;
      case "terms":    return <TermsTab />;
      case "privacy":  return <PrivacyTab />;
      case "about":    return <AboutTab />;
      case "takedown": return <TakedownTab />;
      default: return null;
    }
  };

  const contentKey = `${tab}-${viewArtist || ''}-${viewMember || ''}`;

  return (
    <PlayerProvider>
      {!splashDone && <Splash onFinish={() => setSplashDone(true)} />}
      {!onboardingDone && <Onboarding onComplete={handleOnboardingComplete} />}
      <div style={{ fontFamily: "'DM Sans', 'Noto Sans JP', -apple-system, sans-serif", background: D.bg, width: "100vw", height: "100dvh", overflow: "hidden", color: D.text, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* PCサイドバー */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, background: D.surface, borderRight: `1px solid ${D.border}`, display: "flex", flexDirection: "column", padding: "20px 12px" }}>
            <div style={{ marginBottom: 24, paddingLeft: 8 }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "0.1em", background: "linear-gradient(120deg, #f472b6 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TORCA</div>
              <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.1em", marginTop: 1 }}>きゅるして撮可アーカイブ</div>
              <div style={{ fontSize: 8, color: D.textMuted, marginTop: 4, lineHeight: 1.5 }}>💛💜🩷❤️<br />きゅるしてのための撮可アーカイブ</div>
            </div>
            {mainTabs.map(t => (
              <button key={t.key} onClick={() => navigateTo(t.key)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 10, border: tab === t.key ? "1px solid rgba(232,64,160,0.28)" : "1px solid transparent", cursor: "pointer", background: tab === t.key ? "linear-gradient(120deg, rgba(232,64,160,0.18), rgba(168,85,247,0.18))" : "transparent", marginBottom: 2, width: "100%", textAlign: "left", transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
                <span style={{ fontSize: tab === t.key ? 17 : 15, transition: "font-size 0.2s cubic-bezier(0.4,0,0.2,1)", display: "block" }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? "#f472b6" : D.textSub, transition: "color 0.2s ease" }}>{t.label}</span>
              </button>
            ))}
            <div style={{ marginTop: "auto", fontSize: 9, color: D.textMuted, lineHeight: 1.6, paddingLeft: 8 }}>
              著作権は各権利者に帰属します。
            </div>
          </div>
        )}

        {/* メインコラム */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* ヘッダー（PWA のステータスバー下に潜り込まないよう safe-area を確保） */}
          <div style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #130c20 50%, #0f0c1a 100%)", borderBottom: `1px solid ${D.border}`, padding: isMobile ? "calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px" : "12px 20px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {isMobile && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.1em", background: "linear-gradient(120deg, #f472b6 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TORCA</div>
                <div style={{ fontSize: 8, color: D.textMuted, lineHeight: 1.4 }}>💛💜🩷❤️ きゅるしてのための撮可アーカイブ</div>
              </div>
            )}
            {(tab !== "home" || viewMember) && (
              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: D.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: isMobile ? "center" : "left" }}>
                {viewMember ? `📷 ${findMember(viewArtist, viewMember)?.name}` :
                 tab === "my" ? "💖 推し" : tabTitles[tab]}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {isLegalTab && (
                <button onClick={() => navigateTo("home")}
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 10px", color: D.textSub, fontSize: 11, cursor: "pointer" }}>← 戻る</button>
              )}
              <button onClick={() => { localStorage.removeItem(KEYS.onboarding); setOnboardingDone(false); }}
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 10px", color: D.textSub, fontSize: 11, cursor: "pointer" }}>推し設定</button>
              <button onClick={() => navigateTo("settings")} title="設定"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${D.border}`, borderRadius: 8, padding: "5px 9px", color: D.textSub, fontSize: 12, cursor: "pointer" }}>⚙</button>
            </div>
          </div>

          {/* ボディ */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div key={contentKey} style={{ flex: "1 0 auto", padding: isMobile ? "14px 12px" : "18px 20px", animation: "pageIn 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
              {renderBody()}
            </div>
            {isMobile && <Footer onNav={navigateTo} />}
          </div>

          {/* フッター（PC のみ常時表示） */}
          {!isMobile && <Footer onNav={navigateTo} />}

          {/* モバイル下部ナビ */}
          {isMobile && (
            <div style={{ background: D.surface, borderTop: `1px solid ${D.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom, 12px)", flexShrink: 0 }}>
              {mainTabs.map(t => (
                <div key={t.key} onClick={() => navigateTo(t.key)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", opacity: tab === t.key ? 1 : 0.45, padding: "4px 6px", flex: 1, transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", transform: tab === t.key ? "translateY(-2px)" : "translateY(0)" }}>
                  <span style={{ fontSize: tab === t.key ? 21 : 19, transition: "font-size 0.2s cubic-bezier(0.4,0,0.2,1)", display: "block" }}>{t.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: tab === t.key ? 800 : 400, color: tab === t.key ? D.accentLight : D.textMuted, transition: "color 0.2s ease" }}>{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </PlayerProvider>
  );
}
