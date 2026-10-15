import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ローカル開発用：/api/* を api/ 配下の Vercel Functions で処理する（vercel dev なしで API を動かす）
// .env.local の YOUTUBE_API_KEY / GEMINI_API_KEY / TAVILY_API_KEY を読み込む
function devApi() {
  return {
    name: 'torca-dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '')
      for (const [k, v] of Object.entries(env)) {
        if (!(k in process.env)) process.env[k] = v
      }

      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.replace(/^\/+|\/+$/g, '')
        if (!/^[a-z0-9-]+$/.test(name)) return next() // _gemini.js 等の内部モジュールは公開しない

        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${name}.js`)
        } catch {
          return next()
        }

        let raw = ''
        for await (const chunk of req) raw += chunk
        req.query = Object.fromEntries(url.searchParams)
        try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(obj))
          return res
        }

        try {
          await mod.default(req, res)
        } catch (err) {
          server.config.logger.error(`[api/${name}] ${err?.stack || err}`)
          if (!res.headersSent) res.status(500).json({ error: 'dev api error' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
