import * as cheerio from 'cheerio';
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing. Veuillez ajouter la variable d'environnement GEMINI_API_KEY dans les paramètres de votre projet Vercel (Settings > Environment Variables).");
    }
    ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return ai;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore
      }
    }

    const url = body?.url;
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
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        $('script, style, nav, footer, iframe, noscript, header, aside').remove();
        articleText = $('body').text().replace(/\s+/g, ' ').trim();
      }
    } catch (err) {
      console.warn('Error fetching full article content, using URL fallback', err);
    }

    if (!articleText) {
      articleText = 'Contenu de l\'article non disponible directement, veuillez vous baser sur le titre ou l\'URL : ' + url;
    } else {
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
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    res.status(200).json({ success: true, post: aiResponse.text });
  } catch (error: any) {
    console.error('Error generating post:', error);
    let errorMessage = error?.message || 'Failed to generate post';
    try {
      if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.error.message) {
          errorMessage = parsed.error.message;
        }
      }
    } catch (e) {
      // ignore JSON parse
    }
    res.status(200).json({ success: false, error: errorMessage });
  }
}
