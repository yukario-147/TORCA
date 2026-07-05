// src/data.js
// きゅるして専用データ・定数
// v2.1: 架空の再生数・いいね数を含むデモ動画データは「情報の正確性」担保のため廃止。
// 表示データはすべて YouTube Data API / oEmbed 経由の実データのみ。

export const xUrl = (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
export const tkUrl = (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;

// =====================
// きゅるして専用データ
// =====================
export const KYURUSHITE = {
  id: "kyurushite",
  name: "きゅるりんってしてみて",
  kana: "きゅるして",
  type: "group",
  color: "#FF69B4",
  emoji: "💗",
  description: "ディアステージ所属の4人組アイドルグループ。「カワイイ・リアリズム」をコンセプトに活動。",
  searchTerms: ["きゅるして", "きゅるりんってしてみて"],
  members: [
    { id: "uta",  name: "島村嬉唄",   kana: "しまむらうた",   color: "#FFD700", colorRgb: "255,215,0",   emoji: "💛", catchphrase: "最恐かわいい、歌姫べびちゃん", nickname: "うたちゃん / うちゃたん" },
    { id: "yane", name: "環やね",     kana: "たまきやね",     color: "#9B59B6", colorRgb: "155,89,182",  emoji: "💜", catchphrase: "安心安全女神リーダー",         nickname: "やねちゃん / やねぴ" },
    { id: "yuna", name: "チバゆな",   kana: "ちばゆな",       color: "#FF69B4", colorRgb: "255,105,180", emoji: "🩷", catchphrase: "みんなの元カノ",              nickname: "ゆなちゃん" },
    { id: "amu",  name: "逃げ水あむ", kana: "にげみずあむ",   color: "#E74C3C", colorRgb: "231,76,60",   emoji: "❤️", catchphrase: "赤い喜ばせ屋",               nickname: "あむちゃん / あむち" },
  ],
};

export const ARTISTS = [KYURUSHITE];
export const findArtist = (id) => ARTISTS.find(a => a.id === id);
export const findMember = (artistId, memberId) => findArtist(artistId)?.members.find(m => m.id === memberId);

export const MEMBERS_FILTER = [
  { id: 'all', label: '全員', emoji: '💛💜🩷❤️' },
  { id: '島村嬉唄', label: '島村嬉唄', emoji: '💛', color: '#FFD700' },
  { id: '環やね',   label: '環やね',   emoji: '💜', color: '#9B59B6' },
  { id: 'チバゆな', label: 'チバゆな', emoji: '🩷', color: '#FF69B4' },
  { id: '逃げ水あむ',label: '逃げ水あむ',emoji: '❤️', color: '#E74C3C' },
];

export const VENUES_FILTER = [
  { id: '', label: '会場指定なし' },
  { id: '幕張', label: '幕張イベントホール' },
  { id: 'Kアリーナ', label: 'Kアリーナ横浜' },
  { id: 'zepp新宿', label: 'Zepp Shinjuku' },
  { id: '日比谷', label: '日比谷野外音楽堂' },
  { id: 'zepp名古屋', label: 'Zepp Nagoya' },
  { id: 'かなでびあ', label: 'Kanadevia Hall' },
];

export const PERIODS_FILTER = [
  { id: 'all', label: 'すべての期間' },
  { id: 'month', label: '直近1ヶ月' },
  { id: 'week', label: '直近1週間' },
];

export const PLATFORM_CONFIG = {
  youtube:   { label: 'YouTube', icon: '▶', color: '#FF0000' },
  x:         { label: 'X',       icon: '✕', color: '#1DA1F2' },
  tiktok:    { label: 'TikTok',  icon: '♪', color: '#69C9D0' },
  instagram: { label: 'Instagram', icon: '◎', color: '#E1306C' },
};
