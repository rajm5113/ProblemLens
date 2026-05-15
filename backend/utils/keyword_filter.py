"""
Strict two-tier keyword gate for discovery signals.

Design Rationale
────────────────
The previous filter let ANY ecosystem keyword (e.g. "startup", "fintech",
"upi") pass a post through to the LLM. This caused 60-70% of LLM calls
to evaluate promotional articles, news, and generic discussion that were
never going to produce problem cards.

New Strategy — Two-Tier Gate
────────────────────────────
A post must satisfy ALL of the following:
  1. Contains at least ONE **friction keyword** (language indicating pain,
     frustration, failure, or an unsolved need).
  2. Does NOT contain any **noise keyword** (memes, promotions, spam).
  3. Has a title of at least 10 characters (ultra-short titles are junk).

The old "context keywords" (startup, fintech, etc.) are kept but are now
OPTIONAL boosters — they are NOT required. The friction keyword is what
matters. This dramatically reduces wasted LLM calls while keeping every
genuine pain-point post.
"""

# ─── FRICTION KEYWORDS ───────────────────────────────────────────────
# Language that signals someone is experiencing or describing a problem.
# At least ONE of these must appear in the post.
FRICTION_KEYWORDS = [
    # Direct pain language
    "struggle",
    "frustrated",
    "frustrating",
    "broken",
    "failing",
    "failed",
    "pain point",
    "pain",
    "painful",
    "annoying",
    "annoyed",
    "angry",
    "furious",
    "helpless",
    "hopeless",
    "stuck",
    "trapped",
    "nightmare",
    "horrible",
    "terrible",
    "awful",
    "worst",
    "sucks",
    "hate",
    "tired of",
    "sick of",
    "fed up",
    # Unsolved / unmet need
    "can't access",
    "cannot access",
    "no solution",
    "no way to",
    "no option",
    "wish there was",
    "why is there no",
    "why isn't there",
    "if only",
    "workaround",
    "hack around",
    "nobody fixes",
    "still not fixed",
    "underserved",
    "unmet need",
    "gap in",
    # Complaint / grievance
    "complaint",
    "complain",
    "grievance",
    "injustice",
    "unfair",
    "ripped off",
    "cheated",
    "scam",
    "fraud",
    "bribe",
    "corruption",
    "middleman",
    # Cost / access barriers
    "costly",
    "overpriced",
    "too expensive",
    "can't afford",
    "unaffordable",
    "inefficient",
    "inaccessible",
    "unavailable",
    "unreliable",
    "unreachable",
    # Systemic dysfunction
    "delayed",
    "delay",
    "pending",
    "rejection",
    "rejected",
    "denied",
    "waiting",
    "queue",
    "backlog",
    "red tape",
    "bureaucracy",
    "jugaad",
    "babu",
    # Explicit problem framing
    "problem",
    "issue",
    "bug",
    "defect",
    "challenge",
    "obstacle",
    "bottleneck",
    "risk",
    "waste",
    "difficult",
    "difficulty",
    "hard to",
    "impossible to",
    "need help",
    "help me",
    "how do i",
    "anyone else facing",
    "am i the only one",
    "does anyone know",
]

# ─── NOISE KEYWORDS ──────────────────────────────────────────────────
# Posts containing these are almost never genuine problem signals.
NOISE_KEYWORDS = [
    # Reddit / social media noise
    "meme",
    "shitpost",
    "lol",
    "lmao",
    "rofl",
    "upvote",
    "downvote",
    "karma",
    "repost",
    "ama",
    "eli5",
    # Promotional / commercial
    "sale",
    "discount",
    "promo",
    "giveaway",
    "coupon",
    "affiliate",
    "sponsored",
    "ad ",
    "buy now",
    "limited offer",
    "check out my",
    "launching soon",
    "just launched",
    "we just shipped",
    "show hn",
    # Self-promotion / hiring
    "hiring",
    "we're hiring",
    "job opening",
    "apply now",
    "looking for cofound",
    # Entertainment / off-topic
    "movie",
    "cricket",
    "bollywood",
    "ipl",
    "match",
    "song",
    "trailer",
    "gossip",
    "celebrity",
]

# ─── MINIMUM CONTENT THRESHOLDS ──────────────────────────────────────
MIN_TITLE_LENGTH = 10        # Titles shorter than this are usually junk
MIN_COMBINED_LENGTH = 40     # Title + body combined minimum


def passes_keyword_filter(text: str, title: str = "") -> bool:
    """
    Strict two-tier keyword gate.

    Args:
        text: Combined title + body text for keyword matching.
        title: The post title alone (for length check). If empty,
               the length check is skipped.

    Returns:
        True only if the post contains friction language and no noise.
    """
    # ── Length gate ──
    if title and len(title.strip()) < MIN_TITLE_LENGTH:
        return False
    if len(text.strip()) < MIN_COMBINED_LENGTH:
        return False

    text_lower = text.lower()

    # ── Noise gate (reject early) ──
    if any(noise in text_lower for noise in NOISE_KEYWORDS):
        return False

    # ── Friction gate (require pain language) ──
    has_friction = any(keyword in text_lower for keyword in FRICTION_KEYWORDS)
    return has_friction
