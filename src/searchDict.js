// src/searchDict.js
// TORCA 検索クエリ展開辞書

export const OFFICIAL_CHANNEL_IDS = ['UC38ULbpGgiA7t6i-lbLu9VQ'];

export const MEMBER_ALIASES = {
  '島村嬉唄': ['島村嬉唄', 'うたちゃん', 'うちゃたん', 'しまむらうた', 'uta'],
  '嬉唄':     ['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うた':     ['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うたちゃん':['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'うちゃたん':['島村嬉唄', 'うたちゃん', 'うちゃたん'],
  'uta':      ['島村嬉唄', 'うたちゃん'],

  '環やね':   ['環やね', 'やねちゃん', 'やねぴ', 'たまきやね', 'yanemint'],
  'やね':     ['環やね', 'やねちゃん', 'やねぴ'],
  'やねちゃん':['環やね', 'やねちゃん', 'やねぴ'],
  'やねぴ':   ['環やね', 'やねちゃん', 'やねぴ'],
  'yanemint': ['環やね', 'やねちゃん', 'やねぴ'],

  'チバゆな': ['チバゆな', 'ゆなちゃん', 'uba_va__3'],
  'ゆな':     ['チバゆな', 'ゆなちゃん'],
  'ゆなちゃん':['チバゆな', 'ゆなちゃん'],
  'チバ':     ['チバゆな', 'ゆなちゃん'],

  '逃げ水あむ':['逃げ水あむ', 'あむちゃん', 'あむち', 'にげみずあむ'],
  'あむ':     ['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむちゃん':['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむち':   ['逃げ水あむ', 'あむちゃん', 'あむち'],
};

export const VENUE_ALIASES = {
  '幕張':              ['幕張イベントホール', 'Kyururin Heavenly', 'きゅるちゃん幕張'],
  '幕張イベント':      ['幕張イベントホール', 'Kyururin Heavenly'],
  '幕張イベホ':        ['幕張イベントホール'],
  'Kアリーナ':         ['Kアリーナ横浜', 'きゅるしてKアリ'],
  'Kアリ':             ['Kアリーナ横浜', 'きゅるしてKアリ'],
  '横浜Kアリーナ':     ['Kアリーナ横浜'],
  'zepp新宿':          ['Zepp Shinjuku', '4周年'],
  'Zepp新宿':          ['Zepp Shinjuku', '4周年'],
  'ゼップ新宿':        ['Zepp Shinjuku'],
  '日比谷':            ['日比谷野外音楽堂', '日比谷野音'],
  '日比谷野音':        ['日比谷野外音楽堂'],
  '野音':              ['日比谷野外音楽堂'],
  'zepp名古屋':        ['Zepp Nagoya', 'Kyururin Wonderland'],
  'Zepp名古屋':        ['Zepp Nagoya', 'Kyururin Wonderland'],
  'ゼップ名古屋':      ['Zepp Nagoya'],
  '名古屋':            ['Zepp Nagoya'],
  'かなでびあ':        ['Kanadevia Hall', '東京ドームシティホール'],
  'カナデビアホール':  ['Kanadevia Hall'],
  '東京ドームシティ':  ['Kanadevia Hall', 'Kyururin Wonderland'],
  '東京ドームシティホール': ['Kanadevia Hall'],
};

export const BASE_HASHTAGS = [
  'きゅるして',
  'きゅるりんってしてみて',
  '撮可',
];

export const MEMBER_HASHTAGS = {
  '島村嬉唄': ['島村嬉唄', 'うたちゃん'],
  '環やね':   ['環やね', 'やねちゃん'],
  'チバゆな': ['チバゆな', 'ゆなちゃん'],
  '逃げ水あむ':['逃げ水あむ', 'あむちゃん'],
};

export const VENUE_HASHTAGS = {
  '幕張':    ['きゅるちゃん幕張'],
  'Kアリーナ':['きゅるしてKアリ'],
};

// ユーザー入力1つから最大5本の検索クエリを生成
export function expandQueries(userInput, filters = {}) {
  const text = (userInput || '').trim();

  // メンバー名を正規化
  let memberName = '';
  for (const [alias, canonicals] of Object.entries(MEMBER_ALIASES)) {
    if (text.includes(alias)) {
      memberName = canonicals[0];
      break;
    }
  }
  if (!memberName && filters.member && filters.member !== 'all') {
    memberName = MEMBER_ALIASES[filters.member]?.[0] || filters.member;
  }

  // 会場名を正規化
  let venueName = '';
  for (const [alias, venues] of Object.entries(VENUE_ALIASES)) {
    if (text.includes(alias)) {
      venueName = venues[0];
      break;
    }
  }
  if (!venueName && filters.venue) {
    venueName = VENUE_ALIASES[filters.venue]?.[0] || filters.venue;
  }

  if (!text && !memberName && !venueName) {
    return ['きゅるりんってしてみて 撮可 ライブ', 'きゅるして ファン 動画 撮可'];
  }

  const base = text || [memberName, venueName].filter(Boolean).join(' ');
  const set = new Set();

  // A: 入力そのまま + 「きゅるりんってしてみて」
  set.add(`${base} きゅるりんってしてみて`);

  // B: 入力 + 「撮可」+「きゅるして」
  set.add(`${base} 撮可 きゅるして`);

  // C: 正規化したメンバー+会場 + 「きゅるして」
  const canonical = [memberName, venueName].filter(Boolean).join(' ');
  if (canonical) {
    set.add(`${canonical} きゅるして`);
  }

  // D: 入力 + 紐づくメンバー名 + 「ライブ」
  if (memberName && memberName !== base) {
    set.add(`${base} ${memberName} ライブ`);
  } else {
    set.add(`${base} きゅるして ライブ`);
  }

  // E: 入力 + 「きゅるして ファン 動画」
  set.add(`${base} きゅるして ファン 動画`);

  return [...set].slice(0, 5);
}

export function buildQuery(input, filters = {}) {
  const text = input.trim();
  const detectedMembers = new Set();
  const detectedVenues = new Set();
  const hashtags = [...BASE_HASHTAGS];

  for (const [alias, canonical] of Object.entries(MEMBER_ALIASES)) {
    if (text.includes(alias)) {
      canonical.forEach(c => detectedMembers.add(c));
    }
  }

  if (filters.member && filters.member !== 'all') {
    const memberAliases = MEMBER_ALIASES[filters.member] || [filters.member];
    memberAliases.forEach(a => detectedMembers.add(a));
    if (MEMBER_HASHTAGS[filters.member]) {
      hashtags.push(...MEMBER_HASHTAGS[filters.member]);
    }
  }

  for (const [alias, venues] of Object.entries(VENUE_ALIASES)) {
    if (text.includes(alias)) {
      venues.forEach(v => detectedVenues.add(v));
      for (const [vkey, vtags] of Object.entries(VENUE_HASHTAGS)) {
        if (alias.includes(vkey)) hashtags.push(...vtags);
      }
    }
  }

  if (filters.venue) {
    const venueExpanded = VENUE_ALIASES[filters.venue] || [filters.venue];
    venueExpanded.forEach(v => detectedVenues.add(v));
  }

  const memberTerms = [...detectedMembers].slice(0, 3);
  const venueTerms = [...detectedVenues].slice(0, 2);

  let remainingText = text;
  for (const alias of Object.keys(MEMBER_ALIASES)) {
    remainingText = remainingText.replace(alias, '');
  }
  for (const alias of Object.keys(VENUE_ALIASES)) {
    remainingText = remainingText.replace(alias, '');
  }
  remainingText = remainingText.trim();

  const youtubeParts = [];
  if (memberTerms.length > 0) {
    youtubeParts.push(memberTerms.join(' OR '));
  }
  if (venueTerms.length > 0) {
    youtubeParts.push(venueTerms[0]);
  }
  if (remainingText) {
    youtubeParts.push(remainingText);
  }
  if (!text && !filters.member && !filters.venue) {
    youtubeParts.push('きゅるりんってしてみて 撮可');
  } else {
    youtubeParts.push('きゅるして 撮可');
  }

  const youtubeQuery = youtubeParts.join(' ');

  const snsParts = [];
  if (memberTerms.length > 0) snsParts.push(memberTerms[0]);
  if (venueTerms.length > 0) snsParts.push(venueTerms[0]);
  if (remainingText) snsParts.push(remainingText);
  snsParts.push('#きゅるして #撮可');

  const snsQuery = snsParts.join(' ');

  return {
    youtubeQuery,
    snsQuery,
    hashtags: [...new Set(hashtags)],
    detectedMembers: [...detectedMembers],
    detectedVenues: [...detectedVenues],
  };
}

export function periodToPublishedAfter(period) {
  if (!period || period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString();
}

// 入力・フィルターからメンバー/会場の正規名を1つずつ取り出す（内部ヘルパー）
function detectCanonical(input, filters = {}) {
  const text = (input || '').trim();
  let member = '';
  for (const [alias, canonicals] of Object.entries(MEMBER_ALIASES)) {
    if (text.includes(alias)) { member = canonicals[0]; break; }
  }
  if (!member && filters.member && filters.member !== 'all') {
    member = MEMBER_ALIASES[filters.member]?.[0] || filters.member;
  }
  let venue = '';
  for (const [alias, venues] of Object.entries(VENUE_ALIASES)) {
    if (text.includes(alias)) { venue = venues[0]; break; }
  }
  if (!venue && filters.venue) {
    venue = VENUE_ALIASES[filters.venue]?.[0] || filters.venue;
  }
  return { member, venue };
}

function periodToSince(period) {
  if (!period || period === 'all') return '';
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 1);
  return ` since:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// X の検索演算子（filter:native_video / min_faves / from: / since:）を使った
// 実用検索レシピを生成する。X には検索 API を使えないため、
// 「正しく絞り込まれた検索 URL」を作ることが実用性の核になる。
export function buildXRecipes(input, filters = {}) {
  const { member, venue } = detectCanonical(input, filters);
  const since = periodToSince(filters.period);
  const xSearch = (q, tab = 'live') =>
    `https://x.com/search?q=${encodeURIComponent(q)}&f=${tab}`;

  const memberTag = member ? (MEMBER_HASHTAGS[member]?.[0] || member) : '';
  const scope = [member, venue].filter(Boolean).join(' ');

  const recipes = [
    {
      label: '📸 撮可タグの動画',
      desc: '#きゅるして撮可 の動画ポストのみ',
      url: xSearch(`#きゅるして撮可 ${scope} filter:native_video -filter:replies${since}`.trim(), 'live'),
    },
    {
      label: '🎥 推しカメラ',
      desc: `${member || 'きゅるして'}の推しカメラ・ファンカム`,
      url: xSearch(`${member || 'きゅるして'} (推しカメラ OR ファンカム OR 撮可) filter:native_video${since}`, 'live'),
    },
    {
      label: '🔥 伸びてる撮可',
      desc: 'いいね100以上の動画だけ',
      url: xSearch(`(#きゅるして撮可 OR きゅるして 撮可) ${scope} min_faves:100 filter:native_video`.trim(), 'top'),
    },
    {
      label: '🏷 公式ポスト',
      desc: '公式アカウントの告知・撮可ルール',
      url: xSearch(`from:KYURUSHITE ${venue || ''} ${input.trim() && !member ? input.trim() : ''}`.trim() || 'from:KYURUSHITE', 'live'),
    },
  ];
  if (memberTag) {
    recipes.push({
      label: `${member}タグ`,
      desc: `#${memberTag} の動画`,
      url: xSearch(`#${memberTag} filter:native_video${since}`, 'live'),
    });
  }
  return recipes;
}

// TikTok / Instagram のハッシュタグ直リンク（検索よりタグページの方が精度が高い）
export function buildTagLinks(input, filters = {}) {
  const { member } = detectCanonical(input, filters);
  const memberTag = member ? (MEMBER_HASHTAGS[member]?.[0] || member) : '';
  const tags = ['きゅるして', 'きゅるりんってしてみて'];
  if (memberTag) tags.unshift(memberTag);
  return {
    tiktok: tags.slice(0, 2).map(t => ({
      label: `#${t}`,
      url: `https://www.tiktok.com/tag/${encodeURIComponent(t)}`,
    })),
    instagram: tags.slice(0, 2).map(t => ({
      label: `#${t}`,
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(t)}/`,
    })),
  };
}

export function buildSnsUrls(snsQuery, platforms = ['x', 'tiktok', 'instagram', 'youtube']) {
  const encoded = encodeURIComponent(snsQuery);
  const urls = {};
  if (platforms.includes('x')) {
    urls.x = `https://x.com/search?q=${encoded}&f=video`;
  }
  if (platforms.includes('tiktok')) {
    urls.tiktok = `https://www.tiktok.com/search?q=${encoded}`;
  }
  if (platforms.includes('instagram')) {
    urls.instagram = `https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
  }
  if (platforms.includes('youtube')) {
    urls.youtube = `https://www.youtube.com/results?search_query=${encoded}`;
  }
  return urls;
}
