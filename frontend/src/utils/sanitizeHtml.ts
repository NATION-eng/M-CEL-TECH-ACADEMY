import DOMPurify from 'dompurify'

/**
 * Every place in this app that renders rich-text content (announcements,
 * blog posts) does it via `dangerouslySetInnerHTML` with zero
 * sanitization — including the public, unauthenticated-visible blog
 * page. The content comes from admin/instructor accounts today, but
 * "trusted author" isn't the same as "safe HTML": a compromised admin
 * session, an XSS-vulnerable rich text editor, or simply a pasted
 * `<script>` tag would execute in every visitor's browser with nothing
 * in between. Route all rich-text rendering through this first.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
  })
}
