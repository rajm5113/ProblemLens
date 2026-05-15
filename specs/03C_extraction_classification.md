# Spec 3C: Extraction & Classification Agent

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 3B (Discovery Agent) ✅
> **Produces:** ExtractionAgent, ClassificationAgent, DraftCard output, validated enum mapping

---

## 1. Purpose

Takes a validated `RawSignal` (from Discovery) and produces a schema-compliant `DraftCard`. Two agents work in sequence:

```
RawSignal → [ExtractionAgent] → ExtractedFields → [ClassificationAgent] → DraftCard
                 ↓                                        ↓
         title, painSummary,                    sector, frequency,
         painPoints, solutions,                 confidence, userType
         source text                            geography
```

**Why two agents instead of one?**
- Extraction is creative (summarize, identify pain points) — needs freedom
- Classification is constrained (pick from enum list) — needs strictness
- Separating them means a classification failure doesn't waste the extraction tokens

---

## 2. Data Flow

```
Input:  RawSignal.source.raw_text  (max 5000 chars)
        RawSignal.source.platform
        RawSignal.source.url

Step 1: ExtractionAgent
        → Extracts: title, pain_summary, pain_points[], solutions[], source label
        → Output: ExtractedFields (intermediate Pydantic model)
        → Validate: field lengths, array counts

Step 2: ClassificationAgent
        → Classifies: sector, frequency, confidence, user_type[], geography
        → Input: ExtractedFields (NOT raw text — saves tokens)
        → Output: DraftCard (full Pydantic model)
        → Validate: all enums match schema, array bounds met
```

---

## 3. Pydantic Models

### 3.1 ExtractedFields (Intermediate — not stored permanently)

```python
# models/extracted_fields.py
from pydantic import BaseModel, Field

class ExtractedFields(BaseModel):
    """Output of ExtractionAgent. Raw structured fields, not yet classified."""
    signal_id: str
    title: str = Field(min_length=10, max_length=200)
    pain_summary: str = Field(min_length=20, max_length=300)
    pain_points: list[str] = Field(min_length=2, max_length=5)
    solutions: list[str] = Field(min_length=2, max_length=5)
    source_label: str = Field(max_length=200)
    extraction_confidence: float = Field(ge=0.0, le=1.0)
```

### 3.2 DraftCard (Already defined in 3A — reused here)

The ClassificationAgent takes `ExtractedFields` and produces the full `DraftCard` from `models/draft_card.py`.

---

## 4. ExtractionAgent

### 4.1 Class Contract

```python
# agents/extraction.py
class ExtractionAgent(BaseAgent):
    """
    Takes a RawSignal and extracts structured problem fields.
    Does NOT classify (sector, frequency, etc.) — that's ClassificationAgent's job.
    """

    def run(self, ctx: PipelineContext) -> PipelineContext:
        signal = ctx.raw_signal
        prompt = self._build_prompt(signal)

        # Cache-first (§17.3)
        cached = self.cache.get(prompt, self.primary.model_name)
        if cached:
            result = ExtractedFields.model_validate_json(cached)
        else:
            result = self.primary.generate_structured(prompt, ExtractedFields)
            self.cache.put(prompt, self.primary.model_name, ...)

        result.signal_id = signal.signal_id
        ctx.extracted_fields = result
        ctx.current_stage = "extraction"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        ef = ctx.extracted_fields
        errors = []
        if not ef:
            return ValidationResult(valid=False, errors=["No extracted fields"], stage="extraction")
        if len(ef.title.strip()) < 10:
            errors.append("title too short")
        if len(ef.pain_points) < 2:
            errors.append(f"need 2-5 pain_points, got {len(ef.pain_points)}")
        if len(ef.solutions) < 2:
            errors.append(f"need 2-5 solutions, got {len(ef.solutions)}")
        if ef.extraction_confidence < 0.3:
            errors.append(f"extraction_confidence too low: {ef.extraction_confidence}")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="extraction")
```

### 4.2 Extraction Prompt (v1)

```
# prompts/v1/extraction.txt

You are a problem extraction engine for the ProblemLens platform.

Given the raw text below, extract a structured problem description.

Return ONLY valid JSON matching this schema:
{
  "title": "A clear, specific problem statement (10-200 chars)",
  "pain_summary": "One-line summary of the core pain (20-300 chars)",
  "pain_points": ["specific pain 1", "specific pain 2", ...],
  "solutions": ["potential solution 1", "potential solution 2", ...],
  "source_label": "Platform name or description of where this was found",
  "extraction_confidence": 0.85
}

Rules:
- title: Must describe WHAT is broken, not WHO is affected. Be specific.
- pain_summary: One sentence. Focus on the consequence of the problem.
- pain_points: 2-5 distinct, specific pain points. Each must be a complete sentence.
- solutions: 2-5 actionable solution directions. Each must be a complete sentence.
- source_label: e.g., "Reddit (r/india)" or "Hacker News"
- extraction_confidence: 0.0-1.0. Set below 0.5 if the text is ambiguous or off-topic.
- Do NOT invent information not present in the source text.
- Do NOT include sector, frequency, or scores — another agent handles that.

Source platform: {platform}
Source URL: {url}

Raw text:
---
{raw_text_truncated_to_2000_chars}
---
```

### 4.3 Token Budget

| Field | Tokens |
|-------|--------|
| System prompt | ~200 |
| Raw text (truncated to 2000 chars) | ~500 |
| **Total input** | **~700** |
| Expected output | **~300** |
| **Cost per extraction (Gemini Flash)** | **~$0.00014** |

---

## 5. ClassificationAgent

### 5.1 Class Contract

```python
# agents/classification.py
class ClassificationAgent(BaseAgent):
    """
    Takes ExtractedFields and classifies into schema enums.
    Input is the EXTRACTED title/summary (NOT raw text) — saves tokens.
    """

    def run(self, ctx: PipelineContext) -> PipelineContext:
        ef = ctx.extracted_fields
        prompt = self._build_prompt(ef)

        # Cache-first
        cached = self.cache.get(prompt, self.primary.model_name)
        if cached:
            classification = ClassificationResult.model_validate_json(cached)
        else:
            classification = self.primary.generate_structured(prompt, ClassificationResult)
            self.cache.put(...)

        # Merge ExtractedFields + Classification → DraftCard
        draft = DraftCard(
            signal_id=ef.signal_id,
            title=ef.title,
            pain_summary=ef.pain_summary,
            sector=classification.sector,
            user_type=classification.user_type,
            geography=classification.geography,
            frequency=classification.frequency,
            pain_points=ef.pain_points,
            solutions=ef.solutions,
            source=ef.source_label,
            confidence=classification.confidence,
            extraction_confidence=ef.extraction_confidence,
        )

        ctx.draft_card = draft
        ctx.current_stage = "classification"
        return ctx

    def validate(self, ctx: PipelineContext) -> ValidationResult:
        draft = ctx.draft_card
        errors = []
        if not draft:
            return ValidationResult(valid=False, errors=["No draft card"], stage="classification")
        # Pydantic already enforces enum membership, but double-check
        if draft.sector not in [s.value for s in Sector]:
            errors.append(f"Invalid sector: {draft.sector}")
        if draft.frequency not in [f.value for f in Frequency]:
            errors.append(f"Invalid frequency: {draft.frequency}")
        if draft.confidence not in [c.value for c in Confidence]:
            errors.append(f"Invalid confidence: {draft.confidence}")
        if len(draft.user_type) < 1 or len(draft.user_type) > 5:
            errors.append(f"user_type must have 1-5 items, got {len(draft.user_type)}")
        return ValidationResult(valid=len(errors) == 0, errors=errors, stage="classification")
```

### 5.2 ClassificationResult Model

```python
# models/classification_result.py
from pydantic import BaseModel, Field
from models.enums import Sector, Frequency, Confidence

class ClassificationResult(BaseModel):
    sector: Sector
    user_type: list[str] = Field(min_length=1, max_length=5)
    geography: str = Field(default="India", max_length=100)
    frequency: Frequency
    confidence: Confidence
```

### 5.3 Classification Prompt (v1)

```
# prompts/v1/classification.txt

You are a problem classifier for the ProblemLens platform (India-focused).

Given the problem title and summary below, classify it into our taxonomy.

Return ONLY valid JSON matching this schema:
{
  "sector": "one of the allowed sectors",
  "user_type": ["Primary affected group", "Secondary group"],
  "geography": "India",
  "frequency": "one of: Low, Medium, High, Very High",
  "confidence": "one of: Low, Medium, High"
}

Allowed sectors (pick exactly one):
Healthcare, Fintech, Education, Agriculture, GovTech, Legal, CleanTech,
Employment, Creator Economy, Retail, Rare Disease, Technology, Transportation,
Fintech / Retail, Fintech / Creator, Legal / GovTech, GovTech / Legal,
Employment / EdTech

Rules:
- sector: Pick the SINGLE best match. Use compound sectors only if the problem clearly spans two domains.
- user_type: 1-5 groups. Be specific (e.g., "Rural ASHA Workers" not "Healthcare Workers").
- geography: Default "India" unless the problem is explicitly region-specific (e.g., "Rural Maharashtra").
- frequency: How often do affected users encounter this problem?
  - Low: yearly or rarely
  - Medium: monthly
  - High: weekly
  - Very High: daily
- confidence: How confident are you in this classification?
  - Low: text is ambiguous, could fit multiple sectors
  - Medium: reasonable match but some uncertainty
  - High: clear, unambiguous match

Problem title: {title}
Problem summary: {pain_summary}
Pain points: {pain_points_joined}
```

### 5.4 Token Budget

| Field | Tokens |
|-------|--------|
| System prompt + enum list | ~250 |
| Title + summary + pain points | ~150 |
| **Total input** | **~400** |
| Expected output | **~100** |
| **Cost per classification (Gemini Flash)** | **~$0.00006** |

**Note:** Input is the extracted title/summary, NOT the full raw text. This saves ~500 tokens per call compared to re-sending the raw text.

---

## 6. Pipeline Integration

### 6.1 Updated Pipeline Stage Order

```python
# pipeline.py
# Stages: Discovery → Extraction → Classification → [Dedup] → Scoring → Enrichment
self.downstream_agents = [
    self.extraction_agent,       # RawSignal → ExtractedFields
    self.classification_agent,   # ExtractedFields → DraftCard
    # ... scoring and enrichment agents (Spec 3D)
]
```

### 6.2 PipelineContext Updates

Add `extracted_fields` to `PipelineContext`:

```python
# models/pipeline_context.py (additions)
from models.extracted_fields import ExtractedFields

class PipelineContext(BaseModel):
    # ... existing fields ...
    extracted_fields: ExtractedFields | None = None
    # draft_card already exists
```

---

## 7. Error Handling & Repair

### 7.1 Extraction Failures

| Failure | Action |
|---------|--------|
| LLM returns < 2 pain points | Retry with: "You returned {n} pain points. The schema requires 2-5. Please split or expand." |
| LLM returns title < 10 chars | Retry with: "Title is too short. Write a specific problem statement of 10-200 characters." |
| extraction_confidence < 0.3 | Log warning, skip this signal (not worth scoring) |
| Malformed JSON | Standard retry → fallback flow from BaseAgent |

### 7.2 Classification Failures

| Failure | Action |
|---------|--------|
| LLM picks invalid sector | Retry with: "'{sector}' is not in our taxonomy. Pick from: {enum_list}" |
| LLM picks invalid frequency | Same repair pattern |
| All retries fail | Move to manual_review queue |

### 7.3 Repair Prompt Template

```python
def _build_repair_prompt(self, original_prompt: str, error: Exception) -> str:
    return (
        f"Your previous response failed validation: {error}\n\n"
        "Fix the error and return valid JSON. "
        "Do not change anything else. Here is the original task:\n\n"
        f"{original_prompt}"
    )
```

---

## 8. Cost Impact (§18 Mandate)

### Per-Signal Cost

| Stage | Input Tokens | Output Tokens | Cost (Gemini Flash) |
|-------|-------------|---------------|---------------------|
| Extraction | ~700 | ~300 | $0.00014 |
| Classification | ~400 | ~100 | $0.00006 |
| **Total per signal** | **~1,100** | **~400** | **~$0.00020** |

### Per-Run Cost (15 signals from discovery)

| Metric | Value |
|--------|-------|
| Extraction calls | 15 |
| Classification calls | 15 |
| Total LLM calls | 30 |
| Total tokens | ~22,500 |
| **Cost** | **~$0.003** |
| Cache hits (re-runs) | Up to 100% → $0.00 |

### Monthly Cost (2 runs/day, 30 days)

| Without cache | With cache |
|--------------|-----------|
| ~$0.18 | ~$0.02 |

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Test | What It Validates |
|------|------------------|
| `test_extracted_fields_valid` | Valid ExtractedFields parses correctly |
| `test_extracted_fields_rejects_short_title` | Title < 10 chars → ValidationError |
| `test_extracted_fields_rejects_one_pain_point` | 1 pain point → ValidationError |
| `test_classification_result_valid` | Valid ClassificationResult parses |
| `test_classification_rejects_bad_sector` | "SpaceTech" → ValidationError |
| `test_classification_rejects_bad_frequency` | "Sometimes" → ValidationError |
| `test_draft_card_merges_correctly` | ExtractedFields + ClassificationResult → valid DraftCard |

### 9.2 Integration Tests

| Test | What It Validates |
|------|------------------|
| `test_extraction_from_raw_signal` | Mock LLM → RawSignal produces valid ExtractedFields |
| `test_classification_from_extracted` | Mock LLM → ExtractedFields produces valid DraftCard |
| `test_extraction_retry_on_short_title` | First call returns short title → retry fixes it |
| `test_classification_retry_on_bad_sector` | First call returns "SpaceTech" → retry picks valid sector |
| `test_full_extraction_classification_pipeline` | RawSignal → ExtractedFields → DraftCard end-to-end |

### 9.3 Golden Test Data

Add to `tests/golden/`:
- `mock_extraction_input.json` — 3 sample RawSignal objects
- `expected_extracted_fields.json` — Expected ExtractionAgent output
- `expected_draft_cards.json` — Expected ClassificationAgent output

---

## 10. File Deliverables

| File | Action |
|------|--------|
| `models/extracted_fields.py` | **Create** — ExtractedFields model |
| `models/classification_result.py` | **Create** — ClassificationResult model |
| `models/pipeline_context.py` | **Update** — add `extracted_fields` field |
| `agents/extraction.py` | **Update** — full ExtractionAgent implementation |
| `agents/classification.py` | **Update** — full ClassificationAgent implementation |
| `prompts/v1/extraction.txt` | **Update** — final extraction prompt |
| `prompts/v1/classification.txt` | **Update** — final classification prompt |
| `pipeline.py` | **Update** — wire extraction + classification into stage list |
| `tests/test_agents/test_extraction.py` | **Update** — full test suite |
| `tests/test_agents/test_classification.py` | **Create** — classification tests |
| `tests/golden/mock_extraction_input.json` | **Create** — golden test data |
| `tests/golden/expected_draft_cards.json` | **Create** — expected outputs |

---

## 11. Exit Conditions

- [ ] `ExtractedFields` model validates correct data and rejects invalid data
- [ ] `ClassificationResult` model enforces all Phase 2 enums
- [ ] ExtractionAgent produces valid `ExtractedFields` from mock `RawSignal`
- [ ] ClassificationAgent produces valid `DraftCard` from mock `ExtractedFields`
- [ ] Classification picks only from allowed Sector enum values
- [ ] Retry/repair loop fixes short titles and insufficient pain points
- [ ] Cache integration: second run with same input returns cached result
- [ ] Pipeline wires extraction → classification in correct order
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Cost per signal stays under $0.0003

---

## 12. What This Spec Does NOT Cover

| Topic | Covered In |
|-------|-----------|
| Score rubric application | Spec 3D (Scoring Agent) |
| Root cause & enrichment | Spec 3D (Enrichment Agent) |
| Semantic dedup against existing cards | Spec 3D |
| Trend status computation | Spec 3D |
| Opportunity score calculation | Spec 3D (code, not LLM) |
