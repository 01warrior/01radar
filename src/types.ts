export interface FeedItem {
  title: string;
  link: string;
  date: string;
  snippet: string;
}

export interface FeedSource {
  id: string;
  name: string;
  category?: string;
}

export interface SavedPost {
  id: string;
  title: string;
  link: string;
  content: string;
  savedAt: string;
}
