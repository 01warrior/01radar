import express from "express";
import path from "path";
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Init RSS Parser
const parser = new Parser({
  customFields: {
    item: ['description', 'content', 'content:encoded', 'pubDate'],
  },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  }
});

// Configure Google Gen AI
let ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing. Configure it in Settings > Secrets.");
    }
    ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return ai;
}

// Feeds List
const FEEDS = [
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'reddit', name: 'r/programming', url: 'https://www.reddit.com/r/programming/.rss' },
  { id: 'reddit-ml', name: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss' },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'lobsters', name: 'Lobsters', url: 'https://lobste.rs/rss' },
  { id: 'bytebytego', name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed' },
  { id: 'netflix', name: 'Netflix Tech', url: 'https://netflixtechblog.com/feed' },
  { id: 'devto', name: 'Dev.to', url: 'https://dev.to/feed' },
];

// ---------------------------------------------------------
// API ROUTES (Extracted for Vercel Serverless compatibility)
// ---------------------------------------------------------

// API: Get Feeds
app.get("/api/feeds", async (req, res) => {
    try {
      const feedId = req.query.id as string || 'hn';
      const feedUrl = FEEDS.find(f => f.id === feedId)?.url || FEEDS[0].url;
      
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items.slice(0, 15).map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        date: item.pubDate || item.isoDate || new Date().toISOString(),
        snippet: item.contentSnippet || (item as any).snippet || item.description || ''
      }));
      
      res.json({ success: true, items });
    } catch (error) {
      console.error('Error fetching feeds:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feeds' });
    }
  });

  // API: Generate Post
  app.post("/api/generate", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required' });
      }

      // Fetch article content
      let articleText = '';
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Remove scripts, styles, etc.
          $('script, style, nav, footer, iframe, noscript, header, aside').remove();
          
          // Get the main text
          articleText = $('body').text().replace(/\s+/g, ' ').trim();
        } else {
          console.warn('Failed to fetch full article, using URL only', response.status);
        }
      } catch (err) {
        console.warn('Error fetching full article', err);
      }

      if (!articleText) {
        articleText = 'Contenu de l\'article non disponible directement, veuillez vous baser sur le titre ou l\'URL : ' + url;
      } else {
        // Limit text to avoid huge context (30k chars is plenty for Gemini Flash)
        articleText = articleText.substring(0, 30000); 
      }

      const prompt = `Tu es le ghostwriter d'un jeune ingénieur logiciel en fin d'études. Ton objectif est de transformer une actualité ou ressource technique en un post LinkedIn captivant, conçu spécifiquement pour attirer des recruteurs tech et des Engineering Managers.

L'objectif du post est de valoriser :
- Sa curiosité intellectuelle et sa veille active.
- Sa capacité à vulgariser un sujet complexe (soft skill très prisée).
- Son état d'esprit "problem-solving" et son envie d'apprendre.

Règles de style impératives :
1. Accroche (Hook) : Courte, percutante, montrant une prise de recul ou un apprentissage
2. Le Problème & La Solution (Corps du post) : Explique simplement en 3 ou 4 points clés : Quel était le problème initial ? Comment cette technologie y répond ?
3. Ce que j'en retiens (Impact personnel) : Une phrase montrant la posture d'ingénieur ("En tant que jeune ingénieur, je retiens que le compromis entre performance et simplicité reste central...").
4. Appel à l'action sobre : Invitation à l'échange ("Vous utilisez déjà cette approche dans vos équipes ?", "Curieux d'avoir vos retours d'expérience !").
5. Zéro cliché d'IA : Ne jamais dire "À l'ère du numérique", "Je suis ravi d'annoncer", "Game changer". Ton naturel, humble, professionnel et enthousiaste.

Entrée :
- Source : ${url}
- Contenu / Résumé : ${articleText}

Format de sortie attendu :
- Le post prêt à copier-coller (avec sauts de ligne aérés).
- 3 hashtags pertinents (ex: #SoftwareEngineering #Architecture #VeilleTech).`;

      const genAI = getGenAI();
      const aiResponse = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      res.json({ success: true, post: aiResponse.text });

    } catch (error: any) {
      console.error('Error generating post:', error);
      let errorMessage = error.message || 'Failed to generate post';
      try {
        if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // ignore JSON parse errors
      }
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

// ---------------------------------------------------------
// LOCAL DEVELOPMENT & PRODUCTION SERVER START
// (Ignored by Vercel, used by npm run dev / start)
// ---------------------------------------------------------
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Only start the server if we're not in a Vercel environment
if (process.env.VERCEL !== "1") {
  startServer();
}

// Export the Express app for Vercel
export default app;
