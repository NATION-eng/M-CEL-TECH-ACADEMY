import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Search, Send, Plus, Loader2, X, Trash2, Flag, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { messagingAPI } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { useConfirm } from '../../components/ConfirmDialog'

interface Contact { _id: string; firstName: string; lastName: string; email: string; role: string }
interface ConversationSummary {
  _id: string
  otherParticipant: Contact
  lastMessagePreview?: string
  lastMessageAt?: string
  unreadCount: number
  otherIsTyping?: boolean
}
interface MessageItem { _id: string; conversation: string; sender: string; content: string; createdAt: string; readBy: string[] }

const ROLE_LABEL: Record<string, string> = { student: 'Student', instructor: 'Instructor', admin: 'Admin', super_admin: 'Super Admin' }

export default function Messages() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [convoSearch, setConvoSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: conversationsData, isLoading: loadingConvos } = useQuery({
    queryKey: ['conversations', convoSearch],
    queryFn: async () => (await messagingAPI.conversations(convoSearch || undefined)).data.data as ConversationSummary[],
    refetchInterval: 8000, // near-real-time via polling — there's no websocket layer in this app yet
  })
  const conversations = conversationsData ?? []

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', contactSearch],
    enabled: showNewMessage,
    queryFn: async () => (await messagingAPI.contacts(contactSearch || undefined)).data.data as Contact[],
  })
  const contacts = contactsData ?? []

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['thread', activeId],
    enabled: !!activeId,
    queryFn: async () => (await messagingAPI.messages(activeId!)).data.data as MessageItem[],
    refetchInterval: 5000,
  })
  const messages = messagesData ?? []

  const active = conversations.find(c => c._id === activeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const startConvoM = useMutation({
    mutationFn: (recipientId: string) => messagingAPI.startConversation(recipientId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      setActiveId(res.data.data._id)
      setShowNewMessage(false)
      setContactSearch('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not start conversation.'),
  })

  const sendM = useMutation({
    mutationFn: () => messagingAPI.send(activeId!, draft),
    onSuccess: () => {
      setDraft('')
      qc.invalidateQueries({ queryKey: ['thread', activeId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not send message.'),
  })

  const deleteMessageM = useMutation({
    mutationFn: (messageId: string) => messagingAPI.deleteMessage(messageId),
    onSuccess: () => {
      // "After deleting messages: refresh automatically" — both the thread
      // and the conversation list preview (which may have shown this message).
      qc.invalidateQueries({ queryKey: ['thread', activeId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not delete message.'),
  })

  const deleteConvoM = useMutation({
    mutationFn: (id: string) => messagingAPI.deleteConversation(id),
    onSuccess: () => {
      toast.success('Conversation deleted')
      setActiveId(null)
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not delete conversation.'),
  })

  const reportM = useMutation({
    mutationFn: () => messagingAPI.reportConversation(activeId!, reportReason),
    onSuccess: () => {
      toast.success('Reported — an admin will review this conversation.')
      setShowReport(false)
      setReportReason('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not submit report.'),
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || sendM.isPending) return
    sendM.mutate()
  }

  const handleTyping = (value: string) => {
    setDraft(value)
    if (!activeId) return
    if (typingTimeoutRef.current) return // already told the server recently, debounce
    messagingAPI.setTyping(activeId).catch(() => {})
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null }, 3000)
  }

  const handleDeleteConversation = async () => {
    setMenuOpen(false)
    const ok = await confirm({ title: 'Delete this conversation?', message: 'It will be removed from your inbox. The other person will still see their copy.', confirmLabel: 'Delete', danger: true })
    if (ok && activeId) deleteConvoM.mutate(activeId)
  }

  return (
    <div className="h-[calc(100vh-140px)] min-h-[480px] flex gap-4">
      {/* Conversation list */}
      <div className="w-80 shrink-0 card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">Messages</h2>
          <button className="btn-primary text-xs py-1.5 px-2.5" onClick={() => setShowNewMessage(true)}><Plus size={14}/> New</button>
        </div>
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
            <input className="input pl-8 text-sm py-1.5" placeholder="Search conversations..." value={convoSearch} onChange={e => setConvoSearch(e.target.value)}/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="py-10 flex justify-center text-slate-500"><Loader2 size={18} className="animate-spin"/></div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              <MessageSquare size={28} className="mx-auto mb-2 text-slate-600"/>
              {convoSearch ? 'No matches found.' : 'No conversations yet.'}
            </div>
          ) : (
            conversations.map(c => {
              const name = c.otherParticipant ? `${c.otherParticipant.firstName} ${c.otherParticipant.lastName}` : 'Unknown user'
              return (
                <button
                  key={c._id}
                  onClick={() => setActiveId(c._id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${activeId === c._id ? 'bg-white/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-white truncate">{name}</span>
                    {c.unreadCount > 0 && (
                      <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{c.unreadCount}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mb-0.5">{ROLE_LABEL[c.otherParticipant?.role] ?? ''}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {c.otherIsTyping ? <span className="text-brand-400 italic">typing...</span> : (c.lastMessagePreview ?? 'No messages yet')}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a conversation, or start a new one.
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">{active.otherParticipant.firstName} {active.otherParticipant.lastName}</div>
                <div className="text-xs text-slate-500">
                  {active.otherIsTyping ? <span className="text-brand-400">typing...</span> : `${ROLE_LABEL[active.otherParticipant.role]} · ${active.otherParticipant.email}`}
                </div>
              </div>
              <div className="relative">
                <button className="btn-ghost p-1.5" onClick={() => setMenuOpen(o => !o)}><MoreVertical size={15}/></button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 card py-1 shadow-2xl z-20">
                    <button onClick={() => { setMenuOpen(false); setShowReport(true) }} className="w-full text-left px-3.5 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2"><Flag size={12}/> Report Conversation</button>
                    <button onClick={handleDeleteConversation} className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12}/> Delete Conversation</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="py-10 flex justify-center text-slate-500"><Loader2 size={18} className="animate-spin"/></div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10">Say hello</div>
              ) : (
                messages.map(m => {
                  const mine = m.sender === user?._id
                  const isRead = m.readBy.length > 1
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
                      {mine && (
                        <button onClick={() => deleteMessageM.mutate(m._id)} className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1.5 text-slate-500 hover:text-red-400">
                          <Trash2 size={12}/>
                        </button>
                      )}
                      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-200'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-brand-100/70' : 'text-slate-500'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {mine && <span>{isRead ? '· Read' : '· Sent'}</span>}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef}/>
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-white/10 flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Type a message..."
                value={draft}
                onChange={e => handleTyping(e.target.value)}
              />
              <button type="submit" disabled={!draft.trim() || sendM.isPending} className="btn-primary px-3">
                {sendM.isPending ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
              </button>
            </form>
          </>
        )}
      </div>

      {/* New message modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewMessage(false)}>
          <div className="card p-5 w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-white">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="btn-ghost p-1"><X size={16}/></button>
            </div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input autoFocus className="input pl-9" placeholder="Search by name or email..." value={contactSearch} onChange={e => setContactSearch(e.target.value)}/>
            </div>
            <div className="flex-1 overflow-y-auto -mx-1">
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  {contactSearch ? 'No matches found.' : 'Start typing to find people you can message.'}
                </p>
              ) : (
                contacts.map(c => (
                  <button
                    key={c._id}
                    onClick={() => startConvoM.mutate(c._id)}
                    disabled={startConvoM.isPending}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">{c.firstName[0]}{c.lastName[0]}</div>
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{c.firstName} {c.lastName}</div>
                      <div className="text-[11px] text-slate-500">{ROLE_LABEL[c.role]} · {c.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReport(false)}>
          <div className="card p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold text-white mb-1">Report Conversation</h3>
            <p className="text-xs text-slate-500 mb-3">An admin will review this conversation. This won't notify the other person.</p>
            <textarea className="input h-24 resize-none" placeholder="What's going on?" value={reportReason} onChange={e => setReportReason(e.target.value)}/>
            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1 justify-center" disabled={!reportReason.trim() || reportM.isPending} onClick={() => reportM.mutate()}>
                {reportM.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Submit Report'}
              </button>
              <button className="btn-ghost" onClick={() => setShowReport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
