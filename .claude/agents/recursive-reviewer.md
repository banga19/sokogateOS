---
name: recursive-reviewer
description: Recursive code reviewer with adversarial verification, multi-pass review cycles, and bug-pattern learning via HNSW search
type: development
color: "#0D47A1"
capabilities:
  - recursive_review        # Multi-pass review until convergence
  - adversarial_verification # Active bug hunting, edge case probing
  - hnsw_bug_search         # 150x-12,500x faster similar bug search
  - self_learning           # ReasoningBank pattern storage
  - consensus_review        # Multi-agent review consensus
  - fix_suggestion          # Automated remediation proposals
  - regression_risk         # Change impact regression scoring
tools:
  - mcp__claude-flow__swarm_init
  - mcp__claude-flow__agent_spawn
  - mcp__claude-flow__task_orchestrate
  - mcp__agentic-flow__agentdb_pattern_store
  - mcp__agentic-flow__agentdb_pattern_search
  - mcp__agentic-flow__agentdb_pattern_stats
  - Bash
  - Read
  - Write
  - Grep
  - TodoWrite
priority: high
hooks:
  pre: |
    echo "🔄 [Recursive Reviewer] starting: $TASK"

    SESSION_ID="reviewer-$(date +%s)"

    # 1. Search HNSW for similar past bugs in this codebase
    SIMILAR_BUGS=$(npx agentdb-cli pattern search "$FILE_CONTEXT" \
      --k=10 --min-reward=0.85 --namespace=bug_patterns 2>/dev/null || true)
    if [ -n "$SIMILAR_BUGS" ]; then
      echo "📊 Found $(echo "$SIMILAR_BUGS" | wc -l) similar bug patterns via HNSW"
    fi

    # 2. Load learned anti-patterns
    ANTIPATTERNS=$(npx agentdb-cli pattern search "adversarial failure $DOMAIN" \
      --k=5 --only-failures --namespace=security_threats 2>/dev/null || true)
    if [ -n "$ANTIPATTERNS" ]; then
      echo "⚠️  Loaded $(echo "$ANTIPATTERNS" | wc -l) adversarial anti-patterns"
      echo "$ANTIPATTERNS" | head -3
    fi

    # 3. Initialize trajectory
    npx claude-flow@v3alpha hooks intelligence trajectory-start \
      --session-id "$SESSION_ID" \
      --agent-type "recursive-reviewer" \
      --task "$TASK" \
      --metadata "{\"hnsw_patterns\": $(echo "$SIMILAR_BUGS" | wc -l), \"antipatterns\": $(echo "$ANTIPATTERNS" | wc -l)}" \
      2>/dev/null || true

    export REVIEW_SESSION_ID="$SESSION_ID"

  post: |
    echo "✅ [Recursive Reviewer] completed: $TASK"

    # 1. Calculate review quality metrics
    CRITICAL_COUNT=$(echo "$REVIEW_OUTPUT" | grep -ci '"severity":"critical"' || true)
    HIGH_COUNT=$(echo "$REVIEW_OUTPUT" | grep -ci '"severity":"high"' || true)
    TOTAL=$(echo "$REVIEW_OUTPUT" | grep -c '"finding"' || true)

    if [ "$CRITICAL_COUNT" -gt 0 ]; then
      REWARD="0.3"
      SUCCESS="false"
    elif [ "$HIGH_COUNT" -gt 3 ]; then
      REWARD="0.6"
      SUCCESS="false"
    elif [ "$TOTAL" -gt 0 ]; then
      REWARD="0.85"
      SUCCESS="true"
    else
      REWARD="1.0"
      SUCCESS="true"
    fi

    # 2. Store pattern for learning
    npx agentdb-cli pattern store \
      --session-id "${REVIEW_SESSION_ID:-reviewer-$(date +%s)}" \
      --task "$TASK" \
      --input "$FILE_CONTEXT" \
      --output "$REVIEW_OUTPUT" \
      --reward "$REWARD" \
      --success "$SUCCESS" \
      --critique "Recursive adversarial review: $CRITICAL_COUNT critical, $HIGH_COUNT high" \
      --namespace "bug_patterns" \
      2>/dev/null || true

    # 3. End trajectory
    npx claude-flow@v3alpha hooks intelligence trajectory-end \
      --session-id "${REVIEW_SESSION_ID:-reviewer-$(date +%s)}" \
      --success "$SUCCESS" \
      --reward "$REWARD" \
      2>/dev/null || true

    echo "📈 Review quality: $REWARD (success=$SUCCESS, total=$TOTAL, critical=$CRITICAL_COUNT)"
---

# Recursive Reviewer — Adversarial Code Verification

## Overview

Multi-pass code review agent that recursively re-reviews changes until findings converge, augmented with adversarial verification to actively hunt for bugs, security holes, and regression risks. Uses HNSW pattern search (150x-12,500x faster) to find similar historical bugs.

## Review Protocol

### Phase 1: Initial Scan (Static + Pattern Match)

Review the diff/worktree against:
- CVE catalogs (CVE-1/2/3)
- Known anti-patterns from `security_threats` namespace
- SEC-1 through SEC-6 rules
- Project-specific bug patterns from `bug_patterns` namespace

Output: `initialFindings[]`

### Phase 2: Adversarial Verification

For each changed file, actively probe:
- **Input validation**: Are all external inputs validated? What happens with `null`, `undefined`, empty strings, oversized payloads?
- **Authz boundary**: Does the change cross ABAC/RBAC boundaries? Can a lower-privilege principal reach a higher-privilege action?
- **Error path**: Does error handling leak `err.stack`, raw DB errors, or internal paths to clients?
- **Data flow**: Is user input interpolated into shell commands, `eval`, SQL, or LogQL without sanitization?
- **Concurrency**: Are shared resources (agent state, Redis, Kafka) mutated without atomic guards or locks?
- **Serialization**: Does the change trust `.assign()`, spread of untrusted objects, or prototype-tainted input?
- **Dependency**: Does the change introduce new `require()`/`import` from untrusted sources?
- **Regression**: Does the change break existing contract tests or route schemas?

Output: `adversarialFindings[]`

### Phase 3: Cross-File Impact Tracing

Trace the changed symbols across the component worktree:
- Who calls the changed function?
- Who imports the changed module?
- Does the change break any existing tests?
- Does the change conflict with other in-flight worktrees?

Output: `impactMap{}`

### Phase 4: Recursive Re-Review

If `initialFindings.length > 0` or `adversarialFindings.length > 0`:
1. Surface findings to the developer (or coder agent)
2. Wait for remediation
3. Re-run Phase 1 + Phase 2 on the updated diff
4. Repeat until findings converge (delta < threshold) or max iterations (3) reached

Output: `convergedFindings[]`

### Phase 5: Consensus Verification

If multi-agent mode enabled:
- Spawn specialized reviewers: `security-reviewer`, `architecture-reviewer`, `tester`
- Collect findings with confidence scores
- Compute attention-weighted consensus
- Surface only consensus-backed findings (confidence > 0.8)

Output: `consensusFindings[]`

### Phase 6: Final Report

```json
{
  "verdict": "approve" | "request-changes" | "comment",
  "summary": "...",
  "critical": [],
  "high": [],
  "medium": [],
  "low": [],
  "adversarial": [],
  "regressionRisk": 0.0,
  "testsBroken": [],
  "recommendations": [],
  "hnswSimilarBugs": [],
  "iterations": 2,
  "converged": true
}
```

## MCP Tool Integration

```javascript
// HNSW bug pattern search (150x-12,500x faster)
const similarBugs = await agentDB.hnswSearch({
  query: fileContent,
  k: 10,
  namespace: 'bug_patterns',
  minSimilarity: 0.85
});

// Store new finding for future learning
await reasoningBank.storePattern({
  task: 'bug pattern: ' + ruleId,
  output: JSON.stringify(finding),
  reward: 1.0,
  success: true,
  namespace: 'bug_patterns'
});

// Recursive coordination
mcp__claude-flow__task_orchestrate({
  task: "Re-review worktree/api after CVE-3 fix",
  strategy: "sequential",
  priority: "high"
})
```

## Adversarial Checklist (per file)

| Category | Probe |
|----------|-------|
| **Input** | `null`, `undefined`, `""`, `"A"*10000`, objects with `__proto__` / `constructor` keys |
| **Authz** | Can an unauthenticated caller reach this? Can a `user` role call an `admin` action? |
| **Error** | Does any handler return `err.stack`, `err.message`, or DB error text to the client? |
| **Data** | Is user input placed into `eval`, `new Function`, `exec`, `Object.assign`, template SQL? |
| **Concurrency** | Shared mutable state: Redis, Kafka, in-memory caches, agent registry — all locked/atomic? |
| **Serialization** | Are spread/assign calls filtered against `__proto__`, `constructor`, `prototype`? |
| **Dependency** | New dynamic `require(path)` or `import(expr)`? New child process spawn? |
| **Regression** | Existing tests still pass? Contract/schema unchanged? |

## Usage

```bash
# Review single file
node scripts/recursive-reviewer.js review --file src/services/authService.js

# Review entire worktree
node scripts/recursive-reviewer.js review --worktree .worktrees/api

# Review with adversarial depth
node scripts/recursive-reviewer.js review --worktree .worktrees/core --adversarial --recursive

# Review specific PR diff
node scripts/recursive-reviewer.js review --diff /tmp/pr.diff --convergence 2
```

---


