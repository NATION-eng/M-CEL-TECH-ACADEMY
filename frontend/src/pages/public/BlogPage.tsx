import { Link } from 'react-router-dom'
import { Clock, User, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { blogAPI } from '../../services/api'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['publicBlogPosts'],
    queryFn: async () => {
      const res = await blogAPI.all({ status: 'published' })
      return res.data.data
    },
  })

  const posts: any[] = Array.isArray(data) ? data : (data?.posts ?? [])

  return (
    <div className="bg-ink-900 pt-20">
      <section className="section-pad">
        <div className="page-container max-w-5xl">
          <div className="section-eyebrow">Academy Blog</div>
          <h1 className="font-display text-4xl font-bold text-white mb-10">Insights & Stories</h1>
          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-slate-500">
              <Loader2 size={22} className="animate-spin mr-2"/> Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No blog posts published yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(p => {
                const slug = p.slug ?? p._id
                const author = p.author ? `${p.author.firstName ?? ''} ${p.author.lastName ?? ''}`.trim() : 'M-CEL TECH ACADEMY'
                const date = p.publishedAt ?? p.createdAt
                const readTime = p.readTime ?? Math.ceil((p.content?.length ?? 300) / 250)
                return (
                  <Link key={slug} to={`/blog/${slug}`} className="card-hover p-6 group flex flex-col">
                    <span className="badge badge-indigo mb-4 self-start">{p.category ?? 'Article'}</span>
                    <h2 className="font-display font-semibold text-white mb-3 group-hover:text-brand-300 transition-colors">{p.title}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">{p.excerpt ?? (p.content?.slice(0,120) + '...')}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-4 border-t border-white/[0.06]">
                      <span className="flex items-center gap-1"><User size={11}/> {author}</span>
                      <span className="flex items-center gap-1"><Clock size={11}/> {readTime}m read</span>
                      <span>· {formatRelativeTime(date)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
