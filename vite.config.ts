import { GoogleGenAI } from '@google/genai';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function readJsonBody(req: IncomingMessage, maxBytes = 25 * 1024 * 1024): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Fichier trop volumineux (max 25 Mo).'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Corps JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function geminiIngestMiddleware(): Plugin {
  const attach = (middlewares: {
    use: (
      path: string,
      fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void
    ) => void;
  }) => {
    middlewares.use('/api/ingest-status', (_req, res) => {
      const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      sendJson(res, 200, { available: Boolean(key && key !== 'MY_GEMINI_API_KEY') });
    });

    middlewares.use('/api/ingest-document', (req, res, next) => {
      if (req.method !== 'POST') {
        next();
        return;
      }
      void (async () => {
        try {
          const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
          if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
            sendJson(res, 503, { error: 'GEMINI_API_KEY non configurée sur le serveur.' });
            return;
          }
          const body = await readJsonBody(req);
          const prompt = String(body.prompt || '');
          const mode = String(body.mode || 'text');
          const mimeType = String(body.mimeType || 'text/plain');
          const filename = String(body.filename || 'document');

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inputParts: any[] = [{ type: 'text', text: prompt }];
          if (mode === 'binary' && typeof body.base64 === 'string') {
            if (mimeType.startsWith('image/')) {
              inputParts.push({ type: 'image', data: body.base64, mime_type: mimeType });
            } else {
              inputParts.push({ type: 'document', data: body.base64, mime_type: mimeType });
            }
          } else if (typeof body.text === 'string') {
            inputParts.push({
              type: 'text',
              text: `--- CONTENU DU DOCUMENT (${filename}) ---\n${body.text}`,
            });
          }

          const ai = new GoogleGenAI({ apiKey });
          const interaction = await ai.interactions.create({
            model: 'gemini-4-hydrogen',
            input: inputParts,
            response_mime_type: 'application/json',
            store: false,
          });
          sendJson(res, 200, { outputText: interaction.output_text || '' });
        } catch (err) {
          sendJson(res, 500, {
            error: err instanceof Error ? err.message : "Erreur lors de l'analyse Gemini.",
          });
        }
      })();
    });
  };

  return {
    name: 'coach-gemini-ingest-api',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      geminiIngestMiddleware(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Coach Partiels — INSA Rennes ESET 3A',
          short_name: 'Coach ESET',
          description:
            'Coach Partiels INSA Rennes ESET 3A : C, Maths, ELEN numérique, Prog syst, Architecture, Électronique analogique, TTSD, Anglais.',
          theme_color: '#2e7d6b',
          background_color: '#f5f6fa',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'fr',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/coach-data/annales/**'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/coach-data\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'coach-data-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
