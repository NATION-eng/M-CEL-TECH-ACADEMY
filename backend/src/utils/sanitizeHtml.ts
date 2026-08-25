/**
 * Strips the main XSS vectors from rich-text HTML before it's stored:
 * script/style/iframe/object/embed tags, event handler attributes (onClick,
 * onerror, ...), and javascript:/data: URIs in href/src. This is not a full
 * HTML sanitizer (no allowlist-based tag/attribute parsing) — it's a
 * pragmatic filter for content authored by trusted, authenticated staff
 * (instructor/admin/super_admin) through our own editor, not arbitrary
 * public HTML. If this ever accepts public/untrusted input, replace with a
 * real allowlist sanitizer (e.g. sanitize-html) instead.
 */
export const sanitizeRichText = (html: string): string => {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2')
    .replace(/(href|src)\s*=\s*(["'])\s*data:text\/html[^"']*\2/gi, '$1=$2#$2');
};
