// src/LegalTabs.jsx
// 利用規約 / プライバシーポリシー / 運営者情報 / 削除申請

import { useState } from "react";

const CONTACT = "torca.official@gmail.com";

function LegalSection({ title, body }) {
  return (
    <section className="card card-pad" style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6, color: "var(--brand)" }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.85, whiteSpace: "pre-line" }}>{body}</div>
    </section>
  );
}

export function TermsTab() {
  return (
    <div>
      <LegalSection title="サービスの目的" body="TORCAは、きゅるりんってしてみての撮影可能区間（撮可）映像を、YouTube・X・TikTok・Instagramから探して閲覧しやすく整理する非公式ファンサービスです。" />
      <LegalSection title="動画の取り扱い" body="当サービスは動画を直接ホスティングしません。各サービスが提供する公式の埋め込み機能と外部リンクのみで表示します。動画の著作権はアーティスト・レーベル・撮影者に帰属します。" />
      <LegalSection title="共有コードについて" body="「みんなの撮可」の共有コードには、あなたが保存したクリップのURL・タイトル等の公開情報のみが含まれます。コードの取り扱いはご自身の責任で行ってください。" />
      <LegalSection title="削除申請" body="著作権者または正当な代理人の方は、削除申請ページからお申し込みください。確認後、速やかに対応いたします。" />
      <LegalSection title="禁止事項" body={"以下の行為を禁止します：\n• 無断・不正な動画情報の投稿\n• アーティスト・ファンへの誹謗中傷\n• 他者へのなりすまし\n• 本サービスを利用した商業目的の行為"} />
      <LegalSection title="免責事項" body="当サービスは非公式であり、きゅるりんってしてみて及び関係各社とは一切無関係です。情報の正確性を保証するものではありません。" />
    </div>
  );
}

export function PrivacyTab() {
  return (
    <div>
      <LegalSection title="収集する情報" body="当サービスが端末に保存する情報は、お客様が設定した「推しメンバー」、ブックマーク、アーカイブ、検索履歴のみです。これらはお使いのデバイスのローカルストレージに保存され、当サービスのサーバーに蓄積されることはありません。" />
      <LegalSection title="検索・AI機能について" body="検索キーワードやアーカイブしたURLは、検索結果の取得・AI解析のために当サービスのサーバーを経由して外部API（YouTube Data API・Google Gemini API・SNS検索API）へ送信されますが、当サービスのサーバー上には保存・記録されません。" />
      <LegalSection title="個人情報の送信" body="当サービスは氏名・メールアドレス等の個人情報をサーバーへ送信・保存しません。" />
      <LegalSection title="Cookieについて" body="当サービス自体はCookieを使用しません。ただし、埋め込み表示するYouTube・X・TikTok・Instagramは、各社のポリシーに基づきCookie等を使用する場合があります。" />
      <LegalSection title="外部サービス" body="YouTube・X（旧Twitter）・TikTok・Instagramの埋め込みとリンクを含みます。これらのサービスのプライバシーポリシーは各社のものに従います。" />
      <LegalSection title="お問い合わせ" body={`プライバシーに関するご質問は下記までお問い合わせください。\n${CONTACT}`} />
    </div>
  );
}

export function AboutTab() {
  return (
    <div>
      <section className="holo-card" style={{ textAlign: "center", padding: "24px 18px", marginBottom: 14 }}>
        <div className="logo" style={{ fontSize: 34, marginBottom: 6 }}>TORCA</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>TORCA運営</div>
        <div style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.7 }}>
          きゅるしてのファンとして、ファンのために作りました 💗
        </div>
      </section>
      <LegalSection title="運営" body="TORCA運営（個人）" />
      <LegalSection title="連絡先" body={CONTACT} />
      <LegalSection title="本サービスについて" body="TORCAはきゅるりんってしてみての非公式ファンサービスです。アーティスト・所属事務所・レーベルとは一切関係ありません。" />
    </div>
  );
}

export function TakedownTab() {
  const [form, setForm] = useState({ name: "", email: "", url: "", reason: "" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent("【TORCA削除申請】" + form.url);
    const body = encodeURIComponent(`申請者名：${form.name}\nメールアドレス：${form.email}\n該当URL：${form.url}\n\n削除理由：\n${form.reason}`);
    window.location.href = `mailto:${CONTACT}?subject=${subject}&body=${body}`;
  };

  const label = { fontSize: 11.5, color: "var(--text-sub)", marginBottom: 5, fontWeight: 700, display: "block" };

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginBottom: 10, lineHeight: 1.6 }}>
        著作権者または正当な代理人のみ申請できます。
      </div>
      <div className="notice notice-warn" style={{ marginBottom: 18 }}>
        ⚠ 虚偽の申請は法的責任が生じる場合があります。申請内容を確認後、速やかに対応いたします。
      </div>
      <form onSubmit={submit} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label><span style={label}>申請者名 *</span>
          <input required value={form.name} onChange={set("name")} placeholder="お名前" className="input" />
        </label>
        <label><span style={label}>メールアドレス *</span>
          <input required type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" className="input" />
        </label>
        <label><span style={label}>該当URL *</span>
          <input required type="url" value={form.url} onChange={set("url")} placeholder="https://x.com/..." className="input" />
        </label>
        <label><span style={label}>削除理由 *</span>
          <textarea required value={form.reason} onChange={set("reason")} placeholder="削除を希望する理由をご記入ください..." rows={5}
            className="input" style={{ resize: "vertical", fontFamily: "inherit" }} />
        </label>
        <button type="submit" className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 14 }}>メールで送信する</button>
      </form>
    </div>
  );
}
