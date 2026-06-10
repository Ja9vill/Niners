import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { BlogPost } from '../../types';
import { Loader2, BookOpen, Clock, Tag, Search, Filter, Eye } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Announcements', 'Guides & Tips', 'Platform Updates', 
  'Agency News', 'Event Recaps', 'Host Spotlights'
];

export const BlogHub = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  useSEO({
    title: 'Blog Hub | Nine Dashboard',
    description: 'Read the latest tips, guides, and news from Nine Agency to maximize your streaming success.'
  });

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const data = await FirebaseService.getBlogs();
        const published = data.filter(b => b.isPublished);
        setBlogs(published);
        setFilteredBlogs(published.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBlogs();
  }, []);

  useEffect(() => {
    let result = [...blogs];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) || 
        (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
        (b.tags && b.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    
    if (selectedCategory !== 'All') {
      result = result.filter(b => b.category === selectedCategory);
    }
    
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    
    setFilteredBlogs(result);
  }, [blogs, searchQuery, selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] flex flex-col items-center px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto space-y-12 animate-fadeIn z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <BookOpen size={14} />
            Resource Hub
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase">
            Nine <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">Blog</span>
          </h1>
          <p className="text-[#A09E9A] max-w-2xl mx-auto">
            Discover the latest tips, platform updates, and strategies to grow your Poppo Live agency and fan club.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-[#1A140A]/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text"
              placeholder="Search articles by title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none cursor-pointer"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {filteredBlogs.length === 0 ? (
            <div className="col-span-full text-center py-20 text-[#A09E9A] italic">
              No articles found matching your criteria.
            </div>
          ) : (
            filteredBlogs.map((blog) => (
              <Link key={blog.id} to={`/blog/${blog.slug}`} className="group bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.05)] hover:border-[#D4AF37]/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all flex flex-col">
                <div className="aspect-[16/9] w-full overflow-hidden bg-black/50 relative border-b border-[#D4AF37]/20">
                  {blog.coverImage ? (
                    <img src={blog.coverImage} alt={blog.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#D4AF37]/30">
                      <BookOpen size={48} />
                    </div>
                  )}
                  {blog.category && (
                    <div className="absolute top-4 right-4 bg-[#D4AF37] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {blog.category}
                    </div>
                  )}
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="absolute top-4 left-4 flex gap-2">
                      {blog.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-[#1A140A]/80 backdrop-blur-md border border-[#D4AF37]/30 text-[#D4AF37] px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">{blog.title}</h2>
                  {blog.subtitle && <p className="text-[#D4AF37] text-xs font-bold mb-3 line-clamp-1">{blog.subtitle}</p>}
                  <p className="text-[#A09E9A] text-sm line-clamp-3 mb-6 flex-1">
                    {/* Strip markdown/html for excerpt */}
                    {blog.content.replace(/<[^>]*>?/gm, '').replace(/[#*_~`]/g, '').substring(0, 150)}...
                  </p>
                  
                  <div className="flex items-center justify-between text-[11px] text-[#A09E9A] uppercase tracking-widest font-bold border-t border-white/5 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(blog.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[#D4AF37]/80">
                        <Eye size={12} />
                        {blog.viewCount || 0}
                      </div>
                    </div>
                    <span>By {blog.authorName}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
