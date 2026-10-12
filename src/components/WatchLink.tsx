/**
 * "▶ Watch" button for a library item whose source is a video link
 * (e.g. from /add-video). Renders nothing when source is plain text like "Lead Leg Block".
 */

/** Only http(s) links count, so a stray "javascript:" source can never become a clickable link. */
function videoLink(source: string | null | undefined): URL | null {
  if (!source) return null
  try {
    const url = new URL(source.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null // not a URL at all
  }
}

/** YouTube's "&t=272s" (or "t=272") as "4:32", so the coach knows where it starts. */
function startLabel(url: URL): string | null {
  const seconds = parseInt(url.searchParams.get('t') ?? '', 10)
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function WatchLink({ source }: { source: string | null | undefined }) {
  const url = videoLink(source)
  if (!url) return null
  const at = startLabel(url)
  return (
    <a
      className="btn-watch"
      href={url.href}
      target="_blank" // opens the YouTube app/tab, leaving the lesson where it was
      rel="noopener noreferrer"
      // Inside a tappable card or row, so stop the tap from also opening the editor.
      onClick={(e) => e.stopPropagation()}
    >
      ▶ Watch{at ? ` at ${at}` : ''}
    </a>
  )
}
