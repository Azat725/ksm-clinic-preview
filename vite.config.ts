import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mediaExtensions, mediaSlots } from './src/media-slots.ts'

const loaderCss = readFileSync(new URL('./src/page-loader.css', import.meta.url), 'utf8')

export default defineConfig({
  plugins: [react(), {
    name: 'page-loader',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return {
          html: html.replace('<div id="root"></div>', `<div id="root">
            <div class="ksm-loader" role="status">
              <span class="ksm-loader-mark" aria-hidden="true"><img src="/assets/clinic/logo-small.webp" alt="" width="52" height="52"></span>
              <span>Загрузка страницы</span>
            </div>
            <noscript><style>.ksm-loader{display:none}</style>Для просмотра страницы включите JavaScript. <a href="https://ksm-eko.ru/">Официальный сайт клиники</a>.</noscript>
          </div>`),
          tags: [{ tag: 'style', children: loaderCss, injectTo: 'head' }],
        }
      },
    },
  }, {
    name: 'preload-hero-image',
    transformIndexHtml: {
      // Run before Vite's asset processing so the URL gets the same build hash.
      order: 'pre',
      handler(_html, context) {
        if (context.filename.includes('specialists')) return
        const root = resolve(context.filename, '..')
        const [name, fallback] = mediaSlots.hero
        const extension = mediaExtensions.find(ext => existsSync(resolve(root, `src/assets/generated/${name}.${ext}`)))
        const href = extension ? `/src/assets/generated/${name}.${extension}` : `/assets/clinic/${fallback}`
        return [{ tag: 'link', attrs: { rel: 'preload', as: 'image', href, fetchpriority: 'high' }, injectTo: 'head' }]
      },
    },
  }],
  build: { rolldownOptions: { input: ['index.html', 'specialists/index.html', 'specialists/solovev.html', 'specialists/kapitskaya.html', 'specialists/motina.html', 'specialists/zhiryaeva.html'] } },
  base: process.env.VITE_BASE_PATH ?? '/medic_corp/',
  server: { port: 4173, strictPort: true },
  preview: { port: 4174, strictPort: true },
})
