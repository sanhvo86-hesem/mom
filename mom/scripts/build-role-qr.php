<?php
declare(strict_types=1);

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Writer;

require dirname(__DIR__) . '/vendor/autoload.php';

$momRoot = dirname(__DIR__);
$mapPath = $momRoot . '/data/config/deploy/role-card-qr-map.json';
$qrDir = $momRoot . '/assets/qr';
$offlineDir = $momRoot . '/offline';
$mainPortalUrl = '/mom/portal.html';

$expectedMap = [
    'WI-105-CARD-OPERATOR-CNC' => '/mom/offline/operator-cnc/index.html',
    'WI-105-CARD-SETTER' => '/mom/offline/setter/index.html',
    'WI-105-CARD-QC-INSPECTOR' => '/mom/offline/qc/index.html',
    'WI-105-CARD-PLANNER' => '/mom/offline/planner/index.html',
    'WI-105-CARD-LEADER' => '/mom/offline/leader/index.html',
];

$bundles = [
    'WI-105-CARD-OPERATOR-CNC' => [
        'role' => 'operator-cnc',
        'title' => 'Người vận hành CNC',
        'summary' => 'Dùng khi người vận hành cần mở nhanh tài liệu chạy máy, kiểm trước ca và mẫu đầu.',
        'evidence' => 'Hồ sơ lệnh sản xuất số và Nhật ký IPQC.',
        'documents' => [
            ['code' => 'SOP-502', 'label' => 'Vận hành CNC', 'path' => 'docs/operations/sops/05-SOP-500/sop-502-cnc-machining-operations.html'],
            ['code' => 'WI-519', 'label' => 'Kiểm trước chạy', 'path' => 'docs/operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'],
            ['code' => 'WI-302', 'label' => 'Mẫu đầu FAI', 'path' => 'docs/operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'],
        ],
    ],
    'WI-105-CARD-SETTER' => [
        'role' => 'setter',
        'title' => 'Người cài đặt máy',
        'summary' => 'Dùng khi người cài đặt máy cần kiểm phát hành chương trình, phiếu cài đặt và mẫu đầu.',
        'evidence' => 'Phiếu cài đặt máy đã ký và Danh sách dao cụ.',
        'documents' => [
            ['code' => 'SOP-504', 'label' => 'Cài đặt máy', 'path' => 'docs/operations/sops/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html'],
            ['code' => 'WI-519', 'label' => 'Kiểm trước chạy', 'path' => 'docs/operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'],
            ['code' => 'WI-302', 'label' => 'Mẫu đầu FAI', 'path' => 'docs/operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'],
        ],
    ],
    'WI-105-CARD-QC-INSPECTOR' => [
        'role' => 'qc',
        'title' => 'QC kiểm tra',
        'summary' => 'Dùng khi QC cần mở nhanh kiểm cuối, lấy mẫu và cổng chất lượng.',
        'evidence' => 'Hồ sơ chất lượng, CoC và ảnh đóng gói.',
        'documents' => [
            ['code' => 'SOP-605', 'label' => 'Kiểm cuối', 'path' => 'docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html'],
            ['code' => 'SOP-603', 'label' => 'Lấy mẫu', 'path' => 'docs/operations/sops/06-SOP-600/sop-603-aql-sampling-inspection.html'],
            ['code' => 'WI-201', 'label' => 'Cổng chất lượng', 'path' => 'docs/operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'],
        ],
    ],
    'WI-105-CARD-PLANNER' => [
        'role' => 'planner',
        'title' => 'Điều độ sản xuất',
        'summary' => 'Dùng khi điều độ cần mở nhanh kế hoạch, điều phối WIP và kiểm hồ sơ trước khi chạy.',
        'evidence' => 'Sổ điều độ ngày và Bảng phân ca.',
        'documents' => [
            ['code' => 'SOP-501', 'label' => 'Kế hoạch', 'path' => 'docs/operations/sops/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html'],
            ['code' => 'WI-501', 'label' => 'Điều phối', 'path' => 'docs/operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html'],
            ['code' => 'WI-519', 'label' => 'Kiểm hồ sơ', 'path' => 'docs/operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'],
        ],
    ],
    'WI-105-CARD-LEADER' => [
        'role' => 'leader',
        'title' => 'Tổ trưởng',
        'summary' => 'Dùng khi tổ trưởng cần mở nhanh giao ban, điều phối ca và vận hành CNC.',
        'evidence' => 'Sổ giao ca và Sổ sự cố ca.',
        'documents' => [
            ['code' => 'WI-202', 'label' => 'Giao ban', 'path' => 'docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html'],
            ['code' => 'WI-501', 'label' => 'Điều phối', 'path' => 'docs/operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html'],
            ['code' => 'SOP-502', 'label' => 'Vận hành CNC', 'path' => 'docs/operations/sops/05-SOP-500/sop-502-cnc-machining-operations.html'],
        ],
    ],
];

$map = readJsonMap($mapPath);
if ($map !== $expectedMap) {
    fail('role-card-qr-map.json must match the closed WI-105 QR mapping.');
}

ensureDir($qrDir);
ensureDir($offlineDir);

$renderer = new GDLibRenderer(240, 4, 'png', 9);
$writer = new Writer($renderer);
$portalQrDataUri = 'data:image/png;base64,' . base64_encode(
    $writer->writeString($mainPortalUrl, 'UTF-8', ErrorCorrectionLevel::H())
);

foreach ($expectedMap as $docCode => $url) {
    $bundle = $bundles[$docCode] ?? null;
    if (!is_array($bundle)) {
        fail("Missing offline bundle for {$docCode}.");
    }

    $role = (string)$bundle['role'];
    $pngPath = $qrDir . '/' . $role . '.png';
    $writer->writeFile($url, $pngPath, 'UTF-8', ErrorCorrectionLevel::H());
    assertPng($pngPath, 240, 240);

    $roleOfflineDir = $offlineDir . '/' . $role;
    ensureDir($roleOfflineDir);
    file_put_contents(
        $roleOfflineDir . '/index.html',
        renderOfflinePage($docCode, $url, $bundle, $mainPortalUrl, $portalQrDataUri, $momRoot)
    );

    echo "{$docCode} -> {$url} -> assets/qr/{$role}.png\n";
}

/**
 * @return array<string,string>
 */
function readJsonMap(string $path): array
{
    if (!is_file($path)) {
        fail("Missing map file: {$path}");
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        fail("Cannot read map file: {$path}");
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('role-card-qr-map.json is not a JSON object.');
    }

    $out = [];
    foreach ($data as $docCode => $url) {
        if (!is_string($docCode) || !is_string($url)) {
            fail('role-card-qr-map.json must map document code strings to URL strings.');
        }
        $out[$docCode] = $url;
    }
    return $out;
}

function renderOfflinePage(
    string $docCode,
    string $offlineUrl,
    array $bundle,
    string $mainPortalUrl,
    string $portalQrDataUri,
    string $momRoot
): string {
    $title = h((string)$bundle['title']);
    $summary = h((string)$bundle['summary']);
    $evidence = h((string)$bundle['evidence']);
    $docItems = '';

    foreach ($bundle['documents'] as $document) {
        if (!is_array($document)) {
            fail("Invalid document entry for {$docCode}.");
        }
        $path = (string)$document['path'];
        if (!is_file($momRoot . '/' . $path)) {
            fail("Missing source document for {$docCode}: {$path}");
        }
        $href = '../../' . $path;
        $docItems .= '<a class="doc" href="' . h($href) . '"><strong>' . h((string)$document['code']) . '</strong><span>' . h((string)$document['label']) . '</span></a>';
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{$docCode} - Bộ dự phòng offline | HESEM MOM</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,"Helvetica Neue",sans-serif;color:#101828;background:#f4f7f8}.page{max-width:900px;margin:0 auto;padding:24px}.panel{background:#fff;border:1px solid #cfd7df;border-radius:8px;padding:18px;margin:0 0 14px}h1{font-size:28px;margin:0 0 8px;color:#12324a}h2{font-size:18px;margin:0 0 12px;color:#12324a}.meta{font-weight:700;color:#475467}.docs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.doc{display:block;border:2px solid #12324a;border-radius:6px;padding:14px 10px;text-align:center;text-decoration:none;color:#12324a;background:#f8fbff}.doc strong{display:block;font-size:20px}.doc span{display:block;margin-top:4px;font-weight:700}.contacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.contact{border:1px solid #98a2b3;border-radius:6px;padding:12px}.contact b{display:block;margin-bottom:6px}.phone{font-size:20px;font-weight:800;letter-spacing:.05em}.qr-row{display:flex;gap:18px;align-items:center}.qr{width:128px;height:128px;image-rendering:pixelated;border:6px solid #fff;box-shadow:0 0 0 1px #101828}.small{font-size:13px;color:#475467}.note{font-weight:700}@media print{@page{size:A4 portrait;margin:8mm}body{background:#fff}.page{padding:0}.panel{break-inside:avoid;border-color:#111;margin-bottom:8px}.doc{border-color:#111;color:#111}.qr{width:34mm;height:34mm;box-shadow:0 0 0 1px #111}.small{color:#111}}
</style>
</head>
<body>
<main class="page">
<section class="panel">
<div class="meta">{$docCode}</div>
<h1>Bộ dự phòng offline - {$title}</h1>
<p>{$summary}</p>
<p class="small">URL offline của thẻ: {$offlineUrl}</p>
</section>
<section class="panel">
<h2>3 SOP/WI mở trước</h2>
<div class="docs">{$docItems}</div>
<p class="small">Ca trưởng in trước 3 tài liệu này và đặt trong phong bì giấy khi mạng gián đoạn.</p>
</section>
<section class="panel">
<h2>Bằng chứng cần giữ</h2>
<p class="note">{$evidence}</p>
</section>
<section class="panel">
<h2>Sơ đồ liên hệ 3 số</h2>
<div class="contacts">
<div class="contact"><b>Người dẫn dắt</b><div class="phone">____</div></div>
<div class="contact"><b>Quản đốc</b><div class="phone">____</div></div>
<div class="contact"><b>Trực kỹ thuật</b><div class="phone">____</div></div>
</div>
</section>
<section class="panel">
<h2>Khi mạng phục hồi</h2>
<div class="qr-row"><img class="qr" src="{$portalQrDataUri}" alt="QR cổng chính"><div><p class="note">Quét QR này để quay lại cổng chính.</p><p><a href="{$mainPortalUrl}">{$mainPortalUrl}</a></p></div></div>
</section>
</main>
</body>
</html>
HTML;
}

function ensureDir(string $dir): void
{
    if (is_dir($dir)) {
        return;
    }
    if (!mkdir($dir, 0775, true) && !is_dir($dir)) {
        fail("Cannot create directory: {$dir}");
    }
}

function assertPng(string $path, int $width, int $height): void
{
    $info = getimagesize($path);
    if ($info === false || $info[0] !== $width || $info[1] !== $height || ($info['mime'] ?? '') !== 'image/png') {
        fail("Generated QR is not {$width}x{$height} PNG: {$path}");
    }
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function fail(string $message): never
{
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}
