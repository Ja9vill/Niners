import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, 
  Code, Quote, Minus, Youtube, X, Eye, Code2, Loader2, Save
} from 'lucide-react';

const DOMPurify = (window as any).DOMPurify;
import { FirebaseService } from '../../lib/firebaseService';
import { BlogPost } from '../../types';

interface BlogEditorProps {
  blog?: BlogPost;
  onSave: () => void;
  onCancel: () => void;
  authorName: string;
  authorRole: string;
}

const CATEGORIES = [
  'Announcements', 'Guides & Tips', 'Platform Updates', 
  'Agency News', 'Event Recaps', 'Host Spotlights'
];

export const BlogEditor: React.FC<BlogEditorProps> = ({ blog, onSave, onCancel, authorName, authorRole }) => {
  const [title, setTitle] = useState(blog?.title || '');
  const [subtitle, setSubtitle] = useState(blog?.subtitle || '');
  const [slug, setSlug] = useState(blog?.slug || '');
  const [category, setCategory] = useState(blog?.category || CATEGORIES[0]);
  const [tagsStr, setTagsStr] = useState(blog?.tags?.join(', ') || '');
  const [coverImage, setCoverImage] = useState(blog?.coverImage || '');
  const [isPublished, setIsPublished] = useState(blog?.isPublished ?? true);
  
  const [content, setContent] = useState(blog?.content || '');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [embedError, setEmbedError] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);

  // Setup DOMPurify with iframe allowance for embeds
  const sanitizeConfig = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'hr', 'img', 'pre', 'code', 'br',
      'div', 'span', 'iframe' // iframe allowed for embeds
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
      'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style'
    ],
    ADD_TAGS: ['iframe'], // explicit allow iframe
  };

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = node.getAttribute('src') || '';
      // Only allow specific domains for iframes to prevent XSS
      const allowedDomains = [
        'youtube.com', 'youtube-nocookie.com',
        'tiktok.com', 'facebook.com', 'instagram.com'
      ];
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

  const handleSlugify = () => {
    if (!slug && title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (isHtmlMode) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      const url = await FirebaseService.uploadBlogImage(file);
      execCommand('insertImage', url);
    } catch (err) {
      alert('Failed to upload image.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const insertEmbed = () => {
    // Basic validation of embed code
    setEmbedError('');
    const sanitizedEmbed = DOMPurify.sanitize(embedCode, sanitizeConfig);
    if (!sanitizedEmbed.includes('<iframe')) {
      setEmbedError('Invalid embed code. Must contain an allowed iframe (YouTube, TikTok, etc.)');
      return;
    }
    
    // Wrap in responsive container
    const wrapper = `<div class="aspect-video w-full overflow-hidden rounded-xl border border-white/10 my-6">${sanitizedEmbed}</div><p><br/></p>`;
    
    if (isHtmlMode) {
      setContent(prev => prev + '\n' + wrapper);
    } else {
      execCommand('insertHTML', wrapper);
    }
    setEmbedModalOpen(false);
    setEmbedCode('');
  };

  const calculateReadTime = (text: string) => {
    const words = text.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200)); // 200 words per min avg
  };

  const handleEditorInput = () => {
    if (editorRef.current && !isHtmlMode) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // Sync content to div when switching back from HTML mode
  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [isHtmlMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !content) {
      alert('Title, slug, and content are required.');
      return;
    }

    setIsProcessing(true);
    try {
      const sanitizedContent = DOMPurify.sanitize(content, sanitizeConfig);
      
      const blogId = blog?.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      
      const blogData: Partial<BlogPost> = {
        id: blogId,
        title,
        subtitle,
        slug,
        content: sanitizedContent,
        coverImage,
        category,
        tags,
        isPublished,
        readTimeMinutes: calculateReadTime(sanitizedContent),
        authorName: blog?.authorName || authorName,
        authorRole: blog?.authorRole || authorRole,
        viewCount: blog?.viewCount || 0,
      };

      await FirebaseService.saveBlog(blogData);
      await FirebaseService.logSystemActivity(`Admin created/updated blog post: "${title}"`, 'Info');
      onSave();
    } catch (error) {
      console.error(error);
      alert('Failed to save blog post.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(212,175,55,0.15)] flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl font-bold text-[#F0EFE8] uppercase tracking-widest">{blog ? 'Edit Post' : 'Create New Post'}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-6 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isProcessing ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        {/* Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSlugify}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              placeholder="Post title"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              placeholder="Brief description or subtitle"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">URL Slug *</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none font-mono"
              placeholder="e.g. how-to-start"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Category</label>
            <select
              title="Blog Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Tags</label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              placeholder="news, guides, tips"
            />
          </div>
          <div className="space-y-1 flex flex-col justify-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-[#D4AF37] rounded"
              />
              <span className="text-sm font-bold text-white">Publish</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Cover Image URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
              placeholder="https://example.com/image.jpg"
            />
            <label className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors flex items-center justify-center shrink-0">
              <ImageIcon size={16} className="mr-2" /> Upload
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsProcessing(true);
                try {
                  const url = await FirebaseService.uploadBlogImage(file);
                  setCoverImage(url);
                } catch (err) {
                  alert('Upload failed');
                } finally {
                  setIsProcessing(false);
                }
              }} />
            </label>
          </div>
        </div>

        {/* Editor Section */}
        <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black/20 flex-1 min-h-[400px]">
          {/* Toolbar */}
          <div className="bg-[#1A140A] border-b border-white/10 p-2 flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Bold"><Bold size={16} /></button>
            <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Italic"><Italic size={16} /></button>
            <button type="button" onClick={() => execCommand('underline')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Underline"><Underline size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button type="button" onClick={() => execCommand('formatBlock', 'H2')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Heading 2"><Heading1 size={16} /></button>
            <button type="button" onClick={() => execCommand('formatBlock', 'H3')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Heading 3"><Heading2 size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Bullet List"><List size={16} /></button>
            <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Numbered List"><ListOrdered size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button type="button" onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) execCommand('createLink', url);
            }} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Link"><LinkIcon size={16} /></button>
            
            <label className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white cursor-pointer" title="Upload Image Inline">
              <ImageIcon size={16} />
              <input title="Upload Image" placeholder="Upload Image" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            
            <button type="button" onClick={() => setEmbedModalOpen(true)} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Insert Embed (YouTube, TikTok, etc.)"><Youtube size={16} /></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button type="button" onClick={() => execCommand('formatBlock', 'PRE')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Code Block"><Code size={16} /></button>
            <button type="button" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Quote"><Quote size={16} /></button>
            <button type="button" onClick={() => execCommand('insertHorizontalRule')} className="p-2 hover:bg-white/10 rounded text-white/70 hover:text-white" title="Divider"><Minus size={16} /></button>
            
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => setIsHtmlMode(!isHtmlMode)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${
                isHtmlMode ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              {isHtmlMode ? <Eye size={14} /> : <Code2 size={14} />}
              {isHtmlMode ? 'Preview Mode' : 'HTML Mode'}
            </button>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative flex">
            {isHtmlMode ? (
              <div className="flex-1 flex flex-col md:flex-row">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 bg-[#0A0A0F] text-indigo-300 font-mono text-xs p-4 focus:outline-none resize-none border-r border-white/10"
                  placeholder="<h1>Write HTML here...</h1>"
                />
                <div className="flex-1 bg-black/40 p-4 overflow-y-auto prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, sanitizeConfig) }} />
                </div>
              </div>
            ) : (
              <div
                ref={editorRef}
                className="flex-1 p-6 text-white focus:outline-none prose prose-invert max-w-none overflow-y-auto"
                contentEditable
                onInput={handleEditorInput}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Embed Modal */}
      {embedModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A140A] border border-[#D4AF37]/30 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(212,175,55,0.15)] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-bold text-[#F0EFE8] flex items-center gap-2">
                <Youtube size={18} className="text-[#D4AF37]" />
                Insert Embed Widget
              </h3>
              <button title="Close Embed Modal" onClick={() => setEmbedModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-[#A09E9A]">
                Paste the full HTML embed code (e.g. YouTube iframe, TikTok embed, Facebook post widget).
              </p>
              <textarea
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
                rows={5}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-[#D4AF37] outline-none"
                placeholder='<iframe width="560" height="315" src="..." title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'
              />
              {embedError && <p className="text-red-400 text-xs font-bold">{embedError}</p>}
              
              {embedCode && (
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Live Preview</p>
                  <div 
                    className="w-full overflow-hidden flex justify-center" 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(embedCode, sanitizeConfig) }} 
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-black/20">
              <button onClick={() => setEmbedModalOpen(false)} className="px-4 py-2 text-sm font-bold text-white/60 hover:text-white transition-colors">Cancel</button>
              <button onClick={insertEmbed} className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-6 py-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                Insert Embed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
