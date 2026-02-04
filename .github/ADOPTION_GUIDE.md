# ADOPTION_GUIDE: v1.2 Migration for Teams

Transitioning agents and teams from v1.1 to v1.2.

---

## Executive Summary

v1.2 adds **4 critical safeguards** (confidence thresholds, cost tracking, authority rules, HUMMBL context) with **no breaking changes**. Teams can deploy immediately.

| Risk Addressed | v1.1 State | v1.2 Mitigation |
|---|---|---|
| Overconfident decisions | ❌ | Confidence thresholds (0.90 / 0.95) |
| Expensive API calls | ❌ | Cost tracking + $2.50 warning, $10 halt |
| Authority ambiguity | Vague | Explicit decision tree |
| HUMMBL blindness | Partial | HCC v2.0, SITREP, startup gates |

**Immediate action:** Update v1.1 → v1.2 in all staging agents. Run 6 validation tests. Deploy to production after sign-off.

---

## Part 1: Migration Path (v1.1 → v1.2)

### Step 1: Update System Prompt

Replace your `system_prompt.json` or prompt file with v1.2:

```bash
# Backup current v1.1
cp system_prompt.json system_prompt.json.v1.1.bak

# Deploy v1.2
cp HUMMBL-UNIFIED-v1.2.json system_prompt.json

# Or if using environment variable:
export HUMMBL_PROMPT_VERSION=v1.2
```

**Verification:**
```bash
# Confirm v1.2 loaded
grep '"version": "HUMMBL-UNIFIED-v1.2"' system_prompt.json
# Expected output: "version": "HUMMBL-UNIFIED-v1.2"
```

### Step 2: No Code Changes Required

v1.2 is **backward compatible**. Existing agent code continues to work.

**What changes behaviorally:**
- Agents now ask clarifying questions if confidence < 0.90
- Agents track API costs and warn at $2.50
- Agents apply HUMMBL-specific patterns automatically
- Agents use SITREP format for critical decisions

**What doesn't change:**
- Core reasoning logic
- Tool interfaces
- Output formats (unless explicitly calling SITREP)
- Test suites (no new dependencies)

### Step 3: Update Team Practices

**For Copilot / Claude users:**

| Old Pattern (v1.1) | New Pattern (v1.2) | Why |
|---|---|---|
| "Just proceed with your best guess" | Agent asks for clarification if <90% confident | Prevents $5–20 wasted API calls |
| No cost tracking | Cost warnings displayed before high-spend ops | Enables budget visibility |
| Generic reasoning | HUMMBL-specific (HCC v2.0, Base120 context) | Correct domain pattern recognition |
| "Never ask questions" | "Ask if below confidence threshold" | Balances speed with accuracy |

### Step 4: Communication Checklist

**Inform stakeholders:**
```
[ ] Engineering team: v1.2 deployed to staging
[ ] Operations: Cost tracking now enabled (warnings at $2.50)
[ ] Product: HUMMBL patterns now recognized automatically
[ ] Security: Authority thresholds enforced
[ ] Finance: API spend visibility enabled
```

---

## Part 2: Key Behavioral Changes

### Change 1: Confidence Thresholds

**When this applies:**
- Agent receives ambiguous request
- Confidence score falls below 0.90 (or 0.95 for critical ops)

**v1.1 Behavior:**
```
User: "Update the relationships."
Agent: [Guesses which relationships, makes 15 API calls, costs $12]
```

**v1.2 Behavior:**
```
User: "Update the relationships."
Agent: "Confidence 0.88 (below 0.90 threshold). 
        Clarifying: Which model relationships? 
        Options: (a) HUMMBL core, (b) satellite models, (c) all relationships."
User: "HUMMBL core."
Agent: [Proceeds with clarity, makes 5 API calls, costs $4]
```

**Team Impact:**
- Expect occasional clarification requests
- Provide clearer requests upfront to avoid rounds
- Cost savings from fewer wrong guesses

**Opt-out:** Not recommended. Override only with explicit user approval.

---

### Change 2: Cost Awareness & Optimization

**When this applies:**
- Any operation estimated to cost ≥ $1.00

**v1.1 Behavior:**
```
Task: Analyze 50 documents
Agent: [Uses Opus for all docs] 
Cost: $20 (50 × $0.40/doc)
```

**v1.2 Behavior:**
```
Task: Analyze 50 documents
Agent: "Estimated cost: $2.50 (using Haiku for reasoning).
        Cost at warning threshold. Proceeding with optimization."
Cost: $2.50 (50 × $0.05/doc, Haiku not Opus)
```

**Model Selection in v1.2:**
- **Haiku 4.5:** Reasoning, analysis, decomposition (cheapest)
- **Sonnet 4.5:** Synthesis, composition, complex workflows
- **Opus 4.5:** Strategic decisions, novel problems only

**Team Impact:**
- Expect 80–90% cost reduction on routine tasks
- Agent proposes cheaper models automatically
- Approval required if cost > $10.00

**Budgeting:**
```
Old budget (v1.1): $20–30/day (unoptimized)
New budget (v1.2): $2–5/day (optimized)
Savings: ~75%
```

---

### Change 3: Authority & Safety Thresholds

**When this applies:**
- Ambiguous user intent
- High-impact operations (data deletion, deployment)
- Cost exceeds warning threshold

**v1.1 Behavior:**
```
Authority rule: "user_unless_unsafe" (undefined)
Result: Ambiguity, inconsistent enforcement
```

**v1.2 Behavior:**
```
Authority rule (explicit):
- override_user: ["data_deletion", "credential_exposure", "destructive_deploy"]
- consult_user: ["ambiguous_intent", "high_impact", "cost > $2.50"]
- follow_user: ["stylistic", "preference"]

Result: Clear decision tree, consistent enforcement
```

**Team Impact:**
- Agent will **ask before** destructive actions (not after)
- Agent will consult if ambiguous (prevents wrong guesses)
- Agent will defer to user on style/preference

**Example:**
```
User: "Delete the old relationships."
Agent (v1.2): "Data deletion requested. Requires explicit approval.
               Delete all relationships? Yes/No"
```

---

### Change 4: HUMMBL Domain Recognition

**When this applies:**
- Architecture decisions
- Model selection
- Strategy documentation
- Any Base120 context

**v1.1 Behavior:**
```
User: "Design a Base120 transformation pipeline."
Agent: [Uses generic AI reasoning, no HCC knowledge]
```

**v1.2 Behavior:**
```
User: "Design a Base120 transformation pipeline."
Agent: [Applies HCC v2.0 composition: T₁∘T₂∘...∘Tₙ]
Agent: [Uses correct operators: P→IN→CO→DE→RE→SY]
Agent: [Validates density ≥ 60%]
Agent: [Applies HUMMBL branding, ownership context]
```

**Team Impact:**
- HUMMBL-specific requests handled correctly
- No manual translation to domain language needed
- Output automatically in correct format

---

## Part 3: Common Scenarios

### Scenario A: Cost Optimization

**User Request:**
```
"Analyze 100 HUMMBL documents for compliance patterns."
```

**v1.2 Agent Behavior:**
```
Estimated cost: $5.00
Model selection: Haiku (reasoning), Sonnet (synthesis)
Cost warning: "At $2.50 warning threshold. Optimized to save 80%."
Proceed? [Waits for approval if cost > $10]
```

**Best Practice:**
- Approve cost-optimized operations automatically
- Only halt if estimate exceeds $10.00
- Review cost logs weekly

---

### Scenario B: Ambiguous Architecture Request

**User Request:**
```
"Update our model relationships."
```

**v1.2 Agent Behavior:**
```
Confidence: 0.75 (below 0.90 threshold)
Clarification:
- Which relationships? (core / satellite / all)
- Which models? (specific list)
- Transformation type? (add / update / delete)
```

**Best Practice:**
- Provide specific context upfront
- Use HUMMBL model names (not generic "models")
- Avoid ambiguous verbs ("update" → "add 3 new relationships")

---

### Scenario C: Multi-Agent Handoff

**User Request (L3 Strategic Decision):**
```
"Design the security architecture for Phase 1."
```

**v1.2 Agent Behavior:**
```
SITUATION: Security architecture required for Phase 1
ACTIONS: Escalating to specialized agent (Claude)
DECISIONS: Handoff criteria met (strategic decision, specialized)
BLOCKERS: Awaiting specialist confirmation

[Waits for confirmation before proceeding]
```

**Best Practice:**
- Expect SITREP format for critical decisions
- Confirmation from both agents required
- No silent handoffs

---

### Scenario D: Startup Verification

**User Action: New Session**

**v1.2 Agent Behavior (Automatic):**
```
Executing startup protocol...
✅ Production gates verified
✅ Phase 0 blockers checked
✅ Launch readiness validated (Jan 1, 2026)
Ready to proceed.
```

**Best Practice:**
- Sessions start with automatic gate checks
- If any gate fails, agent reports it explicitly
- Never silent failures

---

## Part 4: Troubleshooting

### Issue: Agent asks too many clarification questions

**Root cause:** Confidence threshold too high (0.90) for your use case

**Solution:**
- Option A: Provide more context in requests (preferred)
- Option B: Adjust confidence threshold in prompt (not recommended)
- Example: "Update HUMMBL core relationships: add 3 P operators to HCC v2.0"

### Issue: Cost warnings appear but task completes anyway

**Root cause:** Normal behavior. Cost warnings are informational below $10.00 halt threshold.

**Solution:**
- Review cost logs regularly
- If costs exceed $10.00, halt is enforced (agent asks approval)
- Use cost warnings to optimize over time

### Issue: Agent not recognizing HUMMBL context

**Root cause:** Prompt not updated to v1.2

**Solution:**
```bash
# Verify v1.2 loaded
grep "HUMMBL-UNIFIED-v1.2" <your-prompt-file>

# If v1.1, update:
cp HUMMBL-UNIFIED-v1.2.json <your-prompt-file>
```

### Issue: Multi-agent handoff failing silently

**Root cause:** Post-handoff verification not implemented

**Solution:**
- Update to v1.2 (includes post-handoff checkpoint)
- Test with VALIDATION_SUITE.md, Test 3

---

## Part 5: Rollback Plan

If v1.2 causes issues, rollback is simple:

```bash
# Revert to v1.1
cp system_prompt.json.v1.1.bak system_prompt.json
export HUMMBL_PROMPT_VERSION=v1.1

# Notify team
# Investigate issue
# Re-deploy v1.2 with fix
```

**No data loss, no downtime.**

---

## Part 6: Success Metrics

Track these metrics post-deployment:

| Metric | Baseline (v1.1) | Target (v1.2) | Owner |
|---|---|---|---|
| API cost/day | $20–30 | $2–5 | Finance |
| Clarifications/session | 0 | 1–2 (expected) | Eng |
| Wrong decisions/month | 3–5 | <1 | Eng |
| Multi-agent silent failures | 1–2/month | 0 | Ops |
| Knowledge graph mutations failing | 2–3/month | 0 | Ops |

**Review after 2 weeks:**
- If cost < $5/day: ✅ Excellent
- If clarifications < 2/session: ✅ Good
- If zero data corruption: ✅ Safe
- If rollback zero times: ✅ Stable

---

## Part 7: Quick Reference

**v1.2 Confidence Thresholds:**
```
General operations: 0.90 (ask if below)
Critical operations: 0.95 (halt if below)
Override: Explicit user approval only
```

**v1.2 Cost Thresholds:**
```
Tracking enabled: All operations
Warning level: $2.50
Halt level: $10.00
Optimization: Haiku > Sonnet > Opus (prefer cheaper)
```

**v1.2 Authority:**
```
Override user: Data deletion, credentials, destructive ops
Consult user: Ambiguous, high-impact, cost warnings
Follow user: Style, preference
```

**v1.2 HUMMBL Patterns:**
```
HCC v2.0 operators: P, IN, CO, DE, RE, SY
Composition: T₁∘T₂∘...∘Tₙ = Artifact
Density: ≥ 60% artifact (not scaffolding)
Branding: HUMMBL, Base120 (not NEXUS)
```

---

## Next Steps

1. **Deploy to staging:** `cp HUMMBL-UNIFIED-v1.2.json staging/`
2. **Run validation tests:** `npm run test:v1.2 --env=staging`
3. **Wait for all 6 tests to pass**
4. **Deploy to production:** Merge to main
5. **Monitor metrics:** Track cost, clarifications, errors
6. **Iterate:** Adjust thresholds based on team feedback

---

**Questions?** See [PROMPT_CHANGELOG.md](PROMPT_CHANGELOG.md) for audit details or [VALIDATION_SUITE.md](VALIDATION_SUITE.md) for test definitions.
