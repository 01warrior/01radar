import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Newspaper, ChevronRight, ChevronLeft, Copy, Check, ExternalLink, Loader2, RefreshCw, Rss, ArrowRight, ArrowLeft, Bookmark, BookmarkCheck, Trash2, X, Sparkles, Search, Linkedin, Flame, SlidersHorizontal, Layers, User, Briefcase, Lightbulb, Users, AlignLeft, MessageSquareText, Gift } from 'lucide-react';
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

const TONES = [
  { id: 'jeune_ingenieur', label: 'Étudiant / Junior', icon: User, desc: 'Curieux, volontaire et en apprentissage' },
  { id: 'expert', label: 'Expert / Senior', icon: Briefcase, desc: 'Expérimenté, vision d\'architecture' },
  { id: 'vulgarisateur', label: 'Vulgarisateur', icon: Lightbulb, desc: 'Pédagogue, analogies simples' },
  { id: 'manager', label: 'Manager / Lead', icon: Users, desc: 'Focus équipe, process et productivité' },
  { id: 'neutre', label: 'Neutre / Factuel', icon: AlignLeft, desc: 'Direct, journalistique, sans avis' },
] as const;

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

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState<boolean>(false);
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
  const feedsScrollRef = useRef<HTMLDivElement>(null);

  const [isToneModalOpen, setIsToneModalOpen] = useState(false);
  const [articleToGenerate, setArticleToGenerate] = useState<FeedItem | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>(() => {
    return localStorage.getItem('techwatch_selected_tone') || 'jeune_ingenieur';
  });

  const scrollFeeds = (direction: 'left' | 'right') => {
    if (feedsScrollRef.current) {
      const scrollAmount = 260;
      feedsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
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
    localStorage.setItem('techwatch_selected_tone', selectedTone);
  }, [selectedTone]);

  // Empêcher le défilement de l'arrière-plan quand un modal ou BottomSheet est ouvert
  useEffect(() => {
    const isAnyModalOpen = isCategorySheetOpen || viewingSavedPost !== null || isToneModalOpen;
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isCategorySheetOpen, viewingSavedPost, isToneModalOpen]);

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

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    const firstInCat = cat === 'Tous' ? FEEDS[0] : FEEDS.find(f => f.category === cat);
    if (firstInCat) {
      const isCurrentActiveInNewCat = cat === 'Tous' || FEEDS.some(f => f.id === activeFeed && f.category === cat);
      if (!isCurrentActiveInNewCat) {
        setActiveFeed(firstInCat.id);
      }
    }
  };

  const openToneModal = (article: FeedItem) => {
    setArticleToGenerate(article);
    setIsToneModalOpen(true);
  };

  const handleGenerate = async (article: FeedItem, tone: string) => {
    setIsToneModalOpen(false);
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
        body: JSON.stringify({ url: article.link, tone }),
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
          <div className="bg-gray-900 text-gray-200 text-xs py-2 px-4 border-b border-gray-800 overflow-hidden relative flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-red-500 uppercase tracking-wider text-[11px] shrink-0 z-10 select-none">
              <Flame size={14} className="animate-pulse text-red-500 shrink-0" />
              <span className="whitespace-nowrap">Flash Info :</span>
            </div>
            
            {/* Dégradés latéraux doux */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-900 via-gray-900/80 to-transparent z-10 pointer-events-none" />

            {/* Marquee de titres aléatoires */}
            <div className="overflow-hidden flex-1 group">
              <div className="animate-marquee-left flex items-center gap-8 whitespace-nowrap text-[12px]">
                {[...tickerArticles, ...tickerArticles].map((art, i) => (
                  <button
                    key={`ticker-${art.link}-${i}`}
                    onClick={() => openToneModal(art)}
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white hover:underline transition-colors text-left cursor-pointer"
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
              {/* Instant Search Bar + Mobile Category Trigger Button */}
              <div className="mb-5 flex items-center gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <Search size={20} className="absolute left-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher dans les articles..."
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

                {/* Bouton Filtre/Catégories mobile à droite de la barre de recherche */}
                <button
                  onClick={() => setIsCategorySheetOpen(true)}
                  className={cn(
                    "sm:hidden flex items-center justify-center gap-1.5 px-3.5 py-3.5 rounded-2xl border transition-all shrink-0 shadow-xs font-semibold text-sm",
                    selectedCategory !== 'Tous'
                      ? "bg-red-600 text-white border-red-600 shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:bg-gray-100"
                  )}
                  title="Choisir une catégorie"
                  aria-label="Choisir une catégorie"
                >
                  <SlidersHorizontal size={18} />
                  <span className="max-w-[70px] truncate text-xs">
                    {selectedCategory === 'Tous' ? 'Filtres' : selectedCategory.split(' ')[0]}
                  </span>
                </button>
              </div>

              {/* Category Pills (Desktop) & Feed Tabs Bar */}
              <div className="pb-4 mb-6 border-b border-gray-200/80 flex flex-col gap-3">
                {/* Category selector visible sur desktop / tablettes */}
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar touch-pan-x">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-1 shrink-0">Catégories :</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
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

                {/* Feed Pills in Category with smooth scroll and controls */}
                <div className="flex items-center gap-1.5 w-full">
                  {/* Bouton défilement gauche */}
                  <button
                    onClick={() => scrollFeeds('left')}
                    className="hidden sm:flex items-center justify-center p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                    title="Défiler vers la gauche"
                    aria-label="Défiler vers la gauche"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="relative overflow-hidden flex-1 py-1">
                    {/* Gradient masks left & right */}
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
                    
                    {/* Zone entièrement scrollable au doigt, molette ou trackpad */}
                    <div 
                      ref={feedsScrollRef}
                      className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-2 scrollbar-hide no-scrollbar touch-pan-x cursor-grab active:cursor-grabbing select-none"
                    >
                      {visibleFeeds.map((feed) => (
                        <button
                          key={feed.id}
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

                  {/* Bouton défilement droite */}
                  <button
                    onClick={() => scrollFeeds('right')}
                    className="hidden sm:flex items-center justify-center p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                    title="Défiler vers la droite"
                    aria-label="Défiler vers la droite"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <button 
                    onClick={() => fetchFeeds(activeFeed)}
                    disabled={loadingFeeds}
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors shrink-0 self-center ml-1"
                    title="Rafraîchir"
                  >
                    <RefreshCw size={18} className={cn(loadingFeeds && "animate-spin")} />
                  </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 flex flex-col gap-4 animate-pulse">
                        <div>
                          <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3"></div>
                          <div className="h-6 bg-gray-200 rounded-md w-1/2 mb-3"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                        </div>
                        <div className="flex-1 space-y-2 mt-2">
                          <div className="h-4 bg-gray-100 rounded w-full"></div>
                          <div className="h-4 bg-gray-100 rounded w-full"></div>
                          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-9 bg-gray-200 rounded-full w-28"></div>
                        </div>
                      </div>
                    ))}
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
                              onClick={() => openToneModal(article)}
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

              {/* Bannière Promotionnelle Pleine Largeur */}
              {!loadingFeeds && !errorFeeds && (
                <div className="mt-12 w-full">
                  <div className="relative isolate overflow-hidden bg-red-600 rounded-3xl p-8 sm:p-10 shadow-xl shadow-black/15 border-2 border-black">
                    {/* Bulles design décoratives rentrées pour préserver les coins */}
                    <div className="absolute -top-16 -right-16 w-56 h-56 bg-red-500 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-pulse pointer-events-none"></div>
                    <div className="absolute bottom-3 left-16 w-48 h-48 bg-red-800/60 rounded-full mix-blend-multiply filter blur-xl opacity-60 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-24 bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-12 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                      <div className="flex-1 text-center sm:text-left text-white">
                        <h3 className="font-extrabold text-2xl sm:text-3xl tracking-tight mb-3">
                          Boostez votre productivité avec l'IA
                        </h3>
                        <p className="text-red-100 text-sm sm:text-base leading-relaxed max-w-2xl">
                          Découvrez les meilleurs outils pour optimiser votre quotidien et formez-vous pour rester à la pointe des nouvelles technologies, sans exploser votre budget.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 w-full sm:w-auto shrink-0">
                        <a 
                          href="https://bon-p-lan-ai.vercel.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 hover:scale-105 transition-all shadow-md"
                        >
                          <Gift size={18} />
                          Bons plans IA gratuits
                        </a>
                        <a 
                          href="https://site-formation-ten.vercel.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-all shadow-md"
                        >
                          <ExternalLink size={18} />
                          Se former sur les outils IA
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                      onClick={() => openToneModal(selectedArticle)}
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
                      onClick={() => openToneModal(selectedArticle)}
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

        {/* Mobile BottomSheet Modal pour les Catégories */}
        <AnimatePresence>
          {isCategorySheetOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:hidden overscroll-none touch-none">
              {/* Backdrop flouté */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCategorySheetOpen(false)}
                onTouchMove={(e) => e.preventDefault()}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs touch-none"
              />

              {/* Panneau BottomSheet glissant depuis le bas */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative w-full bg-white rounded-t-3xl p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto overscroll-contain flex flex-col touch-pan-y"
              >
                {/* Poignée de drag/visual bar */}
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5 shrink-0" />

                {/* En-tête du BottomSheet */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">Filtrer par catégorie</h3>
                      <p className="text-xs text-gray-500">Sélectionnez une thématique de veille</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCategorySheetOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Liste des catégories dans le BottomSheet */}
                <div className="flex flex-col gap-2.5 pb-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    const count = cat === 'Tous' ? FEEDS.length : FEEDS.filter(f => f.category === cat).length;
                    return (
                      <button
                        key={`sheet-${cat}`}
                        onClick={() => {
                          handleCategorySelect(cat);
                          setIsCategorySheetOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-medium transition-all",
                          isSelected
                            ? "bg-red-50 text-red-600 font-semibold border-2 border-red-500/80 shadow-xs"
                            : "bg-gray-50 text-gray-800 hover:bg-gray-100 border-2 border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            isSelected ? "bg-red-600" : "bg-gray-300"
                          )} />
                          <span className="text-sm">{cat}</span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-semibold",
                          isSelected ? "bg-red-200/80 text-red-800" : "bg-gray-200 text-gray-600"
                        )}>
                          {count} source{count > 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tone Selection Modal */}
        <AnimatePresence>
          {isToneModalOpen && articleToGenerate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overscroll-none touch-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsToneModalOpen(false)}
                onTouchMove={(e) => e.preventDefault()}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs touch-none"
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <MessageSquareText size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">Ton du post</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">Sélectionnez la persona pour la génération</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsToneModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2 scrollbar-hide no-scrollbar">
                  {TONES.map((tone) => {
                    const isSelected = selectedTone === tone.id;
                    const Icon = tone.icon;
                    return (
                      <button
                        key={`tone-${tone.id}`}
                        onClick={() => setSelectedTone(tone.id)}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all border-2",
                          isSelected
                            ? "bg-red-50 border-red-500/80 shadow-xs"
                            : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500"
                        )}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className={cn("font-bold text-sm mb-1", isSelected ? "text-red-900" : "text-gray-900")}>
                            {tone.label}
                          </h4>
                          <p className={cn("text-xs leading-relaxed", isSelected ? "text-red-700/80" : "text-gray-500")}>
                            {tone.desc}
                          </p>
                        </div>
                        <div className="flex items-center h-10 shrink-0">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-red-600 bg-red-600" : "border-gray-300 bg-white"
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsToneModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleGenerate(articleToGenerate, selectedTone)}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Générer le post
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer Léger */}
        <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-auto border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div>
              <span>&copy; {new Date().getFullYear()} 01 radar. Tous droits réservés.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://bon-p-lan-ai.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
                Bons plans IA
              </a>
              <a href="https://site-formation-ten.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
                Se former
              </a>
            </div>
          </div>
        </footer>
    </div>
  );
}
