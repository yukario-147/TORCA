// api/_guard.js
// API の回数制限・1日の使用量ガード・結果キャッシュ（Upstash Redis の REST API を使用）
// 先頭が _ のファイルは Vercel Functions として公開されない。
//
// 環境変数（Vercel Marketplace の Upstash 連携で自動設定される。どちらの名前でも可）:
//   KV_REST_API_URL / KV_REST_API_TOKEN   または   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// 上限値は環境変数で変更できる（下の LIMITS）。
//
// ・未設定なら何もしない（すべて許可・キャッシュなし）＝ Upstash を接続するまでは従来どおり動く
// ・Redis に障害がある時も許可側に倒す（アプリを止めない）。料金の暴走は Google Cloud 側の上限で別途防ぐ
// ・IP アドレスはそのまま保存せず、復元できないハッシュにして最大2日で消える形で数える

import { createHash } from 'node:crypto';

const PREFIX = 'torca:';
const DAY = 86400;

const positive = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// 1日の上限（Google の割り当てがリセットされる太平洋時間 0 時で日付を区切る）
export const LIMITS = {
  ytUnits: () => positive(process.env.YT_DAILY_UNITS, 9000),             // YouTube API 全体（上限 10,000 から余裕を残す）
  ytSearchUnits: () => positive(process.env.YT_SEARCH_DAILY_UNITS, 7000), // うち検索に使ってよい量（残りはフィード用に確保）
  gemini: () => positive(process.env.GEMINI_DAILY_LIMIT, 500),           // Gemini 呼び出し回数
  sns: () => positive(process.env.SNS_DAILY_LIMIT, 40),                  // SNS 検索（Tavily 無料枠 1,000回/月 ≒ 33回/日）
};

// 同じ利用者（IP）からの、キャッシュに当たらない呼び出しの上限
const RATE_RULES = {
  yt:  [{ window: 600, max: 15 }, { window: DAY, max: 60 }],
  sns: [{ window: 600, max: 15 }, { window: DAY, max: 60 }],
  ai:  [{ window: 600, max: 10 }, { window: DAY, max: 40 }],
};

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

export const guardEnabled = () => !!config();

// Redis のコマンドをまとめて実行する。失敗時は null（呼び出し側は許可側に倒す）
async function redis(commands, timeoutMs = 1500) {
  const cfg = config();
  if (!cfg) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = await res.json();
    return Array.isArray(out) ? out.map(r => (r && 'result' in r ? r.result : null)) : null;
  } catch (err) {
    console.error('[guard] Redis に接続できません（制限なしで続行）:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const hashKey = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);

function clientId(req) {
  const h = req.headers || {};
  const raw = h['x-real-ip'] || h['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ip = String(raw).split(',')[0].trim();
  return createHash('sha256').update(`${config()?.token || ''}:${ip}`).digest('hex').slice(0, 24);
}

function pacificDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// 同じ IP からの呼び出し回数を数え、上限を超えたら { ok: false, retryAfter } を返す
export async function rateLimit(req, kind) {
  const rules = RATE_RULES[kind];
  if (!rules || !config()) return { ok: true };
  const id = clientId(req);
  const now = Math.floor(Date.now() / 1000);
  const commands = [];
  for (const r of rules) {
    const key = `${PREFIX}rl:${kind}:${r.window}:${id}:${Math.floor(now / r.window)}`;
    commands.push(['INCR', key], ['EXPIRE', key, String(r.window + 60)]);
  }
  const out = await redis(commands);
  if (!out) return { ok: true };
  for (let i = 0; i < rules.length; i++) {
    if (Number(out[i * 2]) > rules[i].max) {
      return { ok: false, retryAfter: rules[i].window - (now % rules[i].window) };
    }
  }
  return { ok: true };
}

// 1日の使用量を amount だけ予約する。limit を超える場合は予約を取り消して false
export async function reserveBudget(name, amount, limit) {
  if (!config()) return true;
  const key = `${PREFIX}budget:${name}:${pacificDate()}`;
  const out = await redis([['INCRBY', key, String(amount)], ['EXPIRE', key, String(2 * DAY)]]);
  if (!out) return true;
  if (Number(out[0]) > limit) {
    await redis([['DECRBY', key, String(amount)]]);
    return false;
  }
  return true;
}

// 外部 API 側で上限に達したことが分かった場合、その日は以降の呼び出しを止める
export async function markExhausted(name) {
  if (!config()) return;
  await redis([['SET', `${PREFIX}budget:${name}:${pacificDate()}`, '999999999', 'EX', String(2 * DAY)]]);
}

// 結果キャッシュ。{ at, freshMs, data } を保存し、鮮度の判断は呼び出し側で行う
// （上限到達時などは期限切れでも「古い結果」として返せるよう、保存期間は長めにとる）
export async function cacheGet(key) {
  const out = await redis([['GET', `${PREFIX}cache:${key}`]]);
  if (!out || typeof out[0] !== 'string') return null;
  try {
    const v = JSON.parse(out[0]);
    if (!v || typeof v.at !== 'number') return null;
    return { ...v, fresh: Date.now() - v.at < (v.freshMs || 0) };
  } catch {
    return null;
  }
}

export async function cacheSet(key, data, { freshMs, keepSeconds = 3 * DAY }) {
  if (!config()) return;
  await redis([['SET', `${PREFIX}cache:${key}`, JSON.stringify({ at: Date.now(), freshMs, data }), 'EX', String(keepSeconds)]]);
}

// 429 / 503 の共通レスポンス
export function sendLimited(res, { retryAfter, quota = false, message }) {
  res.setHeader('Cache-Control', 'no-store');
  if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
  return res.status(quota ? 503 : 429).json({
    error: quota ? 'quota-exceeded' : 'rate-limited',
    quota,
    rateLimited: !quota,
    message: message || (quota
      ? '本日の利用上限に達しました。明日また試すか、外部アプリで検索してください'
      : '短時間にアクセスが集中しています。少し時間をおいてから再度お試しください'),
  });
}
