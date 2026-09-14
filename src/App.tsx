import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronRight, Copy, Check, ExternalLink, Loader2, RefreshCw, Rss, ArrowRight, ArrowLeft, Bookmark, BookmarkCheck, Trash2, X, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FeedItem, FeedSource, SavedPost } from './types';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FEEDS: FeedSource[] = [
  { id: 'hn', name: 'Hacker News' },
  { id: 'reddit', name: 'r/programming' },
  { id: 'reddit-ml', name: 'r/MachineLearning (IA)' },
  { id: 'huggingface', name: 'Hugging Face (IA)' },
  { id: 'lobsters', name: 'Lobsters' },
  { id: 'bytebytego', name: 'ByteByteGo' },
  { id: 'netflix', name: 'Netflix Tech' },
  { id: 'devto', name: 'Dev.to' },
];

export default function App() {
  const [activeFeed, setActiveFeed] = useState<string>('hn');
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [errorFeeds, setErrorFeeds] = useState<string | null>(null);
  
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string>('');
  const [copied, setCopied] = useState(false);
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
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

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative">
        <AnimatePresence mode="wait">
          {showSaved ? (
            /* SAVED POSTS VIEW */
            <motion.div 
              key="saved-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden flex flex-col h-[calc(100vh-8rem)] absolute inset-0 m-4 sm:m-6 lg:m-8"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBack}
                    className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
                    title="Retour"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Bookmark size={18} className="text-red-500" />
                    Posts enregistrés
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
                {savedPosts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Bookmark size={32} className="text-gray-300" />
                    <p>Vous n'avez pas encore de posts enregistrés.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {savedPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-red-200 hover:shadow-md transition-all cursor-pointer flex flex-col h-full relative"
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
                        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 pr-6 line-clamp-2 group-hover:text-red-700 transition-colors">
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
                        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
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
            /* LIST VIEW */
            <motion.div 
              key="feed-list"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden flex flex-col h-[calc(100vh-8rem)] absolute inset-0 m-4 sm:m-6 lg:m-8"
            >
              {/* Feed Selector */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex gap-1 overflow-x-auto pb-2 -mb-2 scrollbar-hide px-2">
                  {FEEDS.map(feed => (
                    <button
                      key={feed.id}
                      onClick={() => setActiveFeed(feed.id)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200",
                        activeFeed === feed.id
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
                      )}
                    >
                      {feed.name}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => fetchFeeds(activeFeed)}
                  disabled={loadingFeeds}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors ml-4 shrink-0"
                  title="Rafraîchir"
                >
                  <RefreshCw size={18} className={cn(loadingFeeds && "animate-spin")} />
                </button>
              </div>

              {/* Articles List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
                {showWelcome && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                    className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5 sm:p-6 relative"
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
                        <h3 className="text-gray-900 font-bold text-lg mb-1.5 pr-6">
                          Bienvenue sur 01 radar !
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed max-w-3xl">
                          Ne perdez plus de temps à rédiger vos posts de veille. Sélectionnez un article tech parmi nos flux (Hacker News, ByteByteGo, etc.) et laissez notre IA générer instantanément un post LinkedIn professionnel et engageant, prêt à être publié.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {loadingFeeds && articles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Loader2 size={24} className="animate-spin text-red-500" />
                    <p>Chargement des articles...</p>
                  </div>
                ) : errorFeeds ? (
                  <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm">
                    {errorFeeds}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">
                    Aucun article trouvé pour ce flux.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {articles.map((article, idx) => (
                      <div 
                        key={idx} 
                        className="group p-5 rounded-2xl bg-white border border-gray-100/80 hover:border-red-200 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-3 relative overflow-hidden h-full"
                      >
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1.5 pr-4 group-hover:text-red-700 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                            {formatDate(article.date)}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed flex-1">
                          {article.snippet.replace(/<[^>]*>?/gm, '') || "Aucun résumé disponible."}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                          <a 
                            href={article.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink size={14} />
                            Lire l'article original
                          </a>
                          <button
                            onClick={() => handleGenerate(article)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-700 group-hover:bg-red-600 group-hover:text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-red-600/20"
                          >
                            <span>Générer</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* DRAFT VIEW */
            <motion.div 
              key="draft-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden flex flex-col h-[calc(100vh-8rem)] absolute inset-0 m-4 sm:m-6 lg:m-8"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBack}
                    className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
                    title="Retour aux articles"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Newspaper size={18} className="text-red-500" />
                    Brouillon LinkedIn
                  </h2>
                </div>
                <div className="flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePost}
                        disabled={isCurrentPostSaved}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm",
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
                          "inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm",
                          copied 
                            ? "bg-green-500 text-white hover:bg-green-600" 
                            : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:shadow-red-600/20"
                        )}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span className="hidden sm:inline">{copied ? "Copié !" : "Copier le texte"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-6 flex flex-col relative overflow-hidden">
                {generating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-red-100 animate-pulse"></div>
                      <Loader2 size={32} className="text-red-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Génération en cours...</h3>
                      <p className="text-sm text-gray-500 max-w-xs mx-auto">
                        Nous lisons le contenu de "{selectedArticle.title}" et rédigeons le post.
                      </p>
                    </div>
                  </div>
                ) : generationError ? (
                  <div className="p-6 rounded-lg bg-red-50 text-red-700 border border-red-200 flex flex-col items-start gap-4">
                    <div>
                      <p className="font-semibold mb-1 text-base">Erreur de génération</p>
                      <p className="text-sm opacity-90 break-words max-w-full overflow-hidden text-ellipsis">
                        {generationError.includes('503') 
                          ? "L'IA est actuellement très sollicitée. Veuillez réessayer dans quelques instants." 
                          : generationError}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleGenerate(selectedArticle)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      <RefreshCw size={16} />
                      Réessayer
                    </button>
                  </div>
                ) : generatedPost ? (
                  <div className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Source originale :</h3>
                      <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 hover:underline line-clamp-1">
                        {selectedArticle.title}
                      </a>
                    </div>
                    <label className="sr-only" htmlFor="post-content">Contenu du post LinkedIn</label>
                    <textarea
                      id="post-content"
                      value={generatedPost}
                      onChange={(e) => setGeneratedPost(e.target.value)}
                      className="flex-1 w-full p-5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none text-gray-800 leading-relaxed font-medium font-sans shadow-inner bg-gray-50/30"
                      placeholder="Le post généré apparaîtra ici..."
                    />
                    <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg flex gap-3 items-start border border-blue-100 shrink-0">
                      <div className="bg-white p-1 rounded-full text-blue-500 mt-0.5 shadow-sm">
                        <ChevronRight size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Dernière étape !</p>
                        <p className="text-sm opacity-90">
                          Relisez le brouillon, ajoutez votre touche personnelle, puis copiez-collez-le directement sur votre profil LinkedIn.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* MODAL FOR VIEWING SAVED POST */}
        <AnimatePresence>
          {viewingSavedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setViewingSavedPost(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="pr-4">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{viewingSavedPost.title}</h3>
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
                
                <div className="p-6 overflow-y-auto bg-gray-50/30 text-gray-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                  {viewingSavedPost.content}
                </div>
                
                <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-white">
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
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingSavedPost.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm",
                      copied 
                        ? "bg-green-500 text-white hover:bg-green-600" 
                        : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:shadow-red-600/20"
                    )}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? "Copié !" : "Copier le texte"}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
