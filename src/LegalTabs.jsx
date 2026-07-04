// src/LegalTabs.jsx
// 利用規約 / プライバシーポリシー / 運営者情報 / 削除申請

import { useState } from "react";
import { D } from "./theme.js";

function LegalSection({ title, body }) {
  return (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: D.accentLight }}>{title}</div>
      <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.8, whiteSpace: "pre-line" }}>{body}</div>
    </div>
  );
}

export function TermsTab() {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>利用規約</div>
      <LegalSection title="サービスの目的" body="TORCAは、きゅるりんってしてみての撮影可能区間（撮可）映像を、YouTube・X・TikTokから集約して閲覧しやすく整理する非公式ファンサービスです。" />
      <LegalSection title="動画の取り扱い" body="当サービスは動画を直接ホスティングせず、YouTube・X・TikTokへの外部リンクのみを表示します。動画の著作権はアーティスト・レーベル・撮影者に帰属します。" />
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
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>プライバシーポリシー</div>
      <LegalSection title="収集する情報" body="当サービスが端末に保存する情報は、お客様が設定した「推しメンバー」、ブックマーク、アーカイブのみです。これらはお使いのデバイスのローカルストレージに保存され、当サービスのサーバーに蓄積されることはありません。" />
      <LegalSection title="検索・AI機能について" body="検索キーワードやアーカイブしたURLは、検索結果の取得・AI解析（YouTube Data API / Google Gemini API）のために当サービスのサーバーを経由しますが、サーバー上に保存・記録されません。" />
      <LegalSection title="個人情報の送信" body="当サービスは氏名・メールアドレス等の個人情報をサーバーへ送信・保存しません。" />
      <LegalSection title="Cookieについて" body="当サービスはCookieを使用しません。" />
      <LegalSection title="外部サービス" body="YouTube・X（旧Twitter）・TikTok・Instagramへのリンクを含みます。これらのサービスのプライバシーポリシーは各社のものに従います。" />
      <LegalSection title="お問い合わせ" body={"プライバシーに関するご質問は下記までお問い合わせください。\ntorca.official@gmail.com"} />
    </div>
  );
}

export function AboutTab() {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>運営者情報</div>
      <div style={{ background: "linear-gradient(135deg,rgba(255,105,180,0.15),rgba(255,105,180,0.03))", border: "1px solid rgba(255,105,180,0.25)", borderRadius: 18, padding: "20px 18px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💗</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>TORCA運営</div>
        <div style={{ fontSize: 12, color: D.textSub, lineHeight: 1.7 }}>
          きゅるしてのファンとして、ファンのために作りました。
        </div>
      </div>
      <LegalSection title="運営" body="TORCA運営（個人）" />
      <LegalSection title="連絡先" body="torca.official@gmail.com" />
      <LegalSection title="本サービスについて" body="TORCAはきゅるりんってしてみての非公式ファンサービスです。アーティスト・所属事務所・レーベルとは一切関係ありません。" />
    </div>
  );
}

export function TakedownTab() {
  const [form, setForm] = useState({ name: "", email: "", url: "", reason: "" });

  const submit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent("【TORCA削除申請】" + form.url);
    const body = encodeURIComponent(`申請者名：${form.name}\nメールアドレス：${form.email}\n該当URL：${form.url}\n\n削除理由：\n${form.reason}`);
    window.location.href = `mailto:torca.official@gmail.com?subject=${subject}&body=${body}`;
  };

  const inputStyle = {
    width: "100%", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10,
    padding: "11px 14px", color: D.text, fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>削除申請</div>
      <div style={{ fontSize: 12, color: D.textSub, marginBottom: 10, lineHeight: 1.6 }}>
        著作権者または正当な代理人のみ申請できます。
      </div>
      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, fontSize: 11, color: "#d4a84b", lineHeight: 1.6 }}>
        ⚠ 虚偽の申請は法的責任が生じる場合があります。申請内容を確認後、速やかに対応いたします。
      </div>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>申請者名 *</div>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="お名前" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>メールアドレス *</div>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>該当URL *</div>
          <input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://x.com/..." style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: D.textSub, marginBottom: 5, fontWeight: 600 }}>削除理由 *</div>
          <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="削除を希望する理由をご記入ください..." rows={5}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <button type="submit"
          style={{ background: "var(--accent)", border: "none", borderRadius: 12, padding: "13px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          メールで送信する
        </button>
      </form>
    </div>
  );
}
