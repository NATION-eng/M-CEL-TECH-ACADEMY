import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock, User, Calendar, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { blogAPI } from '../../services/api'
import { sanitizeHtml } from '../../utils/sanitizeHtml'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['publicBlogPost', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided')
      const res = await blogAPI.one(slug)
      return res.data.data
    },
    enabled: !!slug,
  })

  // Fetch all posts to select related posts
  const { data: allPostsData } = useQuery({
    queryKey: ['publicBlogPosts'],
    queryFn: async () => {
      const res = await blogAPI.all({ status: 'published' })
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-slate-500">
        <Loader2 size={24} className="animate-spin mr-2"/> Loading article...
      </div>
    )
  }

  if (isError || !post) {
    return <Navigate to="/blog" replace />
  }

  const allPosts = Array.isArray(allPostsData) ? allPostsData : (allPostsData?.posts ?? [])
  const related = allPosts.filter((p: any) => (p.slug ?? p._id) !== (post.slug ?? post._id)).slice(0, 2)

  const authorName = post.author ? `${post.author.firstName ?? ''} ${post.author.lastName ?? ''}`.trim() : 'Masterview'
  const authorRole = post.author?.role === 'super_admin' ? 'Super Admin' : (post.author?.role === 'admin' ? 'Admin' : 'Instructor')
  const dateStr = post.publishedAt ?? post.createdAt ? new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const readTime = post.readTime ?? Math.ceil((post.content?.length ?? 300) / 250)

  return (
    <div className="bg-ink-900 pt-20">
      <article className="section-pad">
        <div className="page-container max-w-3xl">
          <Link to="/blog" className="btn-ghost mb-8 inline-flex"><ArrowLeft size={16}/> Back to Blog</Link>

          <span className="badge badge-indigo mb-4">{post.category ?? 'Article'}</span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-5 leading-tight">{post.title}</h1>

          <div className="flex items-center gap-5 text-sm text-slate-500 mb-10 pb-8 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                {authorName[0] ?? 'M'}
              </div>
              <div>
                <div className="text-slate-300 font-medium text-sm">{authorName}</div>
                <div className="text-xs text-slate-500">{authorRole}</div>
              </div>
            </div>
            <span className="flex items-center gap-1.5"><Calendar size={13}/> {dateStr}</span>
            <span className="flex items-center gap-1.5"><Clock size={13}/> {readTime} min read</span>
          </div>

          <div
            className="blog-body text-slate-300 leading-relaxed text-[15px]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
          <style>{`
            .blog-body h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin: 1.5rem 0 0.6rem; }
            .blog-body h3 { font-size: 1.2rem; font-weight: 600; color: #fff; margin: 1.2rem 0 0.5rem; }
            .blog-body p { margin: 0.9rem 0; }
            .blog-body ul, .blog-body ol { margin: 0.9rem 0 0.9rem 1.5rem; }
            .blog-body blockquote { border-left: 3px solid #4F46E5; padding-left: 1rem; color: #94A3B8; margin: 1rem 0; }
            .blog-body img { max-width: 100%; border-radius: 0.75rem; margin: 1.25rem 0; }
            .blog-body a { color: #818CF8; text-decoration: underline; }
          `}</style>

          {related.length > 0 && (
            <div className="mt-16 pt-10 border-t border-white/[0.07]">
              <h2 className="font-display text-lg font-semibold text-white mb-5">More from the Academy Blog</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((r: any) => {
                  const rSlug = r.slug ?? r._id
                  const rAuthor = r.author ? `${r.author.firstName ?? ''} ${r.author.lastName ?? ''}`.trim() : 'Masterview'
                  const rReadTime = r.readTime ?? Math.ceil((r.content?.length ?? 300) / 250)
                  return (
                    <Link key={rSlug} to={`/blog/${rSlug}`} className="card-hover p-5 group">
                      <span className="badge badge-indigo mb-3">{r.category ?? 'Article'}</span>
                      <h3 className="font-display font-semibold text-white text-sm mb-2 group-hover:text-brand-300 transition-colors leading-snug">{r.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                        <span className="flex items-center gap-1"><User size={10}/> {rAuthor}</span>
                        <span className="flex items-center gap-1"><Clock size={10}/> {rReadTime}m</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
