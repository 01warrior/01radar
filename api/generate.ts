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

    const tone = body?.tone || 'jeune_ingenieur';

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

    let personaContext = "";
    let impactContext = "";

    switch (tone) {
      case 'expert':
        personaContext = "Tu es un Ingénieur Logiciel Staff/Senior et tu publies sur LinkedIn.";
        impactContext = `Une phrase montrant l'expertise et la vision d'architecture ("D'après mon expérience sur des systèmes distribués, ce type de pattern permet de...").`;
        break;
      case 'vulgarisateur':
        personaContext = "Tu es un Développeur Créateur de contenu qui adore vulgariser la tech complexe pour tous les niveaux.";
        impactContext = `Une phrase qui connecte le sujet à la vraie vie avec une métaphore simple ("Au final, c'est un peu comme organiser une bibliothèque géante...").`;
        break;
      case 'manager':
        personaContext = "Tu es un Engineering Manager ou CTO qui partage sa vision d'équipe, de management et de l'industrie tech.";
        impactContext = `Une phrase axée sur la productivité, l'équipe ou le ROI ("C'est le genre de pratique qui peut améliorer considérablement notre delivery...").`;
        break;
      case 'neutre':
        personaContext = "Tu es un veilleur technologique professionnel qui partage de l'information factuelle et précise.";
        impactContext = `Une conclusion purement factuelle, résumant les perspectives futures de cette technologie sans avis personnel marqué.`;
        break;
      case 'jeune_ingenieur':
      default:
        personaContext = "Tu es le ghostwriter d'un jeune ingénieur logiciel en fin d'études. Ton objectif est de transformer une actualité en un post LinkedIn captivant pour attirer des recruteurs tech.";
        impactContext = `Une phrase montrant la posture d'ingénieur curieux ("En tant que jeune ingénieur, je retiens que le compromis entre performance et simplicité reste au centre des enjeux...").`;
        break;
    }

    const prompt = `${personaContext}

L'objectif du post est de valoriser une veille technologique pertinente.

Règles de style impératives :
1. Accroche (Hook) : Courte, percutante, invitant à la lecture.
2. Le Problème & La Solution (Corps du post) : Explique simplement en quelques points clés : Quel était le problème initial ? Comment cette technologie/article y répond ?
3. L'impact / La prise de recul : ${impactContext}
4. Appel à l'action sobre : Invitation à l'échange ("Vous utilisez déjà cette approche ?", "Qu'en pensez-vous ?").
5. Zéro cliché d'IA : Ne jamais dire "À l'ère du numérique", "Je suis ravi de partager", "Un vrai game changer". Reste naturel, humble et authentique.

Entrée :
- Source : ${url}
- Contenu / Résumé : ${articleText}

Format de sortie attendu :
- Le post prêt à copier-coller (avec sauts de ligne aérés).
- 3 hashtags pertinents.`;

    const genAI = getGenAI();
    const aiResponse = await genAI.models.generateContent({
      model: 'gemini-3.5-flash-lite',
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
