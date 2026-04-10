# Judge Modes

Decern supports two judge modes, configured per workspace via `workspace_policies.judge_mode`.

## `advisory` (default)

The LLM Judge runs and contributes to the gate verdict alongside deterministic checks.

- If the Judge says "block" and the workspace has `judge_blocking=true`, the gate blocks.
- If the Judge says "block" but the workspace has `judge_blocking=false` (or is on Free plan), the gate warns but does not block.
- Deterministic check failures always block, regardless of Judge outcome.

**Trade-off**: Catches subtle misalignment that pattern-based rules miss. Higher recall, but the LLM is non-deterministic — the same diff may produce different verdicts on re-run.

**Best for**: Teams that want maximum coverage and accept that LLM verdicts are probabilistic. Suitable for most engineering organizations.

## `deterministic_only`

The LLM Judge still runs but its output is **recorded as advisory only**. The gate verdict is computed solely from deterministic checks (path denylist, dependency denylist, regex rules, file type denylist, size threshold).

- If all deterministic checks pass, the verdict is `pass` — even if the Judge says "block".
- The Judge's opinion is still recorded in the `judge_invocation` field for transparency and audit trail.
- If no deterministic checks are configured on the decision, the gate always passes (there is nothing to enforce deterministically).

**Trade-off**: Every block is reproducible and explainable with zero ambiguity. However, deterministic checks catch a narrower range of issues — they cannot assess semantic alignment (e.g., "does this code actually implement the decision?").

**Best for**: Teams in strictly regulated industries (finance, healthcare, defense) where audit standards require that enforcement decisions are fully deterministic and reproducible. Provides evidence for:
- **EU AI Act Art. 14**: Human oversight measures are fully deterministic; the AI component (Judge) is explicitly advisory.
- **ISO/IEC 42001 Annex A**: AI system outputs are logged but do not drive automated enforcement without human-defined deterministic rules.
- **SOC 2 CC8.1**: Change management controls are deterministic and reproducible.

## Comparison

| Aspect | `advisory` | `deterministic_only` |
|--------|-----------|---------------------|
| LLM Judge runs | Yes | Yes |
| LLM can block gate | Yes (if judge_blocking=true) | No |
| LLM recorded in evidence | Yes | Yes (as advisory) |
| Deterministic checks can block | Yes | Yes |
| Verdict reproducibility | Probabilistic (LLM) | Fully deterministic |
| Coverage | Broad (semantic + pattern) | Narrow (pattern only) |
| False negatives | Lower | Higher |
| Audit defensibility for AI oversight | Good (LLM is logged with full metadata) | Maximum (enforcement is fully deterministic) |

## Configuration

Set `judge_mode` in workspace policies:
- Dashboard: Workspace Settings > Policies > Judge Mode
- API: `PATCH /api/workspace-policies` with `{ judge_mode: "deterministic_only" }`

The setting takes effect immediately for all subsequent gate runs in the workspace.
