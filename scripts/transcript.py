"""
Fetch a YouTube video's transcript so it can be turned into library items (/add-video).

Prints a short header (video ID, title, clean URL) and then the transcript as
paragraphs, each starting with a [mm:ss] timestamp. The timestamps are what let
each library item link to the exact moment a drill is explained.

Usage (from the baseball-coach-app folder):
    python scripts/transcript.py <youtube-url>
    python scripts/transcript.py <youtube-url> --id-only   # just print the video ID

Needs: pip install -r requirements.txt  (youtube-transcript-api)
"""

import json
import re
import sys
import urllib.parse
import urllib.request

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import CouldNotRetrieveTranscript

# A new paragraph starts every ~30 seconds, so timestamps are precise enough to
# jump to a drill without printing one for every caption line.
PARAGRAPH_SECONDS = 30

# YouTube video IDs are always 11 characters from this set.
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def extract_video_id(url: str) -> str | None:
    """Handles watch?v=, youtu.be/, /shorts/, /embed/ and /live/ links, and a bare ID."""
    url = url.strip()
    if VIDEO_ID.match(url):
        return url
    parsed = urllib.parse.urlparse(url if "://" in url else "https://" + url)
    host = parsed.netloc.lower().removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        candidate = parsed.path.lstrip("/").split("/")[0]
    elif host.endswith("youtube.com"):
        query = urllib.parse.parse_qs(parsed.query)
        if "v" in query:
            candidate = query["v"][0]
        else:
            parts = parsed.path.strip("/").split("/")
            candidate = parts[1] if len(parts) >= 2 and parts[0] in ("shorts", "embed", "live", "v") else ""
    else:
        return None
    return candidate if VIDEO_ID.match(candidate) else None


def fetch_title(video_id: str) -> str:
    """YouTube's oEmbed endpoint gives the title with no API key. Not essential, so failures are fine."""
    oembed = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        f"https://www.youtube.com/watch?v={video_id}"
    )
    try:
        with urllib.request.urlopen(oembed, timeout=15) as resp:
            data = json.loads(resp.read())
            return f"{data.get('title', '')} ({data.get('author_name', 'unknown channel')})"
    except Exception:
        return "(title unavailable)"


def mmss(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit("Usage: python scripts/transcript.py <youtube-url> [--id-only]")

    video_id = extract_video_id(args[0])
    if not video_id:
        sys.exit(f"ERROR: couldn't find a YouTube video ID in {args[0]!r}")
    if "--id-only" in sys.argv:
        print(video_id)
        return

    try:
        # Prefer English (manual or auto-generated captions both count).
        transcript = YouTubeTranscriptApi().fetch(video_id, languages=["en", "en-US", "en-GB"])
    except CouldNotRetrieveTranscript as e:
        # Covers captions disabled, no English captions, private/removed video, and YouTube blocking.
        first_line = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
        sys.exit(f"ERROR: no transcript for {video_id} ({type(e).__name__}): {first_line}")

    # Windows terminals default to a legacy code page; force UTF-8 so quotes and dashes print.
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"VIDEO_ID: {video_id}")
    print(f"TITLE: {fetch_title(video_id)}")
    print(f"URL: https://www.youtube.com/watch?v={video_id}")
    print(f"LANGUAGE: {transcript.language}")  # already says "(auto-generated)" when it is
    print()

    paragraph: list[str] = []
    paragraph_start = 0.0
    for snippet in transcript.snippets:
        text = " ".join(snippet.text.split())  # captions contain line breaks mid-sentence
        if not text:
            continue
        if paragraph and snippet.start - paragraph_start >= PARAGRAPH_SECONDS:
            print(f"[{mmss(paragraph_start)}] {' '.join(paragraph)}")
            paragraph = []
        if not paragraph:
            paragraph_start = snippet.start
        paragraph.append(text)
    if paragraph:
        print(f"[{mmss(paragraph_start)}] {' '.join(paragraph)}")


if __name__ == "__main__":
    main()
