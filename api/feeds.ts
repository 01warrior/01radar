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
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'reddit', name: 'r/programming', url: 'https://www.reddit.com/r/programming/.rss' },
  { id: 'reddit-ml', name: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss' },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'lobsters', name: 'Lobsters', url: 'https://lobste.rs/rss' },
  { id: 'bytebytego', name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed' },
  { id: 'netflix', name: 'Netflix Tech', url: 'https://netflixtechblog.com/feed' },
  { id: 'devto', name: 'Dev.to', url: 'https://dev.to/feed' },
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
    const feedId = (req.query?.id as string) || urlObj.searchParams.get('id') || 'hn';
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
