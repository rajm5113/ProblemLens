# ProblemLens — Agent Workflow

## Flowchart

```mermaid
flowchart TD
    A([Scheduler Trigger]) --> B[Fetch Raw Posts]
    B --> C{URL Already Seen?}
    C -- Yes --> Z([Drop Post])
    C -- No --> D{Passes Keyword Filter?}
    D -- No --> Z
    D -- Yes --> E[LLM - Check Relevance]
    E --> F{Is a Real Problem?}
    F -- No --> Z
    F -- Yes --> G[Extraction Agent]
    G --> H[Classification Agent]
    H --> I[Scoring Agent]
    I --> J[Enrichment Agent]
    J --> K{Is Semantic Duplicate?}
    K -- Yes --> Z
    K -- No --> L[(Save to Database)]
    L --> M([Show on Dashboard])
```

---

## LLM Fallback Strategy

Every agent marked **LLM** above runs through this safety net internally:

```mermaid
flowchart TD
    A([Agent Calls LLM]) --> B[Call Gemini Primary]
    B --> C{Response Valid JSON?}
    C -- Yes --> G([Return Result])
    C -- No --> D[Send Error Back to Gemini to Self-Repair]
    D --> E{Fixed?}
    E -- Yes --> G
    E -- No --> F[Switch to OpenAI Fallback]
    F --> G
```

---

## Data Transformation

```mermaid
stateDiagram-v2
    [*] --> RawPost
    RawPost --> RawSignal : Relevance Confirmed
    RawSignal --> ExtractedFields : Title and Pain Points
    ExtractedFields --> DraftCard : Sector and User Type
    DraftCard --> ScoredCard : Opportunity Score Added
    ScoredCard --> EnrichedCard : AI Solutions Added
    EnrichedCard --> [*] : Saved to Database
```

---

## Agent Reference

| Agent | File | Input | Output |
|---|---|---|---|
| Fetchers | `agents/fetchers/*.py` | SourceConfig | RawPost |
| Discovery | `agents/discovery.py` | RawPost list | RawSignal list |
| Extraction | `agents/extraction.py` | RawSignal | ExtractedFields |
| Classification | `agents/classification.py` | ExtractedFields | DraftCard |
| Scoring | `agents/scoring.py` | DraftCard | ScoredCard |
| Enrichment | `agents/enrichment.py` | ScoredCard | EnrichedCard |
| Dedup | `agents/dedup.py` | EnrichedCard | FinalCard |
