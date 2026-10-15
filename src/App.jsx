// src/App.jsx
// アプリシェル：ナビゲーション・レイアウト・オンボーディング・Web Share Target 受信
// 各画面は src/HomeTab.jsx / MyTab.jsx / SearchTab.jsx / ArchiveTab.jsx / LiveTab.jsx 等に分割

import { useState, useLayoutEffect, useRef } from "react";
import Onboarding from './Onboarding.jsx';
import Splash from './Splash.jsx';
import { findMember, shortNick } from './data.js';
import { applyAccent, useBreakpoint } from './theme.js';
import { Footer } from './components.jsx';
import { Icon } from './icons.jsx';
import { MemberPage } from './pages.jsx';
import HomeTab from './HomeTab.jsx';
import MyTab from './MyTab.jsx';
import SearchTab from './SearchTab.jsx';
import ArchiveTab from './ArchiveTab.jsx';
import LiveTab from './LiveTab.jsx';
import SettingsTab from './SettingsTab.jsx';
import { TermsTab, PrivacyTab, AboutTab, TakedownTab } from './LegalTabs.jsx';
import { PlayerProvider } from './player.jsx';
import { KEYS, getItem, setItem, recordOshiSince } from './storage.js';
import { firstUrl, detectPlatform } from './urls.js';

// Web Share Target（PWA）で渡されたパラメータから SNS の URL を取り出す。
// React の StrictMode 二重実行で消費済みにならないよう、モジュール読み込み時に1回だけ行う
function consumeSharedUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const candidates = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean);
    if (candidates.length === 0) return null;
    // URL をクリーンにして再読み込み時の二重処理を防ぐ
    window.history.replaceState({}, '', window.location.pathname);
    for (const c of candidates) {
      const url = firstUrl(c);
      if (url && detectPlatform(url)) return url;
    }
  } catch { /* URL 解析失敗は無視 */ }
  return null;
}
const SHARED_URL = consumeSharedUrl();

const MAIN_TABS = [
  { key: "home",    icon: "home",   label: "ホーム" },
  { key: "my",      icon: "heart",  label: "推し" },
  { key: "search",  icon: "search", label: "さがす" },
  { key: "archive", icon: "film",   label: "みんなの撮可" },
  { key: "live",    icon: "ticket", label: "ライブ" },
];

const SUB_TITLES = {
  settings: "設定",
  terms: "利用規約",
  privacy: "プライバシーポリシー",
  about: "運営者情報",
  takedown: "削除申請",
};

export default function App() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const [tab, setTab] = useState(() => (SHARED_URL ? "search" : "home"));
  const [lastMainTab, setLastMainTab] = useState("home");
  const [viewMember, setViewMember] = useState(null);
  const [memberId, setMemberId] = useState(() => getItem(KEYS.member) || null);
  // null = 非表示 / "first" = 初回 / "change" = 推し変更（キャンセル可）
  const [onboarding, setOnboarding] = useState(() => (getItem(KEYS.onboarding) ? null : "first"));
  const [splashDone, setSplashDone] = useState(false);
  const scrollRef = useRef(null);

  const myMember = memberId ? findMember(memberId) : null;
  const isSubPage = tab in SUB_TITLES;

  // 推しカラーを描画前に反映（黄色推しで一瞬ピンクが出るのを防ぐ）
  useLayoutEffect(() => { applyAccent(memberId || "all"); }, [memberId]);

  // 画面切替時はスクロール位置を先頭に戻す
  const contentKey = `${tab}-${viewMember || ''}`;
  useLayoutEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [contentKey]);

  const setPushMember = (id) => {
    setItem(KEYS.member, id || null);
    if (id) recordOshiSince(id);
    setMemberId(id || null);
  };

  const handleOnboardingComplete = ({ memberId: id }) => {
    setItem(KEYS.onboarding, '1');
    setPushMember(id === 'all' ? null : id);
    setOnboarding(null);
  };

  const handleOnboardingCancel = () => {
    applyAccent(memberId || "all"); // プレビューで変えた色を戻す
    setOnboarding(null);
  };

  const navigateTo = (t) => {
    if (!(t in SUB_TITLES)) setLastMainTab(t);
    else if (!isSubPage) setLastMainTab(tab);
    setTab(t);
    setViewMember(null);
  };

  const openPushSettings = () => setOnboarding("change");

  const renderBody = () => {
    if (viewMember) {
      const m = findMember(viewMember);
      if (m) return <MemberPage member={m} onBack={() => setViewMember(null)} />;
    }
    switch (tab) {
      case "home":     return <HomeTab onOpenMember={setViewMember} onGoLive={() => navigateTo("live")} onGoSearch={() => navigateTo("search")} />;
      case "my":       return <MyTab member={myMember} onOpenMember={setViewMember} onChangePush={openPushSettings} />;
      case "search":   return <SearchTab sharedUrl={SHARED_URL} />;
      case "archive":  return <ArchiveTab onGoSearch={() => navigateTo("search")} />;
      case "live":     return <LiveTab />;
      case "settings": return <SettingsTab onChangePush={openPushSettings} />;
      case "terms":    return <TermsTab />;
      case "privacy":  return <PrivacyTab />;
      case "about":    return <AboutTab />;
      case "takedown": return <TakedownTab />;
      default:         return null;
    }
  };

  const activeMain = isSubPage ? null : tab;

  return (
    <PlayerProvider>
      {!splashDone && <Splash onFinish={() => setSplashDone(true)} />}
      {onboarding && (
        <Onboarding
          initialMemberId={onboarding === "change" ? (memberId || "all") : null}
          onComplete={handleOnboardingComplete}
          onCancel={onboarding === "change" ? handleOnboardingCancel : null}
        />
      )}

      <div className="app">
        {/* PC / タブレット：サイドバー */}
        {!isMobile && (
          <nav className="sidebar" aria-label="メインメニュー">
            <div style={{ padding: "0 8px", marginBottom: 26 }}>
              <div className="logo" style={{ fontSize: 30 }}>TORCA</div>
              <div className="logo-sub">きゅるして撮可アーカイブ</div>
            </div>
            {MAIN_TABS.map(t => (
              <button key={t.key} onClick={() => navigateTo(t.key)}
                className={`side-link${activeMain === t.key ? " is-active" : ""}`}
                aria-current={activeMain === t.key ? "page" : undefined}>
                <Icon name={t.icon} size={20} filled={t.icon === "heart" && activeMain === t.key} />
                {t.label}
              </button>
            ))}
            <div style={{ marginTop: "auto", padding: "0 8px" }}>
              <div style={{ height: 3, borderRadius: 3, background: "var(--member-line)", marginBottom: 10, opacity: 0.8 }} />
              <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
                💛💜🩷❤️<br />きゅるしてのための撮可アーカイブ
              </div>
            </div>
          </nav>
        )}

        <div className="app-main">
          {/* ヘッダー（PWA のステータスバー下に潜り込まないよう safe-area を確保） */}
          <header className="app-header">
            {isSubPage ? (
              <>
                <button className="icon-btn" onClick={() => navigateTo(lastMainTab)} aria-label="戻る">
                  <Icon name="back" size={18} />
                </button>
                <div className="app-header-title">{SUB_TITLES[tab]}</div>
              </>
            ) : isMobile ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="logo" style={{ fontSize: 24 }}>TORCA</div>
                <div className="logo-sub" style={{ marginTop: 2 }}>きゅるしてのための撮可アーカイブ</div>
              </div>
            ) : (
              <div className="app-header-title">{MAIN_TABS.find(t => t.key === tab)?.label}</div>
            )}

            <button onClick={openPushSettings} className="chip chip-sm is-active" title="推しを変更"
              style={{ flexShrink: 0, maxWidth: 140, overflow: "hidden" }}>
              <span>{myMember ? myMember.emoji : "💗"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{myMember ? shortNick(myMember) : "全員推し"}</span>
            </button>
            {tab !== "settings" && (
              <button className="icon-btn" onClick={() => navigateTo("settings")} aria-label="設定" title="設定">
                <Icon name="gear" size={18} />
              </button>
            )}
          </header>

          {/* ボディ */}
          <main className="app-scroll" ref={scrollRef}>
            <div key={contentKey} className="app-content">
              {renderBody()}
            </div>
            <Footer onNav={navigateTo} />
          </main>

          {/* モバイル下部ナビ */}
          {isMobile && (
            <nav className="tabbar" aria-label="メインメニュー">
              {MAIN_TABS.map(t => (
                <button key={t.key} onClick={() => navigateTo(t.key)}
                  className={`tab${activeMain === t.key ? " is-active" : ""}`}
                  aria-current={activeMain === t.key ? "page" : undefined}>
                  <span className="tab-icon">
                    <Icon name={t.icon} size={21} stroke={activeMain === t.key ? 2.3 : 2} filled={t.icon === "heart" && activeMain === t.key} />
                  </span>
                  {t.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </PlayerProvider>
  );
}
