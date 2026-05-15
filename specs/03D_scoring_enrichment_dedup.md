# Spec 3D: Scoring, Enrichment & Dedup Agent

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 3C (Extraction & Classification) ✅
> **Produces:** ScoringAgent, EnrichmentAgent, DedupAgent, final ProblemIntelligenceCard output

---

## 1. Purpose

This is the final pipeline stage. It takes a validated `DraftCard` and produces a production-ready `ProblemIntelligenceCard` through three sub-stages:

```
DraftCard → [DedupAgent] → [ScoringAgent] → [EnrichmentAgent] → ProblemIntelligenceCard
                 ↓                ↓                  ↓
          Skip if duplicate   4 rubric scores    root_cause, refined
          bump signalCount    + rationale         solutions, tags,
                              opp score (code)    trend, final card
```

---

## 2. Stage Order & Early Exit

```python
# Pipeline stage order for Spec 3D:
# 1. DedupAgent    — if duplicate, skip stages 2-3 (saves ~$0.0004/signal)
# 2. ScoringAgent  — LLM produces rubric scores, code computes opportunity
# 3. EnrichmentAgent — LLM adds root_cause, refines solutions, sets trend
```

**Critical cost rule:** Dedup runs FIRST. If the card matches an existing one, we increment `signal_count` and `updated_at` on the existing card and return immediately. No scoring, no enrichment, no wasted tokens.

---

## 3. DedupAgent

### 3.1 Similarity Strategy

For MVP, use **title similarity** (normalized Levenshtein ratio). No embedding model needed — saves cost and complexity.

```python
# agents/dedup.py
from difflib import SequenceMatcher

class DedupAgent(BaseAgent):
    SIMILARITY_THRESHOLD = 0.75  # 75% title similarity = likely duplicate

    def __init__(self, primary, fallback=None, card_store=None):
        super().__init__(primary, fallback)
        self.card_store = card_store

    def run(self, ctx: PipelineContext) -> PipelineContext:
        draft = ctx.draft_card
        if draft is None:
            ctx.validation_errors = ["No draft card for dedup"]
            return ctx

        existing = self._find_duplicate(draft)
        if existing:
            # Duplicate found — update existing card, skip downstream
            existing.signal_count += 1
            existing.updated_at = datetime.now(timezone.utc)
            self.card_store.save(existing)
            ctx.final_card = existing
            ctx.status = "duplicate_merged"
            ctx.current_stage = "dedup"
            self.logger.info("duplicate_merged",
                existing_id=existing.id, signal_count=existing.signal_count)
            return ctx

        ctx.current_stage = "dedup"
        return ctx  # Not a duplicate — proceed to scoring

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        # Dedup always passes — it either merges or passes through
        return ValidationResult(valid=True, errors=[], stage="dedup")

    def _find_duplicate(self, draft: DraftCard) -> ProblemIntelligenceCard | None:
        existing_cards = self.card_store.get_all()
        draft_title = draft.title.lower().strip()
        for card in existing_cards:
            ratio = SequenceMatcher(None, draft_title, card.title.lower().strip()).ratio()
            if ratio >= self.SIMILARITY_THRESHOLD:
                return card
        return None
```

### 3.2 Cost Impact

| Action | LLM Calls | Cost |
|--------|-----------|------|
| Dedup check | 0 | $0.00 |
| Duplicate found → skip scoring + enrichment | Saves 2 calls | Saves ~$0.0004 |

---

## 4. ScoringAgent

### 4.1 Class Contract

```python
# agents/scoring.py
class ScoringAgent(BaseAgent):
    """
    Applies rubric scores via LLM, then computes opportunity score in code.
    The LLM NEVER computes the composite score — only the 4 individual rubric scores.
    """

    def run(self, ctx: PipelineContext) -> PipelineContext:
        # Skip if already handled by dedup
        if ctx.status == "duplicate_merged":
            return ctx

        draft = ctx.draft_card
        prompt = self._build_prompt(draft)

        # Cache-first
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            breakdown = ScoreBreakdown.model_validate_json(cached)
        else:
            breakdown = self.primary.generate_structured(prompt, ScoreBreakdown)
            self.cache.put(...)

        # Compute opportunity score IN CODE, not LLM
        opp_score = compute_opportunity_score(breakdown)

        ctx.score_breakdown = breakdown
        ctx.computed_opportunity_score = opp_score
        ctx.current_stage = "scoring"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        sb = ctx.score_breakdown
        errors = []
        if sb is None:
            return ValidationResult(valid=False, errors=["No score breakdown"], stage="scoring")
        for field in ["severity", "market_potential", "ai_feasibility", "competition"]:
            val = getattr(sb, field)
            if not (1 <= val <= 10):
                errors.append(f"{field} must be 1-10, got {val}")
        if sb.score_confidence < 0.3:
            errors.append(f"score_confidence too low: {sb.score_confidence}")
        # Validate rationale exists
        for field in ["severity_reason", "market_potential_reason",
                       "ai_feasibility_reason", "competition_reason"]:
            if len(getattr(sb.rationale, field, "").strip()) < 5:
                errors.append(f"rationale.{field} is too short")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="scoring")
```

### 4.2 Scoring Prompt (v1)

```
# prompts/v1/scoring.txt

You are a scoring engine for the ProblemLens platform.

Score this problem on 4 dimensions. Each score is 1-10 (integer).

Return ONLY valid JSON:
{
  "severity": 7,
  "market_potential": 8,
  "ai_feasibility": 6,
  "competition": 4,
  "rationale": {
    "severity_reason": "Why this severity score (one line)",
    "market_potential_reason": "Why this market score (one line)",
    "ai_feasibility_reason": "Why this AI score (one line)",
    "competition_reason": "Why this competition score (one line)"
  },
  "score_confidence": 0.8
}

Scoring rubrics:

SEVERITY (how painful is this problem?):
  1-2: Minor annoyance, easy workarounds exist
  3-4: Moderate friction, users cope but complain
  5-6: Significant pain, wastes hours per week
  7-8: Severe impact on livelihood, health, or income
  9-10: Life-threatening or causes catastrophic financial loss

MARKET POTENTIAL (how big is the addressable market?):
  1-2: <10K affected users, niche
  3-4: 10K-100K users, small segment
  5-6: 100K-1M users, growing segment
  7-8: 1M-10M users, large addressable market
  9-10: >10M users, massive national-scale market

AI FEASIBILITY (can AI meaningfully solve this?):
  1-2: No clear AI application, purely physical/policy problem
  3-4: AI could assist marginally but human judgment dominates
  5-6: AI can automate significant parts of the workflow
  7-8: AI is the natural solution (NLP, vision, prediction)
  9-10: AI can fully automate with minimal human oversight

COMPETITION (how crowded is the solution space?):
  1-2: No known competitors, completely greenfield
  3-4: 1-2 early-stage startups, no dominant player
  5-6: Several competitors but none dominant, room for differentiation
  7-8: Established players exist, hard to compete
  9-10: Market dominated by well-funded incumbents

Note: Lower competition = better opportunity. The pipeline inverts this score.

Calibration anchors (from our manually scored cards):
- PIP-002 (ASHA workers lack digital tools): severity=9, market=9, ai=8, competition=3
- PIP-001 (Students tracking deadlines): severity=7, market=7, ai=8, competition=6
- PIP-008 (Insurance claim rejection): severity=8, market=8, ai=7, competition=5

Problem title: {title}
Pain summary: {pain_summary}
Sector: {sector}
User type: {user_type}
Frequency: {frequency}
Pain points:
{pain_points}
```

### 4.3 Opportunity Score (Code, Not LLM)

```python
# utils/scoring.py (already exists from 3A — reused)
def compute_opportunity_score(scores: ScoreBreakdown) -> int:
    raw = (
        scores.severity * 0.30 +
        scores.market_potential * 0.25 +
        scores.ai_feasibility * 0.20 +
        (10 - scores.competition) * 0.25
    )
    return max(1, min(10, round(raw)))
```

### 4.4 Token Budget

| Field | Tokens |
|-------|--------|
| System prompt + rubrics + anchors | ~400 |
| Problem details | ~150 |
| **Total input** | **~550** |
| Expected output (scores + rationale) | **~250** |
| **Cost per scoring call (Gemini Flash)** | **~$0.00012** |

---

## 5. EnrichmentAgent

### 5.1 Class Contract

```python
# agents/enrichment.py
class EnrichmentAgent(BaseAgent):
    """
    Adds root_cause, refines solutions, computes tags, sets trend.
    Produces the final ProblemIntelligenceCard.
    """

    def run(self, ctx: PipelineContext) -> PipelineContext:
        # Skip if duplicate
        if ctx.status == "duplicate_merged":
            return ctx

        draft = ctx.draft_card
        scores = ctx.score_breakdown
        opp_score = ctx.computed_opportunity_score
        prompt = self._build_prompt(draft)

        # Cache-first
        cached = self.cache.get(prompt, self.primary.model)
        if cached:
            enrichment = EnrichmentResult.model_validate_json(cached)
        else:
            enrichment = self.primary.generate_structured(prompt, EnrichmentResult)
            self.cache.put(...)

        # Build final card
        card_id = self.card_store.next_id()  # "PIP-012", etc.
        now = datetime.now(timezone.utc)

        final = ProblemIntelligenceCard(
            id=card_id,
            numeric_id=int(card_id.split("-")[1]),
            created_at=now,
            updated_at=now,
            title=draft.title,
            pain_summary=draft.pain_summary,
            description=enrichment.description,
            sector=draft.sector,
            user_type=draft.user_type,
            geography=draft.geography,
            frequency=draft.frequency,
            tags=[draft.user_type[0], draft.geography, draft.frequency.value],
            pain_points=draft.pain_points,
            root_cause=enrichment.root_cause,
            solutions=enrichment.refined_solutions or draft.solutions,
            source=draft.source,
            confidence=draft.confidence,
            signal_count=1,
            scores=scores,
            opportunity_score=opp_score,
            trend_status=TrendStatus.NEW,
        )

        ctx.final_card = final
        ctx.current_stage = "enrichment"
        return ctx
```

### 5.2 EnrichmentResult Model

```python
# models/enrichment_result.py
from pydantic import BaseModel, Field

class EnrichmentResult(BaseModel):
    root_cause: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    refined_solutions: list[str] | None = Field(default=None, max_length=5)
```

### 5.3 Enrichment Prompt (v1)

```
# prompts/v1/enrichment.txt

You are an enrichment engine for the ProblemLens platform.

Given the problem below, provide deeper analysis.

Return ONLY valid JSON:
{
  "root_cause": "The underlying systemic reason this problem exists (max 500 chars, or null)",
  "description": "A 2-3 sentence detailed description expanding on the pain summary (max 2000 chars, or null)",
  "refined_solutions": ["Improved solution 1", "Improved solution 2"]
}

Rules:
- root_cause: Identify the SYSTEMIC reason, not just symptoms. Can be null if unclear.
- description: Expand the pain_summary with context. Do NOT repeat the title.
- refined_solutions: Improve the existing solutions with more specificity. Keep 2-5 items.
  If the existing solutions are already good, return null.
- Do NOT change the problem's sector, scores, or classification.
- Do NOT invent facts not supported by the problem data.

Problem title: {title}
Pain summary: {pain_summary}
Sector: {sector}
Pain points:
{pain_points}
Existing solutions:
{solutions}
```

### 5.4 Token Budget

| Field | Tokens |
|-------|--------|
| System prompt | ~180 |
| Problem details | ~200 |
| **Total input** | **~380** |
| Expected output | **~250** |
| **Cost per enrichment (Gemini Flash)** | **~$0.00010** |

---

## 6. Final Card Assembly & Storage

### 6.1 Tag Computation (Code, Not LLM)

Tags are deterministic — never ask the LLM:

```python
tags = [draft.user_type[0], draft.geography, draft.frequency.value]
```

### 6.2 Card ID Generation

```python
# store/card_store.py
class CardStore:
    def next_id(self) -> str:
        """Returns next sequential PIP ID, e.g., 'PIP-012'."""
        existing = self.get_all()
        if not existing:
            return "PIP-012"  # Continue after seed data PIP-001 through PIP-011
        max_num = max(card.numeric_id for card in existing)
        return f"PIP-{max_num + 1:03d}"
```

### 6.3 Trend Status

For MVP, all new cards get `TrendStatus.NEW`. The trend computation job (Phase 4) will update this based on signal growth over time.

---

## 7. PipelineContext Updates

```python
# models/pipeline_context.py (additions)
class PipelineContext(BaseModel):
    # ... existing fields ...
    computed_opportunity_score: int | None = None
    discovery_signals: list[RawSignal] = Field(default_factory=list)
    # status gains a new value: "duplicate_merged"
```

---

## 8. Full Pipeline Cost Summary (§18 Mandate)

### Per-Signal Cost (New, Non-Duplicate)

| Stage | LLM Calls | Input Tokens | Output Tokens | Cost |
|-------|-----------|-------------|---------------|------|
| Discovery (from 3B) | 0.2 (batched) | ~175 | ~25 | $0.00002 |
| Extraction (from 3C) | 1 | ~700 | ~300 | $0.00014 |
| Classification (from 3C) | 1 | ~400 | ~100 | $0.00006 |
| Dedup | 0 | 0 | 0 | $0.00000 |
| Scoring | 1 | ~550 | ~250 | $0.00012 |
| Enrichment | 1 | ~380 | ~250 | $0.00010 |
| **Total per NEW card** | **~4.2** | **~2,205** | **~925** | **~$0.00044** |

### Per-Signal Cost (Duplicate)

| Stage | LLM Calls | Cost |
|-------|-----------|------|
| Discovery + Extraction + Classification | ~2.2 | $0.00022 |
| Dedup (match found) | 0 | $0.00000 |
| Scoring (SKIPPED) | 0 | $0.00000 |
| Enrichment (SKIPPED) | 0 | $0.00000 |
| **Total per DUPLICATE** | **~2.2** | **~$0.00022** |

### Monthly Projection (2 runs/day, 15 signals/run, 30% duplicate rate)

| Metric | Value |
|--------|-------|
| Signals/month | ~900 |
| New cards | ~630 |
| Duplicates (skipped scoring) | ~270 |
| Total LLM calls | ~3,240 |
| Total tokens | ~1.9M |
| **Estimated monthly cost** | **~$0.34** |

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_dedup_finds_similar_title` | 80% similar title → returns existing card |
| `test_dedup_allows_different_title` | 40% similar → passes through |
| `test_dedup_increments_signal_count` | Duplicate merge updates count and timestamp |
| `test_scoring_valid_breakdown` | Valid ScoreBreakdown parses correctly |
| `test_scoring_rejects_score_11` | score=11 → ValidationError |
| `test_scoring_requires_rationale` | Empty rationale → validation fails |
| `test_opportunity_formula_matches_phase2` | Verify formula against seed card scores |
| `test_enrichment_result_valid` | Valid EnrichmentResult parses |
| `test_enrichment_null_fields_ok` | root_cause=null accepted |
| `test_tag_computation_deterministic` | Tags always equal [userType[0], geography, frequency] |
| `test_card_id_sequential` | next_id() after PIP-011 returns PIP-012 |

### 9.2 Integration Tests

| Test | What It Validates |
|------|------------------|
| `test_dedup_skips_scoring` | Duplicate → ctx.status == "duplicate_merged", no scoring call |
| `test_scoring_from_draft` | Mock LLM → DraftCard produces valid ScoreBreakdown |
| `test_enrichment_from_scored` | Mock LLM → produces valid ProblemIntelligenceCard |
| `test_full_pipeline_new_card` | RawSignal → final ProblemIntelligenceCard end-to-end |
| `test_full_pipeline_duplicate` | RawSignal matching existing → merged, no scoring |
| `test_scoring_retry_on_bad_score` | LLM returns score=15 → retry → corrected |

### 9.3 Golden Test Data

Add to `tests/golden/`:
- `expected_score_breakdowns.json` — Expected scores for 3 sample problems
- `expected_final_cards.json` — Expected full ProblemIntelligenceCard output

---

## 10. File Deliverables

| File | Action |
|------|--------|
| `models/enrichment_result.py` | **Create** |
| `models/pipeline_context.py` | **Update** — add `computed_opportunity_score` |
| `agents/dedup.py` | **Update** — full DedupAgent implementation |
| `agents/scoring.py` | **Update** — full ScoringAgent implementation |
| `agents/enrichment.py` | **Update** — full EnrichmentAgent implementation |
| `prompts/v1/scoring.txt` | **Update** — final scoring prompt with rubrics |
| `prompts/v1/enrichment.txt` | **Update** — final enrichment prompt |
| `store/card_store.py` | **Update** — add `next_id()`, `get_all()`, `find_similar()` |
| `pipeline.py` | **Update** — wire dedup → scoring → enrichment |
| `tests/test_agents/test_scoring.py` | **Update** — full test suite |
| `tests/test_agents/test_dedup.py` | **Create** |
| `tests/test_agents/test_enrichment.py` | **Create** |
| `tests/golden/expected_score_breakdowns.json` | **Create** |
| `tests/golden/expected_final_cards.json` | **Create** |

---

## 11. Exit Conditions

- [ ] DedupAgent correctly identifies duplicate cards by title similarity (≥75%)
- [ ] DedupAgent skips scoring and enrichment for duplicates
- [ ] DedupAgent increments `signal_count` and updates `updated_at` on merge
- [ ] ScoringAgent produces valid ScoreBreakdown with all 4 rubric scores 1-10
- [ ] ScoringAgent includes rationale for each score dimension
- [ ] `compute_opportunity_score()` matches Phase 2 formula exactly
- [ ] Opportunity score is computed in CODE, never by the LLM
- [ ] EnrichmentAgent produces root_cause and refined solutions
- [ ] Tags are computed deterministically as [userType[0], geography, frequency]
- [ ] Final `ProblemIntelligenceCard` passes all Phase 2 validation rules
- [ ] Card IDs are sequential (PIP-012, PIP-013, etc.)
- [ ] Full pipeline: RawSignal → ProblemIntelligenceCard end-to-end works
- [ ] All unit and integration tests pass
- [ ] Cost per new card stays under $0.0005
- [ ] Cost per duplicate stays under $0.0003

---

## 12. What This Spec Completes

With Spec 3D implemented, the **entire agent pipeline is functional**:

```
Sources → Discovery → Extraction → Classification → Dedup → Scoring → Enrichment → CardStore
  (3B)       (3B)        (3C)           (3C)         (3D)     (3D)       (3D)         (3D)
```

### Phase 3 Completion Checklist

- [x] Spec 3A: Architecture & Foundation
- [x] Spec 3B: Discovery Agent
- [x] Spec 3C: Extraction & Classification
- [ ] Spec 3D: Scoring, Enrichment & Dedup ← **THIS SPEC**

### What Comes Next (Phase 4)

| Topic | Phase |
|-------|-------|
| REST API to serve cards to the UI | Phase 4 |
| Scheduled pipeline runs (cron) | Phase 4 |
| Database migration (SQLite → PostgreSQL) | Phase 4 |
| UI integration (live data instead of seed) | Phase 4 |
| Trend status computation job | Phase 4 |
