import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import express from 'express';
import path from 'path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const distDir = path.resolve(import.meta.dirname, 'dist');

app.use(express.json({ limit: '25mb' }));

app.get('/api/ingest-status', (_req, res) => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  res.json({ available: Boolean(key && key !== 'MY_GEMINI_API_KEY') });
});

app.post('/api/ingest-document', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({ error: 'GEMINI_API_KEY non configurée sur le serveur.' });
      return;
    }
    const { prompt, mode, mimeType, base64, text, filename } = req.body || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inputParts: any[] = [{ type: 'text', text: String(prompt || '') }];
    if (mode === 'binary' && typeof base64 === 'string') {
      if (String(mimeType || '').startsWith('image/')) {
        inputParts.push({ type: 'image', data: base64, mime_type: String(mimeType) });
      } else {
        inputParts.push({ type: 'document', data: base64, mime_type: String(mimeType || 'application/pdf') });
      }
    } else if (typeof text === 'string') {
      inputParts.push({
        type: 'text',
        text: `--- CONTENU DU DOCUMENT (${String(filename || 'document')}) ---\n${text}`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: 'gemini-4-hydrogen',
      input: inputParts,
      response_mime_type: 'application/json',
      store: false,
    });
    res.json({ outputText: interaction.output_text || '' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erreur lors de l'analyse Gemini.",
    });
  }
});

app.use(express.static(distDir));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coach Partiels server running on http://0.0.0.0:${PORT}`);
});
