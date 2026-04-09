<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

smoke_assert(
    resolve_runtime_data_dir('/var/www/html/qms-data', QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR . '/qms-data') === QMS_TEST_DATA_DIR,
    'Legacy qms-data env path should not override initialized mom/data runtime.'
);

smoke_assert(scan_cat_from_subfolder('Quality Manual') === 'MAN', 'Quality Manual folder must map to MAN.');
smoke_assert(scan_cat_from_subfolder('Work Instructions') === 'WI', 'Work Instructions folder must map to WI.');
smoke_assert(scan_cat_from_subfolder('System Ops') === 'TRN', 'System Ops folder must map to TRN.');
smoke_assert(
    portal_normalize_streamed_doc_url(
        'mom/docs/operations/references/06-ANNEX-600/annex-603-quality-package-levels-qpl.html',
        '../../../assets/style.css'
    ) === '/assets/style.css',
    'Inline doc CSS should resolve to the root assets path.'
);
smoke_assert(
    portal_normalize_streamed_doc_url(
        'mom/docs/operations/references/06-ANNEX-600/annex-603-quality-package-levels-qpl.html',
        '../../../mom/portal.html'
    ) === '/mom/portal.html',
    'Portal shell link should resolve to the canonical MOM portal path.'
);
smoke_assert(
    portal_normalize_streamed_doc_url(
        'mom/docs/operations/references/06-ANNEX-600/annex-603-quality-package-levels-qpl.html',
        '../../02-Work-Instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'
    ) === '/mom/docs/operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html',
    'Legacy WI cross-links should resolve to the new operations/work-instructions path.'
);
smoke_assert(
    portal_normalize_streamed_doc_url(
        'mom/docs/training/templates/trainee-workbook.html',
        '../01-Competency-System/01-Framework/competency-metrics.html'
    ) === '/mom/docs/training/competency/01-Framework/competency-metrics.html',
    'Legacy training competency links should resolve to the new training/competency path.'
);

$sampleHtml = '<link rel="stylesheet" href="../../../assets/style.css"><a href="../../../mom/portal.html">Portal</a>';
$rewrittenSample = portal_rewrite_streamed_html(
    $sampleHtml,
    'mom/docs/operations/references/06-ANNEX-600/annex-603-quality-package-levels-qpl.html'
);
smoke_assert(str_contains($rewrittenSample, 'href="/assets/style.css"'), 'Rewritten HTML should expose root-relative stylesheet links.');
smoke_assert(str_contains($rewrittenSample, 'href="/mom/portal.html"'), 'Rewritten HTML should expose root-relative portal links.');

$liveRoots = [
    'MAN' => 'mom/docs/system/quality-manual',
    'POL' => 'mom/docs/system/policies',
    'ORG' => 'mom/docs/system/organization',
    'SOP' => 'mom/docs/operations/sops',
    'WI' => 'mom/docs/operations/work-instructions',
    'ANNEX' => 'mom/docs/operations/references',
    'FRM' => 'mom/docs/forms',
    'TRN' => 'mom/docs/training',
];

foreach ($liveRoots as $cat => $expectedRoot) {
    smoke_assert(default_folder_for_cat($cat, QMS_TEST_ROOT_DIR) === $expectedRoot, $cat . ' should resolve to the live MOM category root.');
    $absRoot = QMS_TEST_ROOT_DIR . '/' . $expectedRoot;
    smoke_assert(is_dir($absRoot), $cat . ' live root must exist: ' . $expectedRoot);

    $count = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($absRoot, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $entry) {
        if (!$entry->isFile()) {
            continue;
        }
        if (!portal_is_supported_doc_file_name($entry->getFilename())) {
            continue;
        }
        $count++;
    }
    smoke_assert($count > 0, $cat . ' live root should contain at least one supported document.');
}

$tmpRoot = sys_get_temp_dir() . '/mom-doc-layout-' . bin2hex(random_bytes(6));

try {
    @mkdir($tmpRoot . '/02-Tai-Lieu-He-Thong/01-Quality-Manual', 0775, true);
    @mkdir($tmpRoot . '/02-Tai-Lieu-He-Thong/02-Policies-Objectives', 0775, true);
    @mkdir($tmpRoot . '/02-Tai-Lieu-He-Thong/03-Organization', 0775, true);
    @mkdir($tmpRoot . '/03-Tai-Lieu-Van-Hanh/01-SOPs', 0775, true);
    @mkdir($tmpRoot . '/03-Tai-Lieu-Van-Hanh/02-Work-Instructions', 0775, true);
    @mkdir($tmpRoot . '/03-Tai-Lieu-Van-Hanh/03-Reference', 0775, true);
    @mkdir($tmpRoot . '/04-Bieu-Mau', 0775, true);
    @mkdir($tmpRoot . '/10-Training-Academy', 0775, true);

    smoke_assert(default_folder_for_cat('MAN', $tmpRoot) === '02-Tai-Lieu-He-Thong/01-Quality-Manual', 'MAN should fall back to legacy system manual root.');
    smoke_assert(default_folder_for_cat('POL', $tmpRoot) === '02-Tai-Lieu-He-Thong/02-Policies-Objectives', 'POL should fall back to legacy policy root.');
    smoke_assert(default_folder_for_cat('ORG', $tmpRoot) === '02-Tai-Lieu-He-Thong/03-Organization', 'ORG should fall back to legacy organization root.');
    smoke_assert(default_folder_for_cat('SOP', $tmpRoot) === '03-Tai-Lieu-Van-Hanh/01-SOPs', 'SOP should fall back to legacy SOP root.');
    smoke_assert(default_folder_for_cat('WI', $tmpRoot) === '03-Tai-Lieu-Van-Hanh/02-Work-Instructions', 'WI should fall back to legacy WI root.');
    smoke_assert(default_folder_for_cat('ANNEX', $tmpRoot) === '03-Tai-Lieu-Van-Hanh/03-Reference', 'ANNEX should fall back to legacy reference root.');
    smoke_assert(default_folder_for_cat('FRM', $tmpRoot) === '04-Bieu-Mau', 'FRM should fall back to legacy forms root.');
    smoke_assert(default_folder_for_cat('TRN', $tmpRoot) === '10-Training-Academy', 'TRN should fall back to legacy training root.');
} finally {
    if (is_dir($tmpRoot)) {
        rrmdir($tmpRoot);
    }
}

echo "document portal layout compatibility smoke passed\n";
