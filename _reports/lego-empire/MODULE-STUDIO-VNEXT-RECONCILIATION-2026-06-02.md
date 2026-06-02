# Module Studio vNext — Reconciliation with GPT Pro (critique + merged decision)
**Date:** 2026-06-02 · Inputs: our MSV2 plan (FOUNDATION-STANDARDS + MSV2-1/2/3) and
GPT Pro's `HESEM_MODULE_STUDIO_VNEXT_PARALLEL_PROMPTS_2026-06-02.md`. This is the answer
to send back to GPT Pro + the canonical reconciled plan our 3 prompts now follow.

## Verdict in one line
GPT Pro's plan is **stronger on information architecture and governance discipline** and
we ADOPT most of it. It is **weaker/over-reaching on backend proliferation, the OpenAPI
mandate, and the "rip Giao diện into Module Studio" move**, and it **missed that the
surface-registry enabler already shipped (v0.7)** — which removes its hidden P1→P2/P3
sequential dependency. Net: we converge on GPT Pro's 6-tab IA + 4-mode + rich preset +
Validate-as-evidence + Reference-as-Playbook, corrected by our Foundation (three-tier
tokens) and three concrete de-risking changes.

## A. Where GPT Pro is RIGHT — ADOPTED (these revise our MSV2 plan)
1. **6 top-level tabs: `Lego | Modules | Presets | Settings | Governance | Reference`.**
   Better than our 5 (we had kept `Theme` as a tab and left Governance in the separate
   Giao diện admin). Renaming Theme→**Presets**, folding Tokens into Lego L0, and pulling
   **Governance into Module Studio as a peer tab** gives one coherent operating model.
   ADOPTED.
2. **Mode strip `Browse | Assemble | Author | Validate`** (was our 2-mode Browse/Edit).
   GPT Pro is right that *Assemble* (edit module **content/instance**) and *Author* (edit
   **registry definitions** L2/L3/L4) are DIFFERENT write paths and must be distinct modes
   — this is itself an SSOT point. ADOPTED.
3. **"Validate" replaces "Mô phỏng" but KEEPS the evidence purpose.** Better than our
   "remove simulate." The GraphicsAuthority flow is literally stage→simulate→commit→
   publish→rollback, so simulation IS governed evidence. Renaming to Validate (WCAG +
   no-hardcode + preview scene + backend-binding + impact → `graphics_simulation_run` /
   `graphics_qa_gate_run` evidence) gives it a real role. ADOPTED.
4. **Rich preset editor with lineage + modes + impact + version + DTCG export.** GPT Pro's
   16 groups extend our §6: add identity & **lineage (base_ref)**, **supported modes**
   (light/dark/high-contrast/print), **impact analysis**, **release/audit metadata**,
   **DTCG export**. The `graphics_theme_preset` table already has `base_ref`, `status`,
   `scope_type`, `overrides` — GPT Pro uses them better. ADOPTED.
5. **Reference = generated Authority Playbook** (authority map, level model, standards→
   gates, anti-patterns, decision log, troubleshooting) — and **move WCAG/contrast into
   Governance/Validate as evidence**. This is a genuinely better "đập đi xây lại" than our
   "QA dashboard." ADOPTED.
6. **Backend discipline**: RFC 9457 Problem Details error shape, CSRF, permission, audit
   on mutation, optimistic lock (baseVersion), rollback path, contract test. ADOPTED.
7. **Stop rules / acceptance gates** (no duplicated write path, no hidden authority, no
   localStorage authority, no uncontracted API, no raw style in module content, no
   validation without evidence). ADOPTED — they sharpen our Definition of Done.
8. **Module create wizard + metadata/content split**, **archive fix via `state.includeDeleted`**.
   Same as ours; GPT Pro's field list (authority class, owner, intended use) is richer.
   ADOPTED.

## B. Where GPT Pro is WRONG / RISKY — CORRECTED (our critique)
1. **It missed that the surface registry already shipped (v0.7, PR #170).**
   `window.MStudio.registerSurface(key, def)` + `window.MStudio.api` are LIVE; built-in
   surfaces are fallbacks. GPT Pro's P1 "rebuild the shell + add loader" and its admission
   that "P1 shell may show placeholders until P2 registers" reveal a **sequential P1→P2/P3
   dependency that no longer exists**. **Correction:** keep the shipped registry. P1 only
   does the *light* IA relabel (SURFACE_META → 6 tabs, hide `theme`/`tokens` top-level,
   internal redirect theme→presets, tokens→lego) + Modules. P2/P3 register their surfaces
   from their OWN files and need not wait for P1. This makes all 3 **truly parallel**.
2. **Backend endpoint proliferation — REJECTED in part.** GPT Pro proposes
   `module_schema_metadata_save` + `module_schema_content_save` as separate endpoints.
   **Correction:** a module is ONE `module_schema` record; the two edit buttons edit two
   DISJOINT HALVES of it and save the whole via the existing `module_schema_save`
   (+ baseVersion optimistic lock). Splitting the backend write doubles the authority and
   breaks the single optimistic-lock — exactly the SSOT violation we're fixing. The split
   is **UI-only**. (Our Foundation §5 already states this.)
3. **OpenAPI 3.1.1 mandate — SOFTENED.** HESEM's API is action-based (`index.php?action=`),
   not OpenAPI-described; retrofitting OpenAPI across 89 controllers is a separate
   initiative, not a blocker for this UI work. **Correction:** NEW/changed endpoints must
   ship a machine-readable **contract (JSON schema in `mom/contracts/`, which the repo
   already uses) + RFC 9457 errors + audit + optimistic lock**. Full OpenAPI is aspirational
   (note it as a backlog item), never a merge blocker for the UI.
4. **"Dismantle Giao diện into Module Studio" — STAGED, not big-bang.** The Giao diện
   `templates/governance/advanced` is LIVE authority machinery (publish/stage/canary/apply/
   rollback with backend attestation). **Correction:** the Governance tab in Module Studio
   must **reuse the existing governance/templates/advanced renderers** (the same proven
   absorb-by-reuse technique we used for Module Master in v0.6), NOT a from-scratch rebuild.
   Retire the separate Giao diện admin only AFTER the Governance tab is verified to host
   everything. Don't rip live promote/rollback authority.
5. **"Mẫu bố cục → Lego L4/L5" — SPLIT it correctly.** Archetype *definitions* (zones,
   allowed/forbidden blocks) → Lego **L4 Author**. The *promotion lifecycle* (publish/
   stage/canary/apply/rollback of templates) is **Governance**, not Lego. GPT Pro conflated
   them. Keep the lifecycle in Governance.
6. **Scope realism — PHASE it.** GPT Pro's plan is very large (6 tabs, 16-group editor,
   8-step wizard, full Validate evidence suite, Governance consolidation, Playbook,
   backend contracts). **Correction:** each prompt ships a **vNext v1** (the must-haves)
   and lists the rest as an explicit backlog in its report, rather than over-running. A
   solid create *modal* counts; it need not literally be 8 wizard steps on day one.
7. **localStorage — clarify, not alarm.** Our current theme persistence (Phase A) uses
   localStorage `o3-theme` strictly as a **preview cache**; the authority is the backend
   org design config via `_moduleMasterStore.persist`. This already satisfies GPT Pro's
   "no localStorage authority" rule. We keep it; we do NOT introduce localStorage as
   committed authority anywhere.

## C. Reconciled architecture (final)
Top-level: `🧱 Lego | 📦 Modules | 🎭 Presets | ⚙️ Settings | 🛡️ Governance | 📖 Reference`.
- **Tokens** → Lego L0 (split L0a Primitive / L0b Semantic — Foundation §1).
- **Theme / Theme Template** → retired; concept = **Presets** (token-override bundles) +
  **Settings** (Mode/Typography/Motion/Density-control policy, org-level).
- **Lego modes:** Browse | Assemble | Author | Validate.
- **Governance** (Module Studio tab, reuse existing renderers): rollout/canary/rollback,
  compliance, audit, waivers, release blockers, impact, **WCAG/contrast evidence**.
- **Reference:** generated Authority Playbook (read-only).
- Three-tier tokens + semantic layer mandatory (Foundation). Preset edits T2 semantic +
  brand seed only. One module_schema record, two-half UI edit, one save path.

## D. Reconciled 3-prompt split (on the shipped registry; truly parallel)
We align to GPT Pro's branch names + file ownership (cleaner than our first split),
corrected per §B. Each owns distinct files; none edits another's; P2/P3 register surfaces
via the live registry without waiting for P1.
- **vNext-P1** `codex/mstudio-vnext-p1-shell-modules-20260602` — owns
  `32-module-studio.js` + `mom/portal.html`: 6-tab IA relabel (registry SURFACE_META;
  hide theme/tokens top-level + internal redirects), Modules rich-create modal + metadata/
  content split + **archive `state.includeDeleted` fix** + Validate row action (advisory
  via `module_schema_validate_bindings`). Adds the 3 `<script>` tags for 32a/32b/32c.
- **vNext-P2** `codex/mstudio-vnext-p2-presets-settings-20260602` — owns
  `32a-mstudio-presets-settings.js` (+ `00d` retire, + `mom/contracts/*.schema.json` if a
  new shape; backend only if an endpoint is genuinely missing, RFC 9457 + audit + lock):
  **Presets** library (rich 16-group editor, lineage, modes, validate, impact, apply org-
  wide via Phase-A authority, DTCG export, builtin-protected) + **Settings** (Mode/Typo/
  Motion/Density-control policy → backend token authority, localStorage=cache only).
  Edits SEMANTIC (T2) tokens only.
- **vNext-P3** `codex/mstudio-vnext-p3-lego-governance-reference-20260602` — owns
  `32b-mstudio-lego-workbench.js` + `32c-mstudio-governance-reference.js`
  (+ `00c-admin-appearance-module-sample.js` re-level-tag, + `module.build-packet.schema.json`):
  **Lego** L0–L5 workbench (L0 token tiers, dependency-graph nav, interactive preview),
  Browse/Assemble/Author/Validate, rich L3/L4 Author editors (slots/variant_axes/
  required_tokens/a11y_contract/preview_scene); **Governance** tab (reuse existing
  templates/governance/advanced renderers, de-dup rollout); **Reference** Authority
  Playbook (WCAG evidence lives in Governance/Validate). Archetype defs→L4 Author;
  promotion→Governance.

## E. Coordination & gates (all 3)
- Read `MODULE-STUDIO-V2-FOUNDATION-STANDARDS-2026-06-02.md` (normative) FIRST.
- Standard gate + GPT Pro's stop rules + our Definition of Done: zero console errors,
  every button Chrome-tested via code, full backend round-trip, SSOT grep proof, no
  hardcode, restore org theme after destructive tests, exec report + final decision phrase.
- Merge order when done: P1 (shell) → P2, P3 (register into it). Then THIS session runs the
  merge-coordinator verification (GPT Pro's §6 checklist + our DoD).

## F. Answer to GPT Pro (short)
"Agreed on the 6-tab IA, Browse/Assemble/Author/Validate, the rich preset editor with
lineage/modes/impact/DTCG, Reference-as-Playbook, RFC 9457, and the stop rules — adopted.
Three corrections: (1) the surface registry already shipped (v0.7), so drop the P1→P2/P3
dependency and register surfaces from each session's own file — the three are now truly
parallel; (2) keep ONE `module_schema_save` (the metadata/content split is UI-only; do not
add separate save endpoints — that re-creates the dual-authority we're removing); (3)
OpenAPI is aspirational for an action-based API — require JSON-schema contracts +
RFC 9457 + audit + optimistic lock for new endpoints instead, and absorb Giao diện into the
Governance tab by REUSING the live renderers (staged), not a from-scratch rebuild of the
promote/rollback authority. Also: enforce the three-tier token model (primitive→semantic→
component) with the semantic layer mandatory — a preset edits the semantic tier + brand
seed only (DTCG 2025.10; Spotify's no-semantic-layer rebrand failure)."
