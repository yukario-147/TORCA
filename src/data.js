// src/data.js
// きゅるして専用データ・定数

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

// API に接続できない場合のフォールバック用デモデータ
export const INITIAL_VIDEOS = [
  {
    id: 1, artistId: "kyurushite", focusMemberId: null, memberIds: ["uta","yane","yuna","amu"],
    song: "らぶきゅん♡うぉんてっど", venue: "Zepp Nagoya", date: "2025-03-28", quality: "4K", source: "X",
    sourceUrl: xUrl("#きゅるして撮可"), tags: ["#きゅるして撮可", "#ZeppNagoya"],
    views: 28400, likes: 2340, isOfficial: true, isAI: false, trending: true,
    note: "Zeppツアー「Kyururin Wonderland」初日公演のデモ表示です。",
  },
  {
    id: 2, artistId: "kyurushite", focusMemberId: "uta", memberIds: ["uta"],
    song: "きゅるりんしてみて", venue: "日比谷野外音楽堂", date: "2025-01-25", quality: "4K", source: "X",
    sourceUrl: xUrl("島村嬉唄 推しカメラ"), tags: ["#うたちゃん", "#きゅるして", "#推しカメラ"],
    views: 18200, likes: 1620, isOfficial: true, isAI: false, trending: true,
    note: "島村嬉唄の推しカメラ動画のデモ表示です。",
  },
  {
    id: 3, artistId: "kyurushite", focusMemberId: "yane", memberIds: ["yane"],
    song: "きゅるりんしてみて", venue: "日比谷野外音楽堂", date: "2025-01-25", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("環やね 推しカメラ"), tags: ["#環やね", "#やねっち", "#推しカメラ"],
    views: 21500, likes: 1980, isOfficial: true, isAI: false, trending: false,
    note: "環やねの推しカメラ動画のデモ表示です。",
  },
  {
    id: 4, artistId: "kyurushite", focusMemberId: "yuna", memberIds: ["yuna"],
    song: "♡♡♡わんだーらんど", venue: "Kanadevia Hall", date: "2025-06-06", quality: "1080p", source: "X",
    sourceUrl: xUrl("チバゆな 推しカメラ"), tags: ["#チバゆな", "#推しカメラ"],
    views: 15800, likes: 1420, isOfficial: true, isAI: false, trending: false,
    note: "チバゆなの推しカメラ動画のデモ表示です。",
  },
  {
    id: 5, artistId: "kyurushite", focusMemberId: "amu", memberIds: ["amu"],
    song: "♡♡♡わんだーらんど", venue: "Kanadevia Hall", date: "2025-06-06", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("逃げ水あむ 推しカメラ"), tags: ["#逃げ水あむ", "#あむあむ", "#推しカメラ"],
    views: 33400, likes: 3120, isOfficial: true, isAI: false, trending: true,
    note: "逃げ水あむの推しカメラ動画のデモ表示です。",
  },
  {
    id: 6, artistId: "kyurushite", focusMemberId: "uta", memberIds: ["uta", "yane"],
    song: "Special♡Spell", venue: "Zepp Shinjuku", date: "2025-04-06", quality: "4K", source: "TikTok",
    sourceUrl: tkUrl("島村嬉唄 ファンカム"), tags: ["#うたちゃん", "#ファンカム"],
    views: 19200, likes: 1750, isOfficial: true, isAI: false, trending: false,
    note: "ファンカム動画のデモ表示です。",
  },
];

export const QUALITIES = ["すべて", "4K", "1080p", "720p"];
export const SOURCES = ["すべて", "X", "TikTok"];

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

export const SNS_PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', color: '#FF0000' },
  { id: 'x',       label: 'X (Twitter)', icon: '✕', color: '#1DA1F2' },
  { id: 'tiktok',  label: 'TikTok', icon: '♪', color: '#69C9D0' },
  { id: 'instagram',label: 'Instagram', icon: '◎', color: '#E1306C' },
];

export const PLATFORM_CONFIG = {
  youtube:   { label: 'YouTube', icon: '▶', color: '#FF0000' },
  x:         { label: 'X',       icon: '✕', color: '#1DA1F2' },
  tiktok:    { label: 'TikTok',  icon: '♪', color: '#69C9D0' },
  instagram: { label: 'Instagram', icon: '◎', color: '#E1306C' },
};
