#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * RACI Integrity Checker
 * ────────────────────────────────────────────────────────────────────────────
 * RACI-MASTER-MATRIX (raci-master-matrix.html) is the single source of truth
 * (SSOT) for RACI across the QMS. Its G0→G7 gate matrix is hand-maintained and
 * referenced/duplicated by ANNEX-120, the 04-RACI-Authority summary pages, ~37
 * SOP "Vai trò & RACI" sections and ~39 JD "Giao diện — RACI" sections. Manual
 * editing of a wide table silently breaks RACI invariants. This script catches
 * those breaks before deploy.
 *
 * P0 findings (block deploy)
 * ──────────────────────────
 *   1. The G0→G7 matrix has exactly 16 columns (gate, CDR, activity,
 *      12 role columns, FRM/SOP).
 *   2. Every data row has exactly one Accountable (A).
 *   3. Every data row has at least one Responsible (R).
 *   4. Every RACI cell holds only A / R / C / I (or blank).
 *   5. Every CDR code used in RACI-MASTER-MATRIX has an id="cdr-XX" anchor in ANNEX-120.
 *   6. In the §4 / §6 tables the Accountable (A) cell names exactly one
 *      role and is never a role bundle (a bundle cannot be Accountable).
 *
 * P1 findings (warn, do not block)
 * ────────────────────────────────
 *   6. Support-function supplement uses only MNT / FIN role codes.
 *   7. Cross-check: the primary Responsible role recorded for each CDR in
 *      ANNEX-120 should appear as A or R for that CDR in RACI-MASTER-MATRIX (sub-roles
 *      are alias-mapped to their column, e.g. PE/ENGM/CAM→ENG, BUY→SCM,
 *      ITA/ESA→HR/IT). No whitelist — every CDR must reconcile.
 *
 * Exit code: 0 = clean (warnings allowed), 1 = at least one P0 finding.
 */

$base     = dirname(__DIR__, 2);                 // -> repo .../mom
$annex121 = $base.'/docs/system/organization/04-RACI-Authority/raci-master-matrix.html';
// AUTHORITY-MATRIX (formerly ANNEX-120) — unified decision register with id="cdr-XX" anchors.
$annex120 = $base.'/docs/system/organization/04-RACI-Authority/authority-matrix.html';

$ROLE_COLS = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR','IT'];
// Sub-role → RACI-column alias map. Authoritative source: ROLE-AND-DEPARTMENT-
// BUNDLES §6. Keep this in sync with that table.
$ALIAS     = ['PE'=>'ENG','ENGM'=>'ENG','CAM'=>'ENG','DFM'=>'ENG',
              'BUY'=>'SCM','XNK'=>'SCM','ITA'=>'IT','ESA'=>'IT',
              'QCL'=>'QA','QC'=>'QA','QE'=>'QA','SL'=>'WKM','SET'=>'WKM','OPR'=>'WKM'];
$R_SEMANTICS_WHITELIST = [];             // no exceptions — F1/F2 realigned to IT=R

$p0 = [];
$p1 = [];

function loadDoc(string $path): DOMDocument {
    if (!is_file($path)) {
        fwrite(STDERR, "ERROR: file not found: $path\n");
        exit(2);
    }
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">'.file_get_contents($path));
    libxml_clear_errors();
    return $doc;
}
function cellText(DOMNode $n): string {
    return trim(preg_replace('/\s+/u', ' ', $n->textContent));
}
function tdChildren(DOMNode $tr): array {
    $out = [];
    foreach ($tr->childNodes as $c) {
        if ($c->nodeType === XML_ELEMENT_NODE && strtolower($c->nodeName) === 'td') {
            $out[] = $c;
        }
    }
    return $out;
}
/** True if the row carries content outside any <td>/<th> (malformed markup). */
function rowStray(DOMNode $tr): bool {
    foreach ($tr->childNodes as $c) {
        if ($c->nodeType === XML_ELEMENT_NODE) {
            $nn = strtolower($c->nodeName);
            if ($nn !== 'td' && $nn !== 'th') { return true; }
        } elseif ($c->nodeType === XML_TEXT_NODE && trim($c->textContent) !== '') {
            return true;
        }
    }
    return false;
}
function findTableByHead(DOMDocument $doc, array $needles): ?DOMElement {
    foreach ($doc->getElementsByTagName('table') as $tbl) {
        $th = $tbl->getElementsByTagName('thead');
        if ($th->length === 0) { continue; }
        $h = $th->item(0)->textContent;
        foreach ($needles as $n) { if (!str_contains($h, $n)) { continue 2; } }
        return $tbl;
    }
    return null;
}

/* ── ANNEX-120: CDR anchor set + primary R-role per CDR ────────────────────── */
$doc120   = loadDoc($annex120);
$cdrKnown = [];
$cdr120R  = [];
foreach ($doc120->getElementsByTagName('tr') as $tr) {
    $id = $tr->getAttribute('id');
    if (!str_starts_with($id, 'cdr-')) { continue; }
    $code = substr($id, 4);
    $cdrKnown[$code] = true;
    $tds = tdChildren($tr);
    if (count($tds) >= 7) {
        $cdr120R[$code] = cellText($tds[6]);   // the "R" column
    }
}
if (!$cdrKnown) {
    $p0[] = "ANNEX-120: no id=\"cdr-XX\" anchors found.";
}

/* ── RACI-MASTER-MATRIX G0→G7 gate matrix ───────────────────────────────────────────── */
$doc = loadDoc($annex121);
$gateTable = null;
foreach ($doc->getElementsByTagName('table') as $tbl) {
    $theads = $tbl->getElementsByTagName('thead');
    if ($theads->length === 0) { continue; }
    $h = $theads->item(0)->textContent;
    if (str_contains($h,'CDR') && str_contains($h,'WKM') && str_contains($h,'QA')
        && str_contains($h,'SCM') && str_contains($h,'CEO') && str_contains($h,'EHS')) {
        $gateTable = $tbl;
        break;
    }
}
$gateRACI = [];   // cdr => list of [gate, aRoles[], rRoles[]]
if ($gateTable === null) {
    $p0[] = "RACI-MASTER-MATRIX: G0→G7 gate matrix not found.";
} else {
    $ths = $gateTable->getElementsByTagName('thead')->item(0)
                     ->getElementsByTagName('tr')->item(0)
                     ->getElementsByTagName('th');
    if ($ths->length !== 16) {
        $p0[] = "RACI-MASTER-MATRIX: gate matrix header has {$ths->length} columns, expected 16.";
    }
    $rowCount = 0;
    foreach ($gateTable->getElementsByTagName('tbody')->item(0)
                       ->getElementsByTagName('tr') as $tr) {
        $tds = tdChildren($tr);
        if (count($tds) === 0) { continue; }
        $rowCount++;
        $gate = cellText($tds[0]);
        $cdr  = cellText($tds[1]);
        $label = "$gate/$cdr";
        if (rowStray($tr)) {
            $p0[] = "RACI-MASTER-MATRIX row $label: stray content outside a <td> (malformed row).";
        }
        if (count($tds) !== 16) {
            $p0[] = "RACI-MASTER-MATRIX row $label: ".count($tds)." cells, expected 16.";
            continue;
        }
        $aRoles = $rRoles = [];
        for ($i = 3; $i <= 14; $i++) {
            $v = strtoupper(cellText($tds[$i]));
            $role = $GLOBALS['ROLE_COLS'][$i - 3];
            if (!in_array($v, ['A','R','C','I',''], true)) {
                $p0[] = "RACI-MASTER-MATRIX row $label: invalid letter '".cellText($tds[$i])."' in '$role'.";
            }
            if ($v === 'A') { $aRoles[] = $role; }
            if ($v === 'R') { $rRoles[] = $role; }
        }
        if (count($aRoles) !== 1) {
            $p0[] = "RACI-MASTER-MATRIX row $label: ".count($aRoles)." Accountable (A), expected exactly 1.";
        }
        if (count($rRoles) < 1) {
            $p0[] = "RACI-MASTER-MATRIX row $label: no Responsible (R).";
        }
        if ($cdr !== '') {
            if ($cdrKnown && !isset($cdrKnown[$cdr])) {
                $p0[] = "RACI-MASTER-MATRIX row $label: CDR '$cdr' has no id=\"cdr-$cdr\" in ANNEX-120.";
            }
            $gateRACI[$cdr][] = [$gate, $aRoles, $rRoles];
        }
    }
    echo "  gate matrix: $rowCount rows, ".count($gateRACI)." distinct CDR codes\n";
}

/* ── Support-function supplement table ─────────────────────────────────────── */
$supTable = null;
foreach ($doc->getElementsByTagName('table') as $tbl) {
    $theads = $tbl->getElementsByTagName('thead');
    if ($theads->length === 0) { continue; }
    $h = $theads->item(0)->textContent;
    if (str_contains($h,'Vai trò hỗ trợ') && str_contains($h,'Lý do tham gia')) {
        $supTable = $tbl;
        break;
    }
}
if ($supTable === null) {
    $p1[] = "RACI-MASTER-MATRIX: support-function supplement table not found.";
} else {
    $n = 0;
    foreach ($supTable->getElementsByTagName('tbody')->item(0)
                      ->getElementsByTagName('tr') as $tr) {
        $tds = $tr->getElementsByTagName('td');
        if ($tds->length < 5) { continue; }
        $n++;
        $role   = cellText($tds->item(3));
        $letter = strtoupper(cellText($tds->item(4)));
        if (!in_array($role, ['MNT','FIN'], true)) {
            $p1[] = "RACI-MASTER-MATRIX supplement row $n: role '$role' should be MNT or FIN.";
        }
        if (!in_array($letter, ['A','R','C','I'], true)) {
            $p1[] = "RACI-MASTER-MATRIX supplement row $n: invalid letter '$letter'.";
        }
    }
    echo "  support supplement: $n rows\n";
}

/* ── §4 value-stream RACI + §6 document-level RACI integrity ──────────────── */
foreach ([['§4 value-stream RACI', ['Hoạt động ngang','Bằng chứng'], 5],
          ['§6 document-level RACI', ['Tài liệu','Người dùng chính'], 6]] as $spec) {
    [$name, $needles, $ncol] = $spec;
    $tbl = findTableByHead($doc, $needles);
    if ($tbl === null) { $p1[] = "RACI-MASTER-MATRIX: $name table not found."; continue; }
    $rn = 0;
    foreach ($tbl->getElementsByTagName('tbody')->item(0)->getElementsByTagName('tr') as $tr) {
        $tds = tdChildren($tr);
        if (count($tds) === 0) { continue; }
        $rn++;
        if (rowStray($tr)) {
            $p0[] = "RACI-MASTER-MATRIX $name row $rn: stray content outside a <td> (malformed row).";
        }
        if (count($tds) !== $ncol) {
            $p0[] = "RACI-MASTER-MATRIX $name row $rn: ".count($tds)." cells, expected $ncol.";
            continue;
        }
        if (cellText($tds[1]) === '') { $p0[] = "RACI-MASTER-MATRIX $name row $rn: empty Accountable (A)."; }
        if (cellText($tds[2]) === '') { $p0[] = "RACI-MASTER-MATRIX $name row $rn: empty Responsible (R)."; }
        // The Accountable cell must name exactly one role and never a
        // role bundle — under RACI a bundle/committee cannot be 'A'.
        $aCell = $tds[1];
        $aHtml = (string)$doc->saveHTML($aCell);
        $aLinks = $aCell->getElementsByTagName('a')->length;
        if (str_contains($aHtml, 'bundle')) {
            $p0[] = "RACI-MASTER-MATRIX $name row $rn: Accountable (A) is a role bundle — A must be a single role.";
        } elseif ($aLinks > 1) {
            $p0[] = "RACI-MASTER-MATRIX $name row $rn: Accountable (A) names $aLinks roles — A must be exactly one.";
        }
    }
    echo "  $name: $rn rows\n";
}

/* ── Cross-check: ANNEX-120 primary R-role vs RACI-MASTER-MATRIX A∪R ───────────────── */
$xMiss = 0;
foreach ($gateRACI as $cdr => $occurrences) {
    if (!isset($cdr120R[$cdr])) { continue; }
    if (in_array($cdr, $R_SEMANTICS_WHITELIST, true)) { continue; }
    $r120 = $cdr120R[$cdr];
    $mapped = $ALIAS[$r120] ?? $r120;
    foreach ($occurrences as [$gate, $aRoles, $rRoles]) {
        $present = array_merge($aRoles, $rRoles);
        if ($mapped !== '' && !in_array($mapped, $present, true)) {
            $p1[] = "Cross-check $gate/$cdr: ANNEX-120 R-role '$r120' (→$mapped) "
                  . "not found as A or R in RACI-MASTER-MATRIX [A=".implode(',',$aRoles)
                  . " R=".implode(',',$rRoles)."].";
            $xMiss++;
        }
    }
}
echo "  ANNEX-120↔121 cross-check: $xMiss advisory mismatch(es)\n";

/* ── Report ────────────────────────────────────────────────────────────────── */
echo "\n";
foreach ($p1 as $w) { echo "  WARN (P1): $w\n"; }
if ($p0) {
    foreach ($p0 as $e) { echo "  FAIL (P0): $e\n"; }
    echo "\nRACI integrity check FAILED: ".count($p0)." P0 finding(s).\n";
    exit(1);
}
echo "\nRACI integrity check PASSED".($p1 ? " with ".count($p1)." warning(s)" : "").".\n";
exit(0);
