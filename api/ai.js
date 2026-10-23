// api/ai.js
// Vercel Functions - URL アーカイブの AI 自動判定
// SNS 投稿の URL・タイトル・投稿者から、メンバー・曲・会場・見出しを推定する。
// プロンプトはサーバー側で固定（任意のプロンプトを中継する汎用プロキシにしない）。

import { generateJson, geminiConfigured } from './_gemini.js';
import { LIMITS, rateLimit, reserveBudget, sendLimited } from './_guard.js';

const MEMBERS = ['島村嬉唄', '環やね', 'チバゆな', '逃げ水あむ'];

const SYSTEM = `あなたはアイドルグループ「きゅるりんってしてみて」のファン動画整理アシスタントです。
メンバーは 島村嬉唄（うたちゃん）・環やね（やねちゃん/やねぴ）・チバゆな（ゆなちゃん）・逃げ水あむ（あむちゃん）の4人です。
与えられた SNS 投稿の情報から、次の JSON のみを出力してください。説明文は一切不要です。
{"member": "島村嬉唄" | "環やね" | "チバゆな" | "逃げ水あむ" | null, "song": 曲名 | null, "venue": 会場名 | null, "label": 20字以内の見出し}
判断できない項目は null にしてください。推測で情報を作らないでください。`;

const str = (v, max) => (typeof v === 'string' && v.trim() ? Array.from(v.trim()).slice(0, max).join('') : null);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!geminiConfigured()) return res.status(501).json({ error: 'GEMINI_API_KEY is not configured' });

  const body = req.body || {};
  const url = str(body.url, 500);
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'url is required' });
  const title = str(body.title, 300);
  const authorName = str(body.authorName, 100);

  // 回数制限・1日の上限（api/_guard.js、Upstash 接続時に有効）
  const rl = await rateLimit(req, 'ai');
  if (!rl.ok) return sendLimited(res, { retryAfter: rl.retryAfter });
  if (!(await reserveBudget('gemini', 1, LIMITS.gemini()))) {
    return sendLimited(res, { quota: true, message: '本日のAI判定の上限に達しました' });
  }

  const out = await generateJson({
    system: SYSTEM,
    prompt: `URL: ${url}\nタイトル: ${title || '不明'}\n投稿者: ${authorName || '不明'}`,
    timeoutMs: 9000,
  });
  if (!out || typeof out !== 'object' || Array.isArray(out)) {
    return res.status(502).json({ error: 'AI analysis failed' });
  }

  return res.status(200).json({
    member: MEMBERS.includes(out.member) ? out.member : null,
    song: str(out.song, 60),
    venue: str(out.venue, 60),
    label: str(out.label, 40),
  });
}
