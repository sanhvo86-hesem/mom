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
 * What this script verifies (ANNEX-121 G0→G7 gate matrix)
 * ───────────────────────────────────────────────────────
 *   1. The matrix has exactly 15 columns
 *      (G, CDR, Hoạt động, 11 role columns, FRM/SOP).
 *   2. Every data row has exactly one Accountable (A) — accountability cannot
 *      be shared or absent.
 *   3. Every data row has at least one Responsible (R).
 *   4. Every RACI cell holds only A / R / C / I (or is blank).
 *   5. Every CDR code used in ANNEX-121 exists as an id="cdr-XX" anchor in
 *      ANNEX-120 (authority register) — no orphan CDR codes.
 *   6. The support-function supplement table uses only MNT / FIN role codes
 *      (EHS is a first-class column in the main matrix, not a supplement role).
 *
 * Exit code: 0 = clean, 1 = at least one P0 finding (blocks deploy).
 */

$base    = dirname(__DIR__, 2);                 // -> repo .../mom
$annex121 = $base.'/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html';
$annex120 = $base.'/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html';

$ROLE_COLS   = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
$VALID_LETTERS = ['A','R','C','I',''];

$p0 = [];   // blocking findings
$p1 = [];   // warnings

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

function cellText(DOMNode $node): string {
    return trim(preg_replace('/\s+/u', ' ', $node->textContent));
}

/* ── Load ANNEX-120 CDR anchor set ─────────────────────────────────────────── */
$cdrKnown = [];
if (preg_match_all('/id="cdr-([A-F][0-9])"/', file_get_contents($annex120), $m)) {
    $cdrKnown = array_flip($m[1]);
}
if (!$cdrKnown) {
    $p0[] = "ANNEX-120: no id=\"cdr-XX\" anchors found — cannot validate CDR codes.";
}

/* ── Locate and validate the ANNEX-121 G0→G7 gate matrix ───────────────────── */
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
if ($gateTable === null) {
    $p0[] = "ANNEX-121: G0→G7 gate matrix not found (thead missing expected role codes).";
} else {
    // header column count
    $hrow = $gateTable->getElementsByTagName('thead')->item(0)->getElementsByTagName('tr')->item(0);
    $ths  = $hrow->getElementsByTagName('th');
    if ($ths->length !== 15) {
        $p0[] = "ANNEX-121: gate matrix header has {$ths->length} columns, expected 15.";
    }

    $tbody = $gateTable->getElementsByTagName('tbody')->item(0);
    $rows  = $tbody->getElementsByTagName('tr');
    $rowCount = 0;
    $cdrUsed  = [];
    foreach ($rows as $tr) {
        $tds = [];
        foreach ($tr->childNodes as $c) {
            if ($c->nodeType === XML_ELEMENT_NODE && strtolower($c->nodeName) === 'td') {
                $tds[] = $c;
            }
        }
        if (count($tds) === 0) { continue; }
        $rowCount++;
        $gate = cellText($tds[0]);
        $cdr  = cellText($tds[1]);
        $label = "$gate/$cdr";

        if (count($tds) !== 15) {
            $p0[] = "ANNEX-121 row $label: has ".count($tds)." cells, expected 15.";
            continue;
        }
        // role cells = indexes 3..13
        $letters = [];
        for ($i = 3; $i <= 13; $i++) {
            $v = strtoupper(cellText($tds[$i]));
            if (!in_array($v, ['A','R','C','I',''], true)) {
                $p0[] = "ANNEX-121 row $label: invalid RACI letter '".cellText($tds[$i])."' in column ".($i-2).".";
            }
            $letters[] = $v;
        }
        $aCount = count(array_filter($letters, fn($x) => $x === 'A'));
        $rCount = count(array_filter($letters, fn($x) => $x === 'R'));
        if ($aCount !== 1) {
            $p0[] = "ANNEX-121 row $label: has $aCount Accountable (A), expected exactly 1.";
        }
        if ($rCount < 1) {
            $p0[] = "ANNEX-121 row $label: has no Responsible (R).";
        }
        if ($cdr !== '') {
            $cdrUsed[$cdr] = true;
            if ($cdrKnown && !isset($cdrKnown[$cdr])) {
                $p0[] = "ANNEX-121 row $label: CDR code '$cdr' has no id=\"cdr-$cdr\" anchor in ANNEX-120.";
            }
        }
    }
    if ($rowCount < 1) {
        $p0[] = "ANNEX-121: gate matrix tbody has no data rows.";
    }
    echo "  gate matrix: $rowCount rows, ".count($cdrUsed)." distinct CDR codes\n";
}

/* ── Validate the support-function supplement table ────────────────────────── */
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
    $tbody = $supTable->getElementsByTagName('tbody')->item(0);
    $n = 0;
    foreach ($tbody->getElementsByTagName('tr') as $tr) {
        $tds = $tr->getElementsByTagName('td');
        if ($tds->length < 5) { continue; }
        $n++;
        $role   = cellText($tds->item(3));
        $letter = strtoupper(cellText($tds->item(4)));
        if (!in_array($role, ['MNT','FIN'], true)) {
            $p1[] = "ANNEX-121 supplement row $n: role '$role' should be MNT or FIN (EHS is a main-matrix column).";
        }
        if (!in_array($letter, ['A','R','C','I'], true)) {
            $p1[] = "ANNEX-121 supplement row $n: invalid RACI letter '$letter'.";
        }
    }
    echo "  support supplement: $n rows\n";
}

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
