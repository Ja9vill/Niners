import React, { useEffect, useState, useRef } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { FirebaseService } from '../../lib/firebaseService';
import { BlogPost } from '../../types';
import { Loader2, ArrowLeft, Clock, Eye, Share2, Facebook, Twitter, Link as LinkIcon, BookOpen, ListOrdered } from 'lucide-react';

const DOMPurify = (window as any).DOMPurify;

export const BlogPostView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) return;
      try {
        const data = await FirebaseService.getBlogBySlug(slug);
        if (data) {
          setBlog(data);
          // Increment view count
          await FirebaseService.incrementBlogViewCount(data.id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  // Generate Table of Contents
  useEffect(() => {
    if (contentRef.current && blog) {
      const headings = Array.from(contentRef.current.querySelectorAll('h2, h3'));
      const newToc = headings.map((h: Element, i) => {
        const id = `heading-${i}`;
        h.id = id;
        return {
          id,
          text: h.textContent || '',
          level: h.tagName.toLowerCase() === 'h2' ? 2 : 3
        };
      });
      setToc(newToc);
    }
  }, [blog]);

  useSEO({
    title: blog ? `${blog.title} | Nine Blog` : 'Blog | Nine Dashboard',
    description: blog?.subtitle || (blog ? blog.content.replace(/<[^>]*>?/gm, '').substring(0, 160) : 'Nine Agency Official Blog'),
    image: blog?.coverImage
  });

  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'hr', 'img', 'pre', 'code', 'br',
      'div', 'span', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
      'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style'
    ],
    ADD_TAGS: ['iframe'],
  };

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = node.getAttribute('src') || '';
      const allowedDomains = ['youtube.com', 'youtube-nocookie.com', 'tiktok.com', 'facebook.com', 'instagram.com'];
      try {
        const url = new URL(src);
        if (!allowedDomains.some(d => url.hostname.endsWith(d))) {
          node.parentNode?.removeChild(node);
        }
      } catch (e) {
        node.parentNode?.removeChild(node);
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
      </div>
    );
  }

  if (!blog || !blog.isPublished) {
    return <Navigate to="/blog" replace />;
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(blog.title);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0F] text-[#F0EFE8] px-4 pt-4 pb-24 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col lg:flex-row gap-12">
        <div className="flex-1 max-w-4xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-[#A09E9A] hover:text-[#D4AF37] transition-colors font-bold uppercase tracking-wider text-xs mb-8">
            <ArrowLeft size={16} />
            Back to Articles
          </Link>

          {/* Hero Banner */}
          {blog.coverImage && (
            <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden mb-8 border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
              <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-6 mb-12">
            <div className="flex flex-wrap items-center gap-2">
              {blog.category && (
                <span className="bg-[#D4AF37] text-black px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest">
                  {blog.category}
                </span>
              )}
              {blog.tags && blog.tags.map(tag => (
                <span key={tag} className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              {blog.title}
            </h1>
            {blog.subtitle && (
              <p className="text-xl text-[#D4AF37] font-medium leading-relaxed">
                {blog.subtitle}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-6 text-[#A09E9A] text-xs sm:text-sm uppercase tracking-widest font-bold border-y border-white/10 py-4">
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">By</span> {blog.authorName}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#D4AF37]" />
                {new Date(blog.createdAt).toLocaleDateString()}
              </div>
              {blog.readTimeMinutes && (
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-[#D4AF37]" />
                  {blog.readTimeMinutes} min read
                </div>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Eye size={16} className="text-[#D4AF37]" />
                {(blog.viewCount || 0) + 1} views
              </div>
            </div>
          </div>

          <div 
            ref={contentRef}
            className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl p-6 sm:p-12 shadow-[0_0_20px_rgba(212,175,55,0.05)] prose prose-invert prose-headings:text-[#D4AF37] prose-a:text-[#D4AF37] hover:prose-a:text-white prose-img:rounded-2xl max-w-none font-medium leading-relaxed text-[#A09E9A]"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blog.content, sanitizeConfig) }}
          />

          {/* Social Share Footer */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[#1A140A]/80 border border-white/10 rounded-2xl">
            <span className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Share this article</span>
            <div className="flex items-center gap-3">
              <a 
                href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                target="_blank" rel="noreferrer"
                className="p-3 bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white rounded-xl transition-colors"
                title="Share on Twitter"
              >
                <Twitter size={18} />
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank" rel="noreferrer"
                className="p-3 bg-[#4267B2]/10 text-[#4267B2] hover:bg-[#4267B2] hover:text-white rounded-xl transition-colors"
                title="Share on Facebook"
              >
                <Facebook size={18} />
              </a>
              <button 
                onClick={handleCopyLink}
                className="p-3 bg-white/5 text-white/70 hover:bg-white hover:text-black rounded-xl transition-colors relative"
                title="Copy Link"
              >
                <LinkIcon size={18} />
                {copied && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Table of Contents */}
        {toc.length > 0 && (
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 bg-[#1A140A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="font-black uppercase tracking-widest text-[#D4AF37] text-xs mb-4 flex items-center gap-2">
                <ListOrdered size={14} />
                Table of Contents
              </h3>
              <ul className="space-y-3">
                {toc.map(item => (
                  <li key={item.id} className={`${item.level === 3 ? 'ml-4' : ''}`}>
                    <button 
                      onClick={() => {
                        const el = document.getElementById(item.id);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 100;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      className="text-xs text-[#A09E9A] hover:text-[#D4AF37] text-left transition-colors font-medium leading-relaxed"
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
