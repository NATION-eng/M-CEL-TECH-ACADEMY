import { useRef, useCallback, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon, Heading2, Heading3, Quote, Loader2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { resourceAPI } from '../services/api'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/**
 * A dependency-free rich text editor (no react-quill/tiptap install needed —
 * this environment can't verify a new package installs cleanly). Uses
 * contentEditable + document.execCommand, which is deprecated but still
 * broadly supported and sufficient for a blog/announcement body: bold,
 * italic, underline, headings, lists, quote, links, and inline images.
 * Output is sanitized again server-side before storage either way.
 */
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const lastValueRef = useRef(value)

  // Only push external `value` changes into the DOM when they didn't
  // originate from this editor's own onInput — otherwise every keystroke
  // would reset the cursor to the start.
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value || ''
      lastValueRef.current = value
    }
  }, [value])

  const emitChange = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    lastValueRef.current = html
    onChange(html)
  }, [onChange])

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    emitChange()
  }

  const insertLink = () => {
    const url = window.prompt('Link URL:')
    if (url) exec('createLink', url)
  }

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await resourceAPI.uploadInlineImage(formData)
      const url = res.data?.data?.url
      if (url) exec('insertImage', url)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Image upload failed.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const ToolbarBtn = ({ icon: Icon, onClick, title }: { icon: typeof Bold; onClick: () => void; title: string }) => (
    <button type="button" title={title} onMouseDown={e => e.preventDefault()} onClick={onClick}
      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
      <Icon size={15}/>
    </button>
  )

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-ink-800/40">
      <div className="flex items-center gap-0.5 border-b border-white/10 px-2 py-1.5 flex-wrap">
        <ToolbarBtn icon={Bold} title="Bold" onClick={() => exec('bold')}/>
        <ToolbarBtn icon={Italic} title="Italic" onClick={() => exec('italic')}/>
        <ToolbarBtn icon={Underline} title="Underline" onClick={() => exec('underline')}/>
        <div className="w-px h-4 bg-white/10 mx-1"/>
        <ToolbarBtn icon={Heading2} title="Heading" onClick={() => exec('formatBlock', 'h2')}/>
        <ToolbarBtn icon={Heading3} title="Subheading" onClick={() => exec('formatBlock', 'h3')}/>
        <ToolbarBtn icon={Quote} title="Quote" onClick={() => exec('formatBlock', 'blockquote')}/>
        <div className="w-px h-4 bg-white/10 mx-1"/>
        <ToolbarBtn icon={List} title="Bullet List" onClick={() => exec('insertUnorderedList')}/>
        <ToolbarBtn icon={ListOrdered} title="Numbered List" onClick={() => exec('insertOrderedList')}/>
        <div className="w-px h-4 bg-white/10 mx-1"/>
        <ToolbarBtn icon={Link2} title="Insert Link" onClick={insertLink}/>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" id="rte-image-input"
          onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}/>
        <label htmlFor="rte-image-input" className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
          {uploadingImage ? <Loader2 size={15} className="animate-spin"/> : <ImageIcon size={15}/>}
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="rte-content px-4 py-3 min-h-[220px] max-h-[480px] overflow-y-auto text-sm text-slate-200 focus:outline-none prose-editor"
        suppressContentEditableWarning
      />
      <style>{`
        .rte-content:empty:before { content: attr(data-placeholder); color: #64748B; }
        .rte-content h2 { font-size: 1.35rem; font-weight: 700; color: #fff; margin: 0.75rem 0 0.4rem; }
        .rte-content h3 { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0.6rem 0 0.3rem; }
        .rte-content p { margin: 0.5rem 0; }
        .rte-content ul, .rte-content ol { margin: 0.5rem 0 0.5rem 1.25rem; }
        .rte-content blockquote { border-left: 3px solid #4F46E5; padding-left: 0.75rem; color: #94A3B8; margin: 0.5rem 0; }
        .rte-content img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
        .rte-content a { color: #818CF8; text-decoration: underline; }
      `}</style>
    </div>
  )
}
