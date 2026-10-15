// src/data.js
// きゅるして専用データ・定数
// 架空の再生数・いいね数などのデモデータは置かない（表示は YouTube Data API / oEmbed の実データのみ）

import { MEMBER_ALIASES } from "./searchDict.js";

export const xUrl = (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
export const tkUrl = (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;

export const OFFICIAL_SITE = "https://www.kyurushite.com/";

export const KYURUSHITE = {
  id: "kyurushite",
  name: "きゅるりんってしてみて",
  kana: "きゅるして",
  description: "ディアステージ所属の4人組アイドルグループ。",
  members: [
    { id: "uta",  name: "島村嬉唄",   color: "#FFD700", colorRgb: "255,215,0",   emoji: "💛", catchphrase: "最恐かわいい、歌姫べびちゃん", nickname: "うたちゃん / うちゃたん" },
    { id: "yane", name: "環やね",     color: "#9B59B6", colorRgb: "155,89,182",  emoji: "💜", catchphrase: "安心安全女神リーダー",         nickname: "やねちゃん / やねぴ" },
    { id: "yuna", name: "チバゆな",   color: "#FF69B4", colorRgb: "255,105,180", emoji: "🩷", catchphrase: "みんなの元カノ",              nickname: "ゆなちゃん" },
    { id: "amu",  name: "逃げ水あむ", color: "#E74C3C", colorRgb: "231,76,60",   emoji: "❤️", catchphrase: "赤い喜ばせ屋",               nickname: "あむちゃん / あむち" },
  ],
};

export const SNS_LINKS = [
  { label: "X", icon: "𝕏", href: "https://x.com/KYURUSHITE" },
  { label: "TikTok", icon: "♪", href: "https://www.tiktok.com/@kyurushite" },
  { label: "Instagram", icon: "◎", href: "https://www.instagram.com/kyurushite/" },
  { label: "YouTube", icon: "▶", href: "https://www.youtube.com/channel/UC38ULbpGgiA7t6i-lbLu9VQ" },
  { label: "FC", icon: "♡", href: "https://kyurushite.bitfan.id/" },
  { label: "公式サイト", icon: "✦", href: OFFICIAL_SITE },
];

export const findMember = (memberId) => KYURUSHITE.members.find(m => m.id === memberId) || null;
export const findMemberByName = (name) => KYURUSHITE.members.find(m => m.name === name) || null;
export const shortNick = (m) => m.nickname.split(" /")[0];

// タイトル等のテキストからメンバー（正式名）を推定する。日本語の別名のみ使用（英字の誤マッチ防止）
export function detectMemberName(text) {
  const t = text || "";
  for (const m of KYURUSHITE.members) {
    const aliases = (MEMBER_ALIASES[m.name] || [m.name]).filter(a => /[^\x20-\x7e]/.test(a));
    if (aliases.some(a => t.includes(a))) return m.name;
  }
  return null;
}

// 検索・アーカイブのメンバーフィルター（id はメンバーの正式名。API にもそのまま渡す）
export const MEMBERS_FILTER = [
  { id: "all", label: "全員", emoji: "💛💜🩷❤️" },
  ...KYURUSHITE.members.map(m => ({ id: m.name, label: m.name, emoji: m.emoji, color: m.color, memberId: m.id })),
];

export const VENUES_FILTER = [
  { id: "", label: "会場：指定なし" },
  { id: "幕張", label: "幕張イベントホール" },
  { id: "Kアリーナ", label: "Kアリーナ横浜" },
  { id: "zepp新宿", label: "Zepp Shinjuku" },
  { id: "日比谷", label: "日比谷野外音楽堂" },
  { id: "zepp名古屋", label: "Zepp Nagoya" },
  { id: "かなでびあ", label: "Kanadevia Hall" },
];

export const PERIODS_FILTER = [
  { id: "all", label: "期間：すべて" },
  { id: "month", label: "直近1ヶ月" },
  { id: "week", label: "直近1週間" },
];

export const PLATFORM_CONFIG = {
  youtube:   { label: "YouTube",   icon: "▶", color: "#FF0033", soft: "#ffe8ec" },
  x:         { label: "X",         icon: "𝕏", color: "#1d1d1f", soft: "#eeeef2", tag: "𝕏" },
  tiktok:    { label: "TikTok",    icon: "♪", color: "#0aa5b0", soft: "#e0f7f8" },
  instagram: { label: "Instagram", icon: "◎", color: "#E1306C", soft: "#fde7ef" },
};
