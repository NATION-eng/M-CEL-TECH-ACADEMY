import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationAPI } from '../services/api'
import { formatRelativeTime } from '../utils/formatRelativeTime'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationAPI.mine()).data.data,
    refetchInterval: 60_000, // light polling — good enough until real-time push exists
  })
  const notifications: any[] = Array.isArray(data?.notifications) ? data.notifications : []
  const unreadCount: number = data?.unreadCount ?? notifications.filter(n => !n.isRead).length

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const readMut = useMutation({
    mutationFn: (id: string) => notificationAPI.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const readAllMut = useMutation({
    mutationFn: () => notificationAPI.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => notificationAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const handleClick = (n: any) => {
    if (!n.isRead) readMut.mutate(n._id)
    setOpen(false)
    if (n.link) nav(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost p-2 relative" onClick={() => setOpen(o => !o)}>
        <Bell size={16}/>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center bg-accent-500 rounded-full text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm card py-2 shadow-2xl shadow-black/50 z-50">
          <div className="px-4 py-2 border-b border-white/[0.07] flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={() => readAllMut.mutate()} className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <CheckCheck size={11}/> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">No notifications yet.</div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n._id}
                  className={`group flex items-start gap-2 px-4 py-3 hover:bg-white/[0.03] border-b border-white/[0.04] last:border-0 ${!n.isRead ? 'bg-brand-500/[0.04]' : ''}`}
                >
                  <button onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left flex items-start gap-2">
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0"/>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 font-medium truncate">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMut.mutate(n._id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 shrink-0 mt-0.5"
                    title="Delete notification"
                  >
                    <X size={12}/>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
