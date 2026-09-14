import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ['description', 'content', 'content:encoded', 'pubDate'],
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  }
});

const FEEDS = [
  // Médias Francophones (en tête)
  { id: 'bfm_tech', name: 'BFM Tech IA (FR)', url: 'https://www.bfmtv.com/rss/tech/intelligence-artificielle/' },
  { id: 'nouvelobs_ia', name: 'Nouvel Obs IA (FR)', url: 'https://www.nouvelobs.com/intelligence-artificielle/rss.xml' },
  { id: 'clubic', name: 'Clubic Tech (FR)', url: 'https://www.clubic.com/feed/news.rss' },

  // Actualités IA & Startups
  { id: 'tldrai', name: 'TLDR AI', url: 'https://tldr.tech/api/rss/ai' },
  { id: 'techcrunch_ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'theverge_ai', name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'arstechnica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },

  // Modèles & Recherche IA
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'google_research', name: 'Google Research', url: 'https://research.google/blog/rss/' },
  { id: 'lastweekinai', name: 'Last Week in AI', url: 'https://lastweekinai.substack.com/feed' },
  { id: 'importai', name: 'Import AI', url: 'https://importai.substack.com/feed' },
  { id: 'mit_tech_review', name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },

  // Tech & Ingénierie
  { id: 'devto', name: 'Dev.to', url: 'https://dev.to/feed' },
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'bytebytego', name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed' },
  { id: 'netflix', name: 'Netflix Tech', url: 'https://netflixtechblog.com/feed' },
  { id: 'lobsters', name: 'Lobsters', url: 'https://lobste.rs/rss' },
];

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
    const urlObj = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const feedId = (req.query?.id as string) || urlObj.searchParams.get('id') || 'devto';
    const feedUrl = FEEDS.find(f => f.id === feedId)?.url || FEEDS[0].url;

    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items || []).slice(0, 15).map(item => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      date: item.pubDate || item.isoDate || new Date().toISOString(),
      snippet: item.contentSnippet || (item as any).snippet || item.description || ''
    }));

    res.status(200).json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching feeds:', error);
    // Return 200 with error details so the frontend handles it cleanly instead of throwing 500
    res.status(200).json({ 
      success: false, 
      items: [], 
      error: `Impossible de charger le flux (${error?.message || 'Erreur inconnue'}). Le site source est peut-être temporairement inaccessible.`
    });
  }
}
