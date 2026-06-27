import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import { FirebaseService } from '../../lib/firebaseService';
import { Storage } from '../../lib/storage';
import { BlogPost } from '../../types';
import { BlogEditor } from './BlogEditor';

export const BlogManagement = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authState = Storage.getAuthState();

  const loadBlogs = async () => {
    setIsLoading(true);
    try {
      const data = await FirebaseService.getBlogs();
      setBlogs(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('[BlogManagement] Failed to load blogs:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load blog posts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const openForm = (blog?: BlogPost) => {
    setEditingBlog(blog);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setIsFormOpen(false);
    await loadBlogs();
  };

  const handleCancel = () => {
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string, blogTitle: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    setIsProcessing(true);
    try {
      await FirebaseService.deleteBlog(id);
      await loadBlogs();
      await FirebaseService.logSystemActivity(`Admin deleted blog post: "${blogTitle}"`, 'Warning');
    } catch (error) {
      console.error('[BlogManagement] Failed to delete blog:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete blog post.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F0EFE8] uppercase tracking-widest">Blog Management</h1>
          <p className="text-[#A09E9A] text-sm mt-1">Publish and manage SEO-optimized blog posts</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          <Plus size={18} />
          <span>New Post</span>
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {isFormOpen ? (
        <BlogEditor
          blog={editingBlog}
          onSave={handleSave}
          onCancel={handleCancel}
          authorName={authState.nickname || authState.name || 'Admin'}
          authorRole={authState.role || 'Admin'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {blogs.length === 0 ? (
            <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-12 text-center">
              <p className="text-white/40 italic">No blog posts found. Create one to get started!</p>
            </div>
          ) : (
            blogs.map((blog) => (
              <div key={blog.id} className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                <div className="flex items-start gap-4 flex-1">
                  {blog.coverImage ? (
                    <img src={blog.coverImage} alt={blog.title} className="w-20 h-20 object-cover rounded-xl border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-black/40 rounded-xl border border-white/10 shrink-0 flex items-center justify-center">
                      <span className="text-white/20 text-xs font-bold">No Img</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-white">{blog.title}</h3>
                      {!blog.isPublished && (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">Draft</span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-300 font-mono mb-2">/{blog.slug}</p>
                    <p className="text-xs text-[#A09E9A]">
                      By {blog.authorName} • {new Date(blog.createdAt).toLocaleDateString()}
                    </p>
                    {blog.category && (
                      <span className="inline-block mt-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mr-2">
                        {blog.category}
                      </span>
                    )}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="inline-flex flex-wrap gap-1 mt-2">
                        {blog.tags.map(tag => (
                          <span key={tag} className="bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => openForm(blog)}
                    className="flex-1 sm:flex-none p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-colors border border-indigo-500/20"
                    title="Edit Post"
                  >
                    <Edit2 size={16} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDelete(blog.id, blog.title)}
                    className="flex-1 sm:flex-none p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20"
                    title="Delete Post"
                  >
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
