#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * RACI Integrity Checker
 * ────────────────────────────────────────────────────────────────────────────
 * ANNEX-121 (annex-121-raci-master-matrix.html) is the single source of truth
 * (SSOT) for RACI across the QMS. Its G0→G7 gate matrix is hand-maintained and
 * referenced/duplicated by ANNEX-120, the 04-RACI-Authority summary pages, ~37
 * SOP "Vai trò & RACI" sections and ~39 JD "Giao diện — RACI" sections. Manual
 * editing of a wide table silently breaks RACI invariants. This script catches
 * those breaks before deploy.
 *
 * P0 findings (block deploy)
 * ──────────────────────────
 *   1. The G0→G7 matrix has exactly 15 columns.
 *   2. Every data row has exactly one Accountable (A).
 *   3. Every data row has at least one Responsible (R).
 *   4. Every RACI cell holds only A / R / C / I (or blank).
 *   5. Every CDR code used in ANNEX-121 has an id="cdr-XX" anchor in ANNEX-120.
 *
 * P1 findings (warn, do not block)
 * ────────────────────────────────
 *   6. Support-function supplement uses only MNT / FIN role codes.
 *   7. Cross-check: the primary Responsible role recorded for each CDR in
 *      ANNEX-120 should appear as A or R for that CDR in ANNEX-121 (sub-roles
 *      are alias-mapped to their column, e.g. PE/ENGM/CAM→ENG, BUY→SCM,
 *      ITA/ESA→HR/IT). F1/F2 are whitelisted: ANNEX-121 deliberately records
 *      the originating role as R there (see ANNEX-121 §2 R-semantics rule).
 *
 * Exit code: 0 = clean (warnings allowed), 1 = at least one P0 finding.
 */

$base     = dirname(__DIR__, 2);                 // -> repo .../mom
$annex121 = $base.'/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html';
$annex120 = $base.'/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html';

$ROLE_COLS = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
$ALIAS     = ['PE'=>'ENG','ENGM'=>'ENG','CAM'=>'ENG','DFM'=>'ENG','BUY'=>'SCM',
              'ITA'=>'HR/IT','ESA'=>'HR/IT','QCL'=>'QA','QC'=>'QA'];
$R_SEMANTICS_WHITELIST = ['F1','F2'];   // documented R-as-originator cases

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

/* ── ANNEX-121 G0→G7 gate matrix ───────────────────────────────────────────── */
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
    $p0[] = "ANNEX-121: G0→G7 gate matrix not found.";
} else {
    $ths = $gateTable->getElementsByTagName('thead')->item(0)
                     ->getElementsByTagName('tr')->item(0)
                     ->getElementsByTagName('th');
    if ($ths->length !== 15) {
        $p0[] = "ANNEX-121: gate matrix header has {$ths->length} columns, expected 15.";
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
        if (count($tds) !== 15) {
            $p0[] = "ANNEX-121 row $label: ".count($tds)." cells, expected 15.";
            continue;
        }
        $aRoles = $rRoles = [];
        for ($i = 3; $i <= 13; $i++) {
            $v = strtoupper(cellText($tds[$i]));
            $role = $GLOBALS['ROLE_COLS'][$i - 3];
            if (!in_array($v, ['A','R','C','I',''], true)) {
                $p0[] = "ANNEX-121 row $label: invalid letter '".cellText($tds[$i])."' in '$role'.";
            }
            if ($v === 'A') { $aRoles[] = $role; }
            if ($v === 'R') { $rRoles[] = $role; }
        }
        if (count($aRoles) !== 1) {
            $p0[] = "ANNEX-121 row $label: ".count($aRoles)." Accountable (A), expected exactly 1.";
        }
        if (count($rRoles) < 1) {
            $p0[] = "ANNEX-121 row $label: no Responsible (R).";
        }
        if ($cdr !== '') {
            if ($cdrKnown && !isset($cdrKnown[$cdr])) {
                $p0[] = "ANNEX-121 row $label: CDR '$cdr' has no id=\"cdr-$cdr\" in ANNEX-120.";
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
    $p1[] = "ANNEX-121: support-function supplement table not found.";
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
            $p1[] = "ANNEX-121 supplement row $n: role '$role' should be MNT or FIN.";
        }
        if (!in_array($letter, ['A','R','C','I'], true)) {
            $p1[] = "ANNEX-121 supplement row $n: invalid letter '$letter'.";
        }
    }
    echo "  support supplement: $n rows\n";
}

/* ── Cross-check: ANNEX-120 primary R-role vs ANNEX-121 A∪R ───────────────── */
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
                  . "not found as A or R in ANNEX-121 [A=".implode(',',$aRoles)
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
