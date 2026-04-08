# Editor Hardening Progress (2026-03-09)

## Scope of this cycle
- Deep hardening for QMS document editing reliability and safety.
- Stabilize source mode, paste pipeline, and save/submit pipeline.
- Increase Tiptap pilot command compatibility for core Word-like workflows.

## High-risk issues found
1. Source mode could overwrite `editor-area` and drop doc-shell structure (`.qms-doc` + `#docContent`).
2. Paste sanitizer used regex-only cleaning, leaving risk of event handlers / dangerous URLs in HTML attributes.
3. Save/submit pipeline could miss source-mode edits because content lived only in textarea (`#ed-source`).
4. Image URL sanitizer accepted broad `data:` when enabled (could allow non-image payload).
5. Math modal used shared command adapter for symbol insert, causing wrong insertion target under Tiptap mode.

## Fixes implemented
1. Added DOM-based HTML sanitizer utilities in editor core:
   - `_edSanitizeUrl`
   - `_edSanitizeCssSize`
   - `_edSanitizeInlineStyle`
   - `_edSanitizeHtmlFragment`
2. Replaced paste cleaning with structured sanitize flow:
   - strips dangerous tags/attributes
   - sanitizes `href/src`
   - falls back to safe plain-text paste if HTML is rejected
3. Source mode restore flow now:
   - sanitizes source HTML
   - restores into `#docContent` in doc-shell mode (keeps full shell)
   - shows warning toast when unsafe HTML is removed
4. Save/submit hardening in workflow actions:
   - added `_sanitizeEditorHtml` and `_getCurrentEditorInnerHtml`
   - all draft/save/submit paths now capture sanitized HTML, including source-mode edits
5. Image handling hardening:
   - restrict `data:` to image MIME only
   - sanitize uploaded Data URL before insertion
6. Math modal stability:
   - symbol insertion now targets local contenteditable safely (`_edInsertTextInEditable`)
   - preview and inserted math HTML are sanitized
7. Tiptap pilot improvements:
   - added `insertText` support in adapter
   - added `queryValue` for toolbar font/font-size synchronization

## Additional hardening update (same day)
1. Crash-recovery drafts:
   - added local recovery storage (`localStorage`) with TTL and size guard.
   - every editor autosave now syncs both session draft and recovery draft.
2. Recovery restore flow:
   - `startEdit()` now detects local recovery when session draft is missing.
   - user is prompted to restore/discard recovered content with timestamp.
3. Unload safety:
   - added `beforeunload`, `pagehide`, `visibilitychange` draft persistence.
   - reduces data loss on tab close, browser crash, or sudden navigation.
4. Navigation guard accuracy:
   - unsaved dialog now opens only when there are real unsaved edits.
   - if no pending changes, editor exits cleanly without unnecessary prompt.
5. Encoding/UI glyph cleanup:
   - removed remaining mojibake icon/glyph sequences in portal/editor modules.
   - normalized warning and toggle glyphs to safe escaped Unicode/html entities.
   - helps fix local Vietnamese display confusion caused by broken glyph text.

## Additional editor command stability pass
1. Core command behavior closer to Word:
   - improved `edInsertLink()` to preserve selected text and apply link mark directly when possible.
   - avoids replacing selection unexpectedly when users only input URL.
2. Tiptap pilot table command:
   - added native `insertTable` command support in adapter.
   - editor now inserts stable table nodes in Tiptap mode instead of raw HTML fallback.
3. Tiptap pilot line spacing:
   - added custom `lineHeight` extension + `lineSpacing` command bridge.
   - spacing dropdown now works in pilot mode (previously legacy-only).
4. Toolbar active-state sync:
   - extended active-state updates for superscript/subscript and paragraph alignment commands.
   - keeps toolbar state consistent after command execution.
5. Insert HTML safety:
   - adapter now sanitizes HTML before `insertHTML` in Tiptap mode via existing sanitizer pipeline.
6. UX polish:
   - restored list dropdown arrow glyphs (`▾`) in toolbar after encoding cleanup.

## Additional table-command deep pass
1. Refactor split for safer maintenance:
   - introduced dedicated command modules loaded after core:
     - `03-commands-link.js`
     - `03-commands-table.js`
     - `03-commands-layout.js`
   - keeps `03-editor-core.js` as stable base while enabling targeted fixes per command family.
2. Table merge/split reliability:
   - replaced sibling-based merge logic with table-grid mapping (`rowspan/colspan` aware).
   - merge right/down now validates cell alignment before merge to avoid table corruption.
   - split cell now recreates missing cells across covered rows/cols and preserves source cell style attributes.
3. Table tab behavior closer to Word:
   - `_edMoveTabInTable` now navigates by logical grid order, not raw DOM row children.
   - Tab in last cell appends a new row with style-cloned cells and moves caret to first new cell.
4. Tiptap-safe table fallbacks:
   - table merge/split commands avoid unsafe direct DOM mutation in pilot mode.
   - adapter now exposes `mergeCells` and `splitCell` command routing when available.
5. Layout module extraction:
   - moved line-spacing command into `03-commands-layout.js` with:
     - input normalization
     - multi-block selection application in legacy mode
     - Tiptap bridge via `lineSpacing` command.

## Table engine stabilization pass (next cycle)
1. Rebuilt table structural commands in `03-commands-table.js` with logical grid mapping:
   - `add/del row` and `add/del col` now handle `rowspan/colspan` coherently.
   - reduced risk of table corruption when editing merged-table layouts.
2. Merge/split hardening:
   - merge right/down keeps alignment validation before applying spans.
   - split preserves cell styling while recreating missing cells in covered rows.
3. Tab behavior in tables:
   - traversal now uses logical cell order.
   - Tab at last logical cell appends a new row (Word-like flow).
4. Extended table context menu:
   - added quick commands for header toggles, distribute rows/cols, autofit modes, and clear-cell.
   - keeps table maintenance operations available from one menu surface while editing.
5. Tiptap bridge extended for table commands:
   - added routing for `addRowBefore/addRowAfter/deleteRow`.
   - added routing for `addColumnBefore/addColumnAfter/deleteColumn`.
   - added routing for `toggleHeaderRow/toggleHeaderColumn`.
6. Added regression checklist items for merged-table edge cases:
   - `W-046A .. W-046F` in `editor-wordlike-test-checklist.md`.
7. Advanced table properties override:
   - table module now overrides `edTblProperties()` and `edApplyTblProps()` with expanded controls:
     - width, layout, alignment, autofit mode
     - border width/style/color
     - cell padding + border spacing
     - caption add/edit/remove
     - header row/col toggles
   - reduces dependence on legacy property dialog and improves consistency in merged-table scenarios.
8. Checklist expansion for table properties:
   - added `W-046G .. W-046J` to validate properties, border model, padding, and caption behavior.
9. Border/radius command override in table module:
   - `edTblBorderPicker`, `edApplyTblBorder`, `edApplyTblBorderColor` now run via module-level logic.
   - `edTblRadiusPicker` and `edApplyTblRadius` aligned with properties workflow to reduce style conflicts.

## Remaining priority backlog
1. Tiptap Phase 2:
   - migrate list-style dropdown behavior to native Tiptap extension logic.
   - implement richer table command parity (merge/split state sync).
2. Shape/Textbox/Chart migration strategy:
   - current pilot intentionally falls back to legacy for advanced widgets.
   - need node-schema strategy before full Tiptap migration.
3. Browser-based interactive regression:
   - execute full Word-like checklist and produce PASS/FAIL evidence CSV.

## Acceptance target for next cycle
- Zero open P0 in Word-like checklist.
- Full pass for security cases W-070..W-074.
- Stable save/submit behavior in both WYSIWYG and source mode.

## Global table auto-fit pass (2026-03-10)
1. Added global table policy in editor core:
   - `edTableApplyAutoPolicy(table, opts)`
   - `edApplyGlobalTablePolicy(root, opts)`
   - `edApplyGlobalTablePolicyToDocument(doc, opts)`
2. Policy behavior:
   - force table width to page (`width/max-width: 100%`)
   - convert to balanced columns via generated `<colgroup>` percentages
   - remove rigid per-cell `px` width/`nowrap` constraints
3. Runtime hooks:
   - view mode: `loadDocContent()` applies policy to iframe document after load
   - edit mode: `startEdit()` applies policy on editor activation
   - save/export: `edCleanHTML()`, `edNormalizeTablesForExport()`, and `buildFullDocHtmlFromIframe()` enforce policy before serialization
   - insert table: apply policy right after table insertion (legacy + tiptap paths)
4. Table command alignment:
   - context autofit (`window`) now uses core auto policy when available.
5. Full-document table audit artifact:
   - generated `01-QMS-Portal/docs/table-audit-2026-03-10.csv` for 230 files containing tables.
   - current static scan summary:
     - `DOC_FILES=234`
     - `FILES_WITH_TABLE=230`
     - `TOTAL_TABLES=528`
     - `TABLE_STYLE_WIDTH=0`
     - `TABLE_STYLE_WIDTH_PX=0`
     - `CELL_STYLE_WIDTH=243`
     - `TABLE_HAS_COLGROUP=19`
