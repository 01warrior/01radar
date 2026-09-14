import React, { useState, useEffect, useMemo } from 'react';
import { Newspaper, ChevronRight, Copy, Check, ExternalLink, Loader2, RefreshCw, Rss, ArrowRight, ArrowLeft, Bookmark, BookmarkCheck, Trash2, X, Sparkles, Search, Linkedin, Flame } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FeedItem, FeedSource, SavedPost } from './types';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = ['Tous', 'FR (Français)', 'Actualités IA', 'Recherche & Modèles', 'Ingénierie & Tech'] as const;

const FEEDS: FeedSource[] = [
  // Médias Francophones (en tête)
  { id: 'bfm_tech', name: 'BFM Tech IA', category: 'FR (Français)' },
  { id: 'nouvelobs_ia', name: 'Nouvel Obs IA', category: 'FR (Français)' },
  { id: 'clubic', name: 'Clubic Tech', category: 'FR (Français)' },

  // Actualités IA & Startups
  { id: 'tldrai', name: 'TLDR AI', category: 'Actualités IA' },
  { id: 'techcrunch_ai', name: 'TechCrunch AI', category: 'Actualités IA' },
  { id: 'theverge_ai', name: 'The Verge AI', category: 'Actualités IA' },
  { id: 'arstechnica', name: 'Ars Technica', category: 'Actualités IA' },

  // Modèles & Recherche IA
  { id: 'huggingface', name: 'Hugging Face', category: 'Recherche & Modèles' },
  { id: 'google_research', name: 'Google Research', category: 'Recherche & Modèles' },
  { id: 'lastweekinai', name: 'Last Week in AI', category: 'Recherche & Modèles' },
  { id: 'importai', name: 'Import AI', category: 'Recherche & Modèles' },
  { id: 'mit_tech_review', name: 'MIT Tech Review', category: 'Recherche & Modèles' },

  // Ingénierie & Dev généraliste
  { id: 'devto', name: 'Dev.to', category: 'Ingénierie & Tech' },
  { id: 'hn', name: 'Hacker News', category: 'Ingénierie & Tech' },
  { id: 'bytebytego', name: 'ByteByteGo', category: 'Ingénierie & Tech' },
  { id: 'netflix', name: 'Netflix Tech', category: 'Ingénierie & Tech' },
  { id: 'lobsters', name: 'Lobsters', category: 'Ingénierie & Tech' },
];

const QUICK_TAGS = ['React', 'Docker', 'Postgres', 'IA'];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [activeFeed, setActiveFeed] = useState<string>('bfm_tech');
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [errorFeeds, setErrorFeeds] = useState<string | null>(null);
  
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(() => {
    try {
      const saved = localStorage.getItem('techwatch_saved_posts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showSaved, setShowSaved] = useState(false);
  const [isCurrentPostSaved, setIsCurrentPostSaved] = useState(false);
  const [viewingSavedPost, setViewingSavedPost] = useState<SavedPost | null>(null);

  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('techwatch_hide_welcome') !== 'true';
  });

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('techwatch_hide_welcome', 'true');
  };

  useEffect(() => {
    localStorage.setItem('techwatch_saved_posts', JSON.stringify(savedPosts));
  }, [savedPosts]);

  useEffect(() => {
    fetchFeeds(activeFeed);
  }, [activeFeed]);

  const fetchFeeds = async (feedId: string) => {
    setLoadingFeeds(true);
    setErrorFeeds(null);
    setArticles([]);
    try {
      const response = await fetch(`/api/feeds?id=${feedId}`);
      const data = await response.json();
      if (data.success) {
        setArticles(data.items);
      } else {
        setErrorFeeds(data.error || 'Erreur lors du chargement des flux.');
      }
    } catch (err) {
      setErrorFeeds('Erreur de connexion au serveur.');
    } finally {
      setLoadingFeeds(false);
    }
  };

  const handleGenerate = async (article: FeedItem) => {
    setSelectedArticle(article);
    setGenerating(true);
    setGeneratedPost('');
    setGenerationError(null);
    setCopied(false);
    setIsCurrentPostSaved(false);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.link }),
      });
      const data = await response.json();
      
      if (data.success) {
        setGeneratedPost(data.post);
      } else {
        setGenerationError(data.error || 'Erreur lors de la génération du post.');
      }
    } catch (err) {
      setGenerationError('Erreur de connexion au serveur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const visibleFeeds = useMemo(() => {
    if (selectedCategory === 'Tous') return FEEDS;
    return FEEDS.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

  // Titres aléatoires légers pour le bandeau d'actualités en haut (aucun impact perfs)
  const tickerArticles = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    // Prendre un échantillon varié de titres
    return [...articles].sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase().trim();
    return articles.filter(article => {
      const titleMatch = (article.title || '').toLowerCase().includes(query);
      const snippetMatch = (article.snippet || '').toLowerCase().includes(query);
      return titleMatch || snippetMatch;
    });
  }, [articles, searchQuery]);

  const handleShareLinkedIn = (textToShare: string) => {
    if (!textToShare) return;
    try {
      navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setShared(true);
      setTimeout(() => {
        setCopied(false);
        setShared(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }

    const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textToShare)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!generatedPost) return;
    try {
      await navigator.clipboard.writeText(generatedPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSavePost = () => {
    if (!selectedArticle || !generatedPost || isCurrentPostSaved) return;
    
    const newPost: SavedPost = {
      id: Date.now().toString(),
      title: selectedArticle.title,
      link: selectedArticle.link,
      content: generatedPost,
      savedAt: new Date().toISOString(),
    };
    
    setSavedPosts([newPost, ...savedPosts]);
    setIsCurrentPostSaved(true);
  };

  const handleDeletePost = (id: string) => {
    setSavedPosts(savedPosts.filter(p => p.id !== id));
  };

  const handleBack = () => {
    if (showSaved) {
      setShowSaved(false);
    } else {
      setSelectedArticle(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMM yyyy 'à' HH:mm", { locale: fr });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0">
        {/* News Ticker Bar (Déroulant aléatoire ultra-léger) */}
        {tickerArticles.length > 0 && (
          <div className="bg-gray-900 text-gray-200 text-xs py-1.5 px-4 border-b border-gray-800 overflow-hidden relative flex items-center">
            <div className="flex items-center gap-1.5 font-bold text-red-500 uppercase tracking-wider text-[11px] shrink-0 pr-3 z-10 bg-gray-900 shadow-lg">
              <Flame size={13} className="animate-pulse text-red-500" />
              <span>Flash Info :</span>
            </div>
            
            {/* Dégradés latéraux */}
            <div className="absolute left-24 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900 to-transparent z-10 pointer-events-none" />

            {/* Marquee de titres aléatoires */}
            <div className="overflow-hidden flex-1 group">
              <div className="animate-marquee-left flex items-center gap-8 whitespace-nowrap text-[12px]">
                {[...tickerArticles, ...tickerArticles].map((art, i) => (
                  <button
                    key={`ticker-${art.link}-${i}`}
                    onClick={() => handleGenerate(art)}
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white hover:underline transition-colors text-left group-hover:cursor-pointer"
                    title="Cliquer pour générer un post"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 shrink-0" />
                    <span className="font-medium truncate max-w-sm sm:max-w-md">{art.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex flex-col items-start">
            <img src="/logoheader.jpg" alt="01 radar logo" className="h-10 w-auto rounded-xl shadow-sm object-contain object-left sm:mb-1.5" />
            <div className="text-[13px] text-gray-500 font-medium hidden sm:block">
              Convertissez votre veille tech en posts LinkedIn
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => {
                setShowSaved(true);
                setSelectedArticle(null);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-full transition-all shadow-sm hover:shadow-md hover:shadow-red-600/20 relative"
            >
              <Bookmark size={18} />
              <span className="hidden sm:inline">Mes posts</span>
              {savedPosts.length > 0 && (
                <span className="bg-white text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full absolute -top-1.5 -right-1.5 sm:static sm:top-auto sm:right-auto shadow-sm">
                  {savedPosts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {showSaved ? (
            /* SAVED POSTS VIEW */
            <motion.div 
              key="saved-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              <div className="pb-5 mb-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBack}
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Retour"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                    <Bookmark size={20} className="text-red-600" />
                    Posts enregistrés
                  </h2>
                </div>
              </div>

              <div className="w-full">
                {savedPosts.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3 text-center">
                    <Bookmark size={36} className="text-gray-300" />
                    <p className="text-base">Vous n'avez pas encore de posts enregistrés.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className="group p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-red-200 hover:shadow-md transition-all cursor-pointer flex flex-col h-full relative"
                        onClick={() => setViewingSavedPost(post)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 pr-6 line-clamp-2 group-hover:text-red-600 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
                          {formatDate(post.savedAt)}
                        </p>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Voir le post <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : !selectedArticle ? (
            /* LIST VIEW DIRECTLY ON PAGE */
            <motion.div 
              key="feed-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              {/* Category Pills & Feed Tabs Bar */}
              <div className="pb-4 mb-5 border-b border-gray-200/80 flex flex-col gap-3">
                {/* Category selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar touch-pan-x">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-1 shrink-0">Catégories :</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        const firstInCat = cat === 'Tous' ? FEEDS[0] : FEEDS.find(f => f.category === cat);
                        if (firstInCat && !visibleFeeds.some(f => f.id === activeFeed)) {
                          setActiveFeed(firstInCat.id);
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
                        selectedCategory === cat
                          ? "bg-gray-900 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Feed Pills in Category with smooth marquee scrolling towards right */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative overflow-hidden flex-1 group py-1">
                    {/* Gradient masks left & right for smooth blend */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
                    
                    {/* Marquee track scrolling to the right */}
                    <div className="animate-marquee-right flex items-center gap-2.5">
                      {[...visibleFeeds, ...visibleFeeds].map((feed, idx) => (
                        <button
                          key={`${feed.id}-${idx}`}
                          onClick={() => setActiveFeed(feed.id)}
                          className={cn(
                            "whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 shrink-0",
                            activeFeed === feed.id
                              ? "bg-red-600 text-white shadow-md shadow-red-600/25 scale-[1.02]"
                              : "text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100/90 border border-gray-200/80 shadow-2xs hover:border-gray-300"
                          )}
                        >
                          {feed.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => fetchFeeds(activeFeed)}
                    disabled={loadingFeeds}
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors shrink-0 self-center"
                    title="Rafraîchir"
                  >
                    <RefreshCw size={18} className={cn(loadingFeeds && "animate-spin")} />
                  </button>
                </div>
              </div>

              {/* Instant Search Bar & Quick Tags */}
              <div className="mb-6 flex flex-col gap-3">
                <div className="relative flex items-center">
                  <Search size={20} className="absolute left-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un mot-clé (React, Docker, Postgres, IA...)"
                    className="w-full pl-12 pr-11 py-3.5 sm:py-4 rounded-2xl bg-white border border-gray-200 text-base text-gray-900 placeholder:text-gray-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      title="Effacer la recherche"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Quick Tags Suggestions */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar touch-pan-x">
                  <span className="text-gray-400 font-medium shrink-0 text-xs hidden sm:inline">Mots-clés :</span>
                  {QUICK_TAGS.map((tag) => {
                    const isSelected = searchQuery.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(isSelected ? '' : tag)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 border text-xs sm:text-sm",
                          isSelected
                            ? "bg-red-600 text-white border-red-600 font-semibold shadow-sm"
                            : "bg-white text-gray-700 border-gray-200/90 hover:border-gray-300 hover:text-gray-900 shadow-xs"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold ml-1 shrink-0"
                    >
                      Réinitialiser ({filteredArticles.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Welcome Alert */}
              {showWelcome && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  className="mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5 sm:p-6 relative"
                >
                  <button 
                    onClick={dismissWelcome}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white/50 rounded-full transition-colors"
                    title="Masquer"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-start">
                    <div>
                      <h3 className="text-gray-900 font-extrabold text-xl sm:text-2xl tracking-tight mb-2 pr-6">
                        Bienvenue sur 01 radar !
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed max-w-3xl">
                        Ne perdez plus de temps à rédiger vos posts de veille. Sélectionnez un article tech parmi nos flux (Dev.to, Hacker News, ByteByteGo, etc.) et laissez notre IA générer instantanément un post LinkedIn professionnel et engageant, prêt à être publié.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Articles Stream */}
              <div className="w-full">
                {loadingFeeds && articles.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Loader2 size={28} className="animate-spin text-red-600" />
                    <p className="text-sm font-medium">Chargement des articles...</p>
                  </div>
                ) : errorFeeds ? (
                  <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
                    {errorFeeds}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center text-gray-500 py-16 font-medium">
                    Aucun article trouvé pour ce flux.
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="py-16 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-red-50 text-red-600 rounded-full">
                      <Search size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">
                        Aucun article ne correspond à « {searchQuery} »
                      </h4>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Aucun résultat dans les {articles.length} articles de ce flux. Essayez un autre mot-clé ou réinitialisez le filtre.
                      </p>
                    </div>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-1 px-5 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                    >
                      Effacer la recherche
                    </button>
                  </div>
                ) : (
                  <div>
                    {searchQuery && (
                      <div className="mb-4 flex items-center justify-between text-xs text-gray-500 font-medium">
                        <span>{filteredArticles.length} {filteredArticles.length > 1 ? 'articles trouvés' : 'article trouvé'} pour « {searchQuery} »</span>
                        <button onClick={() => setSearchQuery('')} className="text-red-600 hover:underline">
                          Voir tous les articles
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {filteredArticles.map((article, idx) => (
                        <div 
                          key={idx} 
                          className="group p-6 rounded-2xl bg-white border border-gray-100 hover:border-red-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 flex flex-col gap-3 relative"
                        >
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2 group-hover:text-red-600 transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                              {formatDate(article.date)}
                            </p>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed flex-1">
                            {article.snippet.replace(/<[^>]*>?/gm, '') || "Aucun résumé disponible."}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                            <a 
                              href={article.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink size={14} />
                              Lire l'original
                            </a>
                            <button
                              onClick={() => handleGenerate(article)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-800 group-hover:bg-red-600 group-hover:text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-red-600/20"
                            >
                              <span>Générer</span>
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* DRAFT VIEW DIRECTLY ON PAGE */
            <motion.div 
              key="draft-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col"
            >
              <div className="pb-5 mb-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBack}
                    className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Retour aux articles"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                    <Newspaper size={20} className="text-red-600" />
                    Brouillon LinkedIn
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(generatedPost || generationError) && (
                    <button
                      onClick={() => handleGenerate(selectedArticle)}
                      disabled={generating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                      title="Générer un autre brouillon"
                    >
                      <RefreshCw size={16} className={cn(generating && "animate-spin")} />
                      <span className="hidden sm:inline">Regénérer</span>
                    </button>
                  )}
                  {generatedPost && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleSavePost}
                        disabled={isCurrentPostSaved}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm",
                          isCurrentPostSaved
                            ? "bg-gray-100 text-gray-500 cursor-default border border-transparent"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                        )}
                      >
                        {isCurrentPostSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        <span className="hidden sm:inline">{isCurrentPostSaved ? "Enregistré" : "Enregistrer"}</span>
                      </button>
                      <button
                        onClick={handleCopy}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm",
                          copied && !shared
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        )}
                      >
                        {copied && !shared ? <Check size={16} /> : <Copy size={16} />}
                        <span className="hidden sm:inline">{copied && !shared ? "Copié !" : "Copier"}</span>
                      </button>
                      <button
                        onClick={() => handleShareLinkedIn(generatedPost)}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all bg-[#0a66c2] hover:bg-[#004182] text-white shadow-sm hover:shadow-md hover:shadow-blue-600/25"
                        title="Copie le texte et ouvre LinkedIn pour publier"
                      >
                        <Linkedin size={16} className="fill-current shrink-0" />
                        <span>Partager</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full flex flex-col">
                {generating ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                    <Loader2 size={36} className="text-red-600 animate-spin" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">Génération en cours...</h3>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Analyse de "{selectedArticle.title}" et rédaction du post LinkedIn optimisé.
                      </p>
                    </div>
                  </div>
                ) : generationError ? (
                  <div className="p-6 rounded-2xl bg-red-50 text-red-700 border border-red-200 flex flex-col items-start gap-4">
                    <div>
                      <p className="font-bold mb-1 text-base">Erreur de génération</p>
                      <p className="text-sm opacity-90 break-words max-w-full">
                        {generationError.includes('503') 
                          ? "L'IA est actuellement très sollicitée. Veuillez réessayer dans quelques instants." 
                          : generationError}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleGenerate(selectedArticle)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      <RefreshCw size={16} />
                      Réessayer
                    </button>
                  </div>
                ) : generatedPost ? (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Source de l'article :</h3>
                      <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-red-600 hover:underline">
                        {selectedArticle.title}
                      </a>
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="post-content">Contenu du post LinkedIn</label>
                      <textarea
                        id="post-content"
                        rows={14}
                        value={generatedPost}
                        onChange={(e) => setGeneratedPost(e.target.value)}
                        className="w-full p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none text-gray-800 leading-relaxed font-medium font-sans shadow-inner bg-white"
                        placeholder="Le post généré apparaîtra ici..."
                      />
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-900 rounded-xl flex gap-3 items-start border border-blue-100">
                      <div className="bg-white p-1 rounded-full text-blue-500 mt-0.5 shadow-sm shrink-0">
                        <ChevronRight size={16} />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold mb-0.5">Conseil de publication</p>
                        <p className="text-blue-800 leading-relaxed">
                          Cliquez sur <strong>Partager sur LinkedIn</strong> pour ouvrir directement l'interface de publication LinkedIn avec votre texte copié. Si LinkedIn ne pré-remplit pas le champ dans votre navigateur, faites simplement <strong>Coller (Ctrl+V ou ⌘+V)</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>  
        {/* MODAL FOR VIEWING SAVED POST */}
        <AnimatePresence>
          {viewingSavedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setViewingSavedPost(null)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="pr-4">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{viewingSavedPost.title}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-1">
                      Enregistré le {formatDate(viewingSavedPost.savedAt)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setViewingSavedPost(null)} 
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto text-gray-800 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {viewingSavedPost.content}
                </div>
                
                <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-white flex-wrap gap-3">
                  <button
                    onClick={() => {
                      handleDeletePost(viewingSavedPost.id);
                      setViewingSavedPost(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(viewingSavedPost.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm",
                        copied && !shared
                          ? "bg-green-600 text-white hover:bg-green-700" 
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      )}
                    >
                      {copied && !shared ? <Check size={16} /> : <Copy size={16} />}
                      <span className="hidden sm:inline">{copied && !shared ? "Copié !" : "Copier"}</span>
                    </button>
                    <button
                      onClick={() => handleShareLinkedIn(viewingSavedPost.content)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all bg-[#0a66c2] hover:bg-[#004182] text-white shadow-sm hover:shadow-md hover:shadow-blue-600/25"
                      title="Copie le texte et ouvre LinkedIn pour publier"
                    >
                      <Linkedin size={16} className="fill-current shrink-0" />
                      <span>Partager</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
