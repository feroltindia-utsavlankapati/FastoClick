import React, { useState } from "react";
import {
  TrendingUp, Search, Music, Video, Star, MapPin, 
  Lightbulb, AlertTriangle, Loader2, ArrowRight,
  RefreshCw, Plus
} from "lucide-react";

// Types
interface TrendTopic {
  topic: string;
  context: string;
  engagement_level: string;
}

interface TrendStyle {
  style: string;
  description: string;
}

interface TrendMusic {
  track_or_genre: string;
  vibe: string;
  spotify_link?: string;
  youtube_link?: string;
}

interface TrendsData {
  trending_topics: TrendTopic[];
  trending_styles: TrendStyle[];
  trending_music: TrendMusic[];
  growth_tips: string[];
}

interface GeneratedIdea {
  title: string;
  description: string;
  caption_hook: string;
  format: string;
  impact: string;
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn"];

export default function TrendsHubPage() {
  const [platform, setPlatform] = useState("Instagram");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);

  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedIdeas, setGeneratedIdeas] = useState<Record<string, GeneratedIdea>>({});

  const token = localStorage.getItem("token");

  const analyzeTrends = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setGeneratedIdeas({});
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/social/trends/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform, country, state, city, niche }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTrends(data.data);
      } else {
        setError(data.detail || "Failed to analyze trends.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const generateIdea = async (topic: string) => {
    if (!token) return;
    setGeneratingFor(topic);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API}/social/trends/generate-idea`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform, trend_topic: topic }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedIdeas((prev) => ({ ...prev, [topic]: data.data }));
      } else {
        alert(data.detail || "Failed to generate idea.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error while generating idea.");
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        
        {/* Header */}
        <header className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg flex items-center justify-center">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Trends Hub</h1>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Real-time, location-based social media trends powered by live web search.
              </p>
            </div>
          </div>
        </header>

        {/* Filters Panel */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-[28px] p-7 mb-8">
          <h2 className="font-extrabold text-lg mb-5 flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" /> Specify Location & Platform
          </h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle size={15} />{error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Country</label>
              <input
                type="text"
                placeholder="e.g. United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">State/Region</label>
              <input
                type="text"
                placeholder="Optional"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                placeholder="Optional"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Niche / Industry</label>
              <input
                type="text"
                placeholder="e.g. Fitness, AI"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={analyzeTrends}
              disabled={loading}
              className="inline-flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 rounded-2xl px-7 py-3 font-bold text-sm flex items-center gap-2 shadow-md shadow-primary-600/20"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Fetching Live Data...</>
              ) : (
                <><Search size={16} /> Analyze Trends <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {!trends && !loading && (
          <div className="bg-slate-50 border border-slate-200 rounded-[28px] p-16 text-center">
            <Search size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No trends data yet.</p>
            <p className="text-slate-400 text-sm mt-1">Select a platform and location above to fetch live trends.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col justify-center items-center h-40 gap-4">
            <Loader2 size={36} className="animate-spin text-primary-600" />
            <p className="text-primary-600 font-bold text-sm animate-pulse">Scraping live web data and extracting trends...</p>
          </div>
        )}

        {trends && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Topics */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 shadow-sm rounded-[28px] p-7">
                <h3 className="font-extrabold text-xl mb-5 flex items-center gap-2 text-slate-900">
                  <Star size={20} className="text-yellow-500" /> Trending Topics & Hashtags
                </h3>
                <div className="space-y-4">
                  {trends.trending_topics.map((topic, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-primary-300 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-extrabold text-lg text-slate-900 mb-1">{topic.topic}</h4>
                          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-3">{topic.context}</p>
                          <span className="inline-block px-3 py-1 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-primary-600">
                            🔥 {topic.engagement_level} Engagement
                          </span>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => generateIdea(topic.topic)}
                            disabled={generatingFor === topic.topic}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Generate Content Idea"
                          >
                            {generatingFor === topic.topic ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Generated Idea Result */}
                      {generatedIdeas[topic.topic] && (
                        <div className="mt-5 pt-5 border-t border-slate-200">
                          <div className="bg-gradient-to-br from-indigo-50 to-primary-50 rounded-xl p-4 border border-primary-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-primary-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                                {generatedIdeas[topic.topic].format}
                              </span>
                              <span className="text-xs font-bold text-primary-600">AI Generated Concept</span>
                            </div>
                            <h5 className="font-extrabold text-slate-900 mb-2">{generatedIdeas[topic.topic].title}</h5>
                            <p className="text-xs font-medium text-slate-600 mb-3">{generatedIdeas[topic.topic].description}</p>
                            
                            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 mb-3">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Caption Hook</span>
                              <p className="text-xs font-medium text-slate-900 italic">"{generatedIdeas[topic.topic].caption_hook}"</p>
                            </div>
                            
                            <p className="text-[10px] font-bold text-[#38B2AC] flex items-center gap-1">
                              <TrendingUp size={12} /> {generatedIdeas[topic.topic].impact}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {trends.trending_topics.length === 0 && (
                    <p className="text-sm text-slate-500">No topics found for this query.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Styles, Music, Tips */}
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 shadow-sm rounded-[28px] p-7">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2 text-slate-900">
                  <Video size={18} className="text-purple-500" /> Trending Styles
                </h3>
                <div className="space-y-3">
                  {trends.trending_styles.map((style, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="font-bold text-sm text-slate-900">{style.style}</h4>
                      <p className="text-xs text-slate-500 mt-1">{style.description}</p>
                    </div>
                  ))}
                  {trends.trending_styles.length === 0 && <p className="text-xs text-slate-400">None found.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-[28px] p-7">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2 text-slate-900">
                  <Music size={18} className="text-pink-500" /> Trending Audio
                </h3>
                <div className="space-y-3">
                  {trends.trending_music.map((music, i) => (
                    <div key={i} className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                          <Music size={14} className="text-pink-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-900">{music.track_or_genre}</h4>
                          <p className="text-xs text-slate-500">{music.vibe}</p>
                        </div>
                      </div>
                      {(music.spotify_link || music.youtube_link) && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-3">
                          {music.spotify_link && (
                            <a href={music.spotify_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
                              🎵 Spotify
                            </a>
                          )}
                          {music.youtube_link && (
                            <a href={music.youtube_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
                              ▶ YouTube
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {trends.trending_music.length === 0 && <p className="text-xs text-slate-400">None found.</p>}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[28px] p-7 shadow-lg text-white">
                <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary-400" /> Growth Tips
                </h3>
                <ul className="space-y-3">
                  {trends.growth_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-300">
                      <span className="text-primary-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                  {trends.growth_tips.length === 0 && <p className="text-xs text-slate-400">None found.</p>}
                </ul>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
