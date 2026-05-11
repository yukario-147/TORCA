// src/searchDict.js
// TORCA 検索クエリ展開辞書

export const MEMBER_ALIASES = {
  '島村嬉唄': ['島村嬉唄', 'うたちゃん', 'うちゃたん', 'しまむらうた', 'uta'],
  '嬉唄':     ['島村嬉唄', 'うたちゃん', 'うちゃたん'],
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

  '逃げ水あむ':['逃げ水あむ', 'あむちゃん', 'あむち', 'にげみずあむ'],
  'あむ':     ['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむちゃん':['逃げ水あむ', 'あむちゃん', 'あむち'],
  'あむち':   ['逃げ水あむ', 'あむちゃん', 'あむち'],
};

export const VENUE_ALIASES = {
  '幕張':           ['幕張イベントホール', 'Kyururin Heavenly', 'きゅるちゃん幕張'],
  '幕張イベント':   ['幕張イベントホール', 'Kyururin Heavenly'],
  'Kアリーナ':      ['Kアリーナ横浜', 'きゅるしてKアリ'],
  'Kアリ':          ['Kアリーナ横浜', 'きゅるしてKアリ'],
  'zepp新宿':       ['Zepp Shinjuku', '4周年'],
  '日比谷':         ['日比谷野外音楽堂', '日比谷野音'],
  '野音':           ['日比谷野外音楽堂'],
  'zepp名古屋':     ['Zepp Nagoya', 'Kyururin Wonderland'],
  '名古屋':         ['Zepp Nagoya'],
  'かなでびあ':     ['Kanadevia Hall', '東京ドームシティホール'],
  '東京ドームシティ':['Kanadevia Hall', 'Kyururin Wonderland'],
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

  // 常に「きゅるして」を先頭に置き、グループ無関係の動画を除外
  const youtubeParts = ['きゅるして'];
  if (memberTerms.length > 0) {
    youtubeParts.push(memberTerms.join(' OR '));
  }
  if (venueTerms.length > 0) {
    youtubeParts.push(venueTerms[0]);
  }
  if (remainingText) {
    youtubeParts.push(remainingText);
  }
  youtubeParts.push('撮可');

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
