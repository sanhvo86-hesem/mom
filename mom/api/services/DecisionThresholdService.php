<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class DecisionThresholdService
{
    private const CONFIG_RELATIVE_PATH = 'config/decision_thresholds.json';

    /** @var array<string, string> */
    private const ROLE_LINKS = [
        'CEO'  => '01-JD-Executive/jd-chief-executive-officer.html',
        'PD'   => '01-JD-Executive/jd-production-director.html',
        'EST'  => '06-JD-Sales/jd-estimator.html',
        'CS'   => '06-JD-Sales/jd-customer-service.html',
        'BUY'  => '05-JD-Supply-Chain/jd-buyer-purchasing.html',
        'BUYER' => '05-JD-Supply-Chain/jd-buyer-purchasing.html',
        'SCM'  => '05-JD-Supply-Chain/jd-supply-chain-manager.html',
        'SL'   => '02-JD-Production/jd-shift-leader.html',
        'WKM'  => '02-JD-Production/jd-cnc-workshop-manager.html',
        'HR'   => '08-JD-HR/jd-hr-manager.html',
        'QA'   => '04-JD-Quality/jd-qa-manager.html',
        'QCL'  => '04-JD-Quality/jd-qc-inspector-lead.html',
        'ENGM' => '03-JD-Engineering/jd-engineering-lead-manager.html',
        'ESA'  => '10-JD-IT/jd-epicor-system-administrator.html',
        'PPL'  => '02-JD-Production/jd-production-planner.html',
    ];

    /** @var array<string, string> */
    private const SYSTEM_DOC_LINKS = [
        'ANNEX-120' => '../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html',
        'ANNEX-121' => '../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html',
        'ANNEX-123' => '../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html',
        'FRM-202'   => '../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx',
        'FRM-212'   => '../../../forms/frm-200-purchase/FRM-212_Customer_Change_Request.xlsx',
        'FRM-413'   => '../../../forms/frm-400-quality/FRM-413_HOLD_and_Disposition_Log.xlsx',
        'FRM-141'   => '../../../forms/frm-100-sales/FRM-141_IT_Access_Request_Change_Removal.xlsx',
        'FRM-504'   => '../../../forms/frm-500-production/FRM-504_Shift_Handover_Log.xlsx',
        'SOP-201'   => '../../../operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html',
        'SOP-401'   => '../../../operations/sops/04-SOP-400/sop-401-control-of-nonconforming-outputs.html',
        'SOP-503'   => '../../../operations/sops/05-SOP-500/sop-503-production-dispatch-and-control.html',
    ];

    /** @var array<string, string> */
    private const ANNEX_DOC_LINKS = [
        'ANNEX-120' => 'annex-120-authority-matrix.html',
        'ANNEX-121' => 'annex-121-raci-master-matrix.html',
        'ANNEX-123' => 'annex-123-deputy-backup-matrix.html',
        'FRM-202'   => '../../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx',
        'FRM-212'   => '../../../../forms/frm-200-purchase/FRM-212_Customer_Change_Request.xlsx',
        'FRM-413'   => '../../../../forms/frm-400-quality/FRM-413_HOLD_and_Disposition_Log.xlsx',
        'FRM-141'   => '../../../../forms/frm-100-sales/FRM-141_IT_Access_Request_Change_Removal.xlsx',
        'FRM-504'   => '../../../../forms/frm-500-production/FRM-504_Shift_Handover_Log.xlsx',
        'SOP-201'   => '../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html',
        'SOP-401'   => '../../../sops/04-SOP-400/sop-401-control-of-nonconforming-outputs.html',
        'SOP-503'   => '../../../sops/05-SOP-500/sop-503-production-dispatch-and-control.html',
    ];

    private string $rootDir;

    private string $dataDir;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->rootDir = rtrim($rootDir, '/');
        $this->dataDir = rtrim($dataDir, '/');
    }

    /**
     * @return array<string, mixed>
     */
    public function load(): array
    {
        $stored = FileHelper::readJson($this->configPath());
        $config = is_array($stored) ? $stored : [];

        return $this->normaliseConfig($config);
    }

    /**
     * @param array<string, mixed> $incoming
     * @param array<string, mixed> $actor
     * @return array<string, mixed>
     */
    public function save(array $incoming, array $actor, string $reason = ''): array
    {
        $config = $this->normaliseConfig($incoming);
        $this->assertNoFinanceAuthority($config);

        $now = gmdate('c');
        $config['updated_at'] = $now;
        $config['updated_by'] = $this->actorName($actor);
        $config['approval_role_code'] = 'CEO';
        $config['final_authority_role'] = 'CEO';
        $config['reason'] = trim($reason);

        $published = $this->publishDocuments($config);
        $config['last_publication'] = [
            'published_at' => $now,
            'published_by' => $config['updated_by'],
            'approval_role_code' => 'CEO',
            'documents' => $published,
        ];

        FileHelper::writeJson($this->configPath(), $config);

        return [
            'config' => $config,
            'updated_documents' => $published,
        ];
    }

    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    private function normaliseConfig(array $config): array
    {
        $items = [];
        $incomingItems = is_array($config['items'] ?? null) ? $config['items'] : [];
        $defaultsByKey = [];
        foreach ($this->defaultItems() as $item) {
            $defaultsByKey[(string)$item['key']] = $item;
        }

        foreach ($defaultsByKey as $key => $default) {
            $source = is_array($incomingItems[$key] ?? null) ? $incomingItems[$key] : $default;
            $items[$key] = [
                'key' => $key,
                'label' => $this->cleanText($source['label'] ?? $default['label']),
                'decision' => $this->cleanText($source['decision'] ?? $default['decision']),
                'condition' => $this->cleanText($source['condition'] ?? $default['condition']),
                'l1' => $this->cleanText($source['l1'] ?? $default['l1']),
                'l2' => $this->cleanText($source['l2'] ?? $default['l2']),
                'l3' => $this->cleanText($source['l3'] ?? $default['l3']),
                'r' => $this->cleanText($source['r'] ?? $default['r']),
                'evidence' => $this->cleanText($source['evidence'] ?? $default['evidence']),
                'escalation' => $this->cleanText($source['escalation'] ?? $default['escalation']),
                'cdrs' => $this->normaliseCdrList($source['cdrs'] ?? $default['cdrs']),
            ];
        }

        return [
            'schema_version' => '1.0',
            'final_authority_role' => 'CEO',
            'approval_role_code' => 'CEO',
            'updated_at' => $this->cleanText($config['updated_at'] ?? ''),
            'updated_by' => $this->cleanText($config['updated_by'] ?? ''),
            'reason' => $this->cleanText($config['reason'] ?? ''),
            'items' => $items,
            'managed_documents' => $this->managedDocuments(),
            'last_publication' => is_array($config['last_publication'] ?? null) ? $config['last_publication'] : null,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultItems(): array
    {
        return [
            [
                'key' => 'quote',
                'label' => 'Báo giá',
                'decision' => 'Phê duyệt báo giá theo bậc giá trị',
                'condition' => 'Mọi báo giá ra ngoài',
                'l1' => '≤ 3000 USD: EST lập, CS xác nhận yêu cầu',
                'l2' => '> 3000 USD: CEO ký sau khi EST hoàn tất bảng tính giá và biên gộp.',
                'l3' => '',
                'r' => 'EST',
                'evidence' => 'FRM-202 · SOP-201',
                'escalation' => 'Giá bán thấp hơn giá thành + biên gộp mục tiêu >15%, điều kiện giao hàng đặc biệt hoặc khách hàng chiến lược → CEO.',
                'cdrs' => ['A2'],
            ],
            [
                'key' => 'discount',
                'label' => 'Chiết khấu',
                'decision' => 'Phê duyệt chiết khấu / điều kiện thương mại ngoại lệ',
                'condition' => 'Chiết khấu, Incoterms, MOQ hoặc điều khoản giao hàng lệch chuẩn',
                'l1' => '> 0%: EST đề xuất trên hồ sơ báo giá -> CEO duyệt',
                'l2' => '',
                'l3' => '',
                'r' => 'EST',
                'evidence' => 'FRM-202 · SOP-201',
                'escalation' => 'Chiết khấu cộng dồn vượt ngưỡng, đổi điều kiện thanh toán hoặc khách yêu cầu ngoại lệ thương mại → CEO.',
                'cdrs' => ['A3'],
            ],
            [
                'key' => 'payment_terms',
                'label' => 'Điều kiện thanh toán ngoại lệ',
                'decision' => 'Phê duyệt điều kiện thanh toán ngoại lệ',
                'condition' => 'Khách yêu cầu công nợ, đặt cọc, giữ thanh toán hoặc hạn mức tín dụng lệch chuẩn',
                'l1' => '≤ công nợ 30 ngày: EST chuẩn bị hồ sơ, CS xác nhận yêu cầu.',
                'l2' => '> 30 ngày -> CEO duyệt',
                'l3' => '',
                'r' => 'CS',
                'evidence' => 'FRM-202 · SOP-201',
                'escalation' => 'Khách có nợ quá hạn, điều kiện làm tăng rủi ro dòng tiền hoặc ảnh hưởng giao hàng → CEO.',
                'cdrs' => ['A4'],
            ],
            [
                'key' => 'customer_change',
                'label' => 'Yêu cầu thay đổi khách hàng',
                'decision' => 'Phê duyệt yêu cầu thay đổi của khách hàng ảnh hưởng giá / lịch / phạm vi',
                'condition' => 'CCR làm đổi giá, lịch, phạm vi, yêu cầu kỹ thuật hoặc cổng G0 đến G7',
                'l1' => 'CS + PPL xử lý CCR tác động ≤ 1 ngày giao hoặc 2% giá trị.',
                'l2' => 'ENGM + QA rà soát CCR tác động ≤ 3 ngày giao hoặc 3% giá trị.',
                'l3' => 'CEO phê duyệt CCR vượt ngưỡng L2, vào G5-G7 hoặc ảnh hưởng cam kết khách.',
                'r' => 'CS',
                'evidence' => 'FRM-212 · SOP-201',
                'escalation' => 'CCR muộn sau FAI, CoC, chặn giao hàng hoặc đổi điều kiện chất lượng → CEO + QA.',
                'cdrs' => ['A6'],
            ],
            [
                'key' => 'purchase_order',
                'label' => 'PO mua hàng',
                'decision' => 'Phê duyệt đơn mua hàng theo giá trị và rủi ro nguồn cung',
                'condition' => 'PO mua vật tư, dao cụ, dịch vụ hoặc nhà cung cấp mới',
                'l1' => '≤ 1 triệu VND: mua hàng phát hành khi có yêu cầu mua đã được xác nhận.',
                'l2' => '≤ 10 triệu VND: SCM duyệt sau khi kiểm tra nhu cầu, giá và ngày cần hàng.',
                'l3' => '> ngưỡng L2, nhà cung cấp mới rủi ro cao hoặc ảnh hưởng giao hàng khách: CEO quyết định cuối.',
                'r' => 'BUY',
                'evidence' => 'PO · báo giá nhà cung cấp · yêu cầu mua hàng',
                'escalation' => 'Mua ngoài kế hoạch, vượt ngân sách, thay nhà cung cấp nguồn đơn hoặc đe dọa ngày giao khách → CEO.',
                'cdrs' => ['E1'],
            ],
            [
                'key' => 'overtime',
                'label' => 'OT/người/tuần',
                'decision' => 'Phê duyệt tăng ca theo người và theo tuần',
                'condition' => 'Tăng ca để giữ tiến độ job, phục hồi trễ hoặc xử lý sự cố xưởng',
                'l1' => 'WKM phối hợp PPL và PD để đảm bảo tiến độ sản xuất.',
                'l2' => '',
                'l3' => '',
                'r' => 'WKM',
                'evidence' => 'FRM-504 · bảng chấm công · kế hoạch giao hàng',
                'escalation' => 'Tăng ca do crash máy, vật tư về muộn hoặc nguy cơ trễ khách → CEO.',
                'cdrs' => ['C6'],
            ],
            [
                'key' => 'scrap',
                'label' => 'Phế phẩm',
                'decision' => 'Quyết định loại bỏ phế phẩm và ghi nhận tổn thất',
                'condition' => 'Chi tiết không thể sửa, không thể nhượng bộ hoặc không còn giá trị sử dụng',
                'l1' => '≤ 5 triệu VND: WKM + QA xác nhận bằng chứng lỗi và cách ly.',
                'l2' => '≤ 30 triệu VND: QA + PD quyết định loại bỏ sau khi phân tích ảnh hưởng.',
                'l3' => '> ngưỡng L2, ảnh hưởng khách hàng hoặc lặp lỗi hệ thống: CEO duyệt.',
                'r' => 'QA',
                'evidence' => 'FRM-413 · NCR/CAPA · ảnh bằng chứng',
                'escalation' => 'Phế phẩm liên quan vật tư đắt tiền, chi tiết Lam Research/AMAT, lot ưu tiên hoặc lỗi tái diễn → CEO.',
                'cdrs' => ['D9'],
            ],
            [
                'key' => 'hold_release',
                'label' => 'Nhả giữ hàng',
                'decision' => 'Nhả hàng đang giữ sau kiểm soát không phù hợp',
                'condition' => 'Lot/job đang giữ cần nhả để chạy tiếp, giao hàng hoặc xử lý lại',
                'l1' => 'Trong dung sai: QCL nhả khi bằng chứng kiểm cuối đạt.',
                'l2' => 'Ngoài dung sai nhưng có xử lý được: QA xác nhận điều kiện nhả và ràng buộc hồ sơ.',
                'l3' => 'Ảnh hưởng khách hàng, nhượng bộ hoặc giao sát hạn: CEO cùng ký.',
                'r' => 'QA',
                'evidence' => 'FRM-413 · kết quả kiểm cuối · NCR/CAPA nếu có',
                'escalation' => 'Bằng chứng chưa đủ, khách hàng bị ảnh hưởng hoặc có nguy cơ lặp lỗi → CEO.',
                'cdrs' => ['D6'],
            ],
            [
                'key' => 'stop_ship',
                'label' => 'Dỡ chặn giao hàng',
                'decision' => 'Dỡ lệnh chặn giao hàng sau khi rủi ro được kiểm soát',
                'condition' => 'Stop-ship nội bộ hoặc do khách hàng cần quyết định gỡ chặn',
                'l1' => 'QA xác nhận nguyên nhân chặn, phạm vi ảnh hưởng và bằng chứng kiểm cuối.',
                'l2' => 'QA + CEO đồng ký nếu lot đã sẵn sàng giao và không còn rủi ro mở.',
                'l3' => 'CEO quyết định cuối khi có áp lực giao hàng, khiếu nại hoặc rủi ro danh tiếng.',
                'r' => 'QA',
                'evidence' => 'FRM-413 · kết quả kiểm cuối · phản hồi khách hàng nếu có',
                'escalation' => 'Bất kỳ nghi ngờ về an toàn chức năng, độ sạch, sai bản vẽ hoặc truy xuất nguồn gốc → CEO.',
                'cdrs' => ['D7'],
            ],
            [
                'key' => 'outsource',
                'label' => 'Đơn gia công ngoài',
                'decision' => 'Phê duyệt điều kiện kỹ thuật và chất lượng cho gia công ngoài',
                'condition' => 'Cần chuyển công đoạn, xử lý nhiệt, phủ, mài, đo kiểm hoặc gia công phụ ra ngoài',
                'l1' => 'SCM kiểm nhà cung cấp và điều kiện giao nhận.',
                'l2' => 'SCM + ENGM + QA ký điều kiện kỹ thuật, chất lượng và xác nhận đầu vào.',
                'l3' => 'PD quyết định cuối nếu gia công ngoài ảnh hưởng CTQ, lịch giao khách hoặc nhà cung cấp chưa phê duyệt.',
                'r' => 'SCM',
                'evidence' => 'PO gia công ngoài · yêu cầu kỹ thuật · kết quả kiểm đầu vào',
                'escalation' => 'Nhà cung cấp mới, thiếu năng lực đo, thiếu chứng chỉ hoặc công đoạn có CTQ của khách bán dẫn → CEO.',
                'cdrs' => ['E3', 'E4'],
            ],
            [
                'key' => 'emergency_po',
                'label' => 'Đơn mua khẩn',
                'decision' => 'Phê duyệt đơn mua khẩn trước khi đặt hàng',
                'condition' => 'Mua khẩn để tránh dừng máy, trễ job, thiếu dao cụ/vật tư hoặc phục hồi sự cố',
                'l1' => '≤ 2 triệu VND: BUYER + SCM xác nhận lý do khẩn và nguồn hàng.',
                'l2' => '≤ 20 triệu VND: SCM duyệt sau khi chứng minh không có lựa chọn tồn kho/thay thế phù hợp.',
                'l3' => '> ngưỡng L2 hoặc ảnh hưởng giao hàng khách: CEO duyệt trước khi đặt hàng.',
                'r' => 'SCM',
                'evidence' => 'Yêu cầu mua khẩn · PO · bằng chứng thiếu vật tư hoặc nguy cơ dừng máy',
                'escalation' => 'Mua khẩn ngoài kế hoạch, giá vượt chuẩn, nguồn đơn hoặc rủi ro giao hàng khách → CEO.',
                'cdrs' => ['E5'],
            ],
            [
                'key' => 'erp_breakglass',
                'label' => 'Truy cập ERP khẩn cấp',
                'decision' => 'Kích hoạt quyền truy cập ERP khẩn cấp',
                'condition' => 'ERP/MES cần quyền khẩn cấp để phục hồi vận hành hoặc xử lý lỗi truy cập',
                'l1' => 'ESA kích hoạt tối đa 2 giờ và ghi FRM-141.',
                'l2' => 'Kéo dài đến 8 giờ: ESA + CEO đồng ý, đóng quyền ngay sau khi khôi phục.',
                'l3' => '> 8 giờ hoặc có rủi ro dữ liệu/chứng cứ: CEO duyệt gia hạn.',
                'r' => 'ESA',
                'evidence' => 'FRM-141 · nhật ký truy cập · biên bản đóng quyền',
                'escalation' => 'Quyền còn mở sau thời hạn, có sửa dữ liệu nhạy cảm hoặc ảnh hưởng audit trail → CEO.',
                'cdrs' => ['F2'],
            ],
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function managedDocuments(): array
    {
        return [
            [
                'doc_code' => 'AUTHORITY-MATRIX',
                'path' => 'mom/docs/system/organization/04-RACI-Authority/authority-matrix.html',
            ],
            [
                'doc_code' => 'RACI-MASTER-MATRIX',
                'path' => 'mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html',
            ],
            [
                'doc_code' => 'ANNEX-121',
                'path' => 'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html',
            ],
            [
                'doc_code' => 'ANNEX-120',
                'path' => 'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $config
     * @return array<int, array<string, string>>
     */
    private function publishDocuments(array $config): array
    {
        $results = [];
        $results[] = $this->updateDocument(
            'AUTHORITY-MATRIX',
            'mom/docs/system/organization/04-RACI-Authority/authority-matrix.html',
            fn(string $html): string => $this->updateAuthorityMatrixHtml($html, $config)
        );
        $results[] = $this->updateDocument(
            'RACI-MASTER-MATRIX',
            'mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html',
            fn(string $html): string => $this->updateRaciMasterHtml($html)
        );
        $results[] = $this->updateDocument(
            'ANNEX-121',
            'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html',
            fn(string $html): string => $this->updateAnnex121Html($html)
        );
        $results[] = $this->updateDocument(
            'ANNEX-120',
            'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html',
            fn(string $html): string => $this->updateAnnex120Html($html, $config)
        );

        return $results;
    }

    /**
     * @param callable(string): string $updater
     * @return array<string, string>
     */
    private function updateDocument(string $docCode, string $relativePath, callable $updater): array
    {
        $path = $this->rootDir . '/' . $relativePath;
        $html = @file_get_contents($path);
        if ($html === false) {
            throw new RuntimeException('decision_threshold_doc_not_readable:' . $relativePath);
        }

        $updated = $updater($html);
        $revision = $this->bumpDccRevision($updated);
        $updated = $revision['html'];

        if (@file_put_contents($path, $updated, LOCK_EX) === false) {
            throw new RuntimeException('decision_threshold_doc_not_writable:' . $relativePath);
        }

        return [
            'doc_code' => $docCode,
            'path' => $relativePath,
            'previous_revision' => $revision['previous_revision'],
            'new_revision' => $revision['new_revision'],
            'approval_role_code' => 'CEO',
        ];
    }

    /**
     * @param array<string, mixed> $config
     */
    private function updateAuthorityMatrixHtml(string $html, array $config): string
    {
        $block = $this->authorityQuickLookupBlock($config);
        $html = $this->replaceManagedBlock(
            $html,
            'DECISION-THRESHOLDS',
            $block,
            '/<h3>Tôi cần duyệt cái gì\?<\/h3>\s*<div class="table-card"><table class="table">.*?<\/table><\/div>/s'
        );
        $html = str_replace(
            ' / <a class="entity-link role-link" href="../03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a>',
            '',
            $html
        );
        $html = $this->removeFinanceDeputyAuthority($html);

        return $html;
    }

    private function updateRaciMasterHtml(string $html): string
    {
        $quickTable = $this->raciGateQuickTableBlock();
        return $this->replaceManagedBlock(
            $html,
            'RACI-GATE-AUTHORITY-SUMMARY',
            $quickTable,
            '/<div class="table-card"><table class="table">\s*<colgroup><col style="width:12%".*?<\/table><\/div>/s'
        );
    }

    private function updateAnnex121Html(string $html): string
    {
        $html = $this->normaliseAnnexRoleWrapping($html);
        $html = $this->removeFinanceFromAnnex121Intro($html);
        $html = $this->replaceAnnex121FinanceColumnWithCeo($html);

        $html = $this->replaceAnnex121RaciRow(
            $html,
            'A2',
            'G0',
            'Phê duyệt báo giá theo bậc giá trị',
            [
                'CS' => 'R',
                'EST' => 'R',
                'ENG' => 'C',
                'PPL' => '',
                'WKM' => '',
                'QA' => '',
                'SCM' => '',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx">FRM-202</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'A3',
            'G0',
            'Phê duyệt chiết khấu / điều kiện thương mại ngoại lệ',
            [
                'CS' => 'C',
                'EST' => 'R',
                'ENG' => '',
                'PPL' => '',
                'WKM' => '',
                'QA' => '',
                'SCM' => '',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx">FRM-202</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'A4',
            'G0',
            'Phê duyệt điều kiện thanh toán ngoại lệ',
            [
                'CS' => 'R',
                'EST' => 'C',
                'ENG' => '',
                'PPL' => '',
                'WKM' => '',
                'QA' => '',
                'SCM' => '',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx">FRM-202</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'A5',
            'G0',
            'Chấp thuận đơn hàng và xem xét hợp đồng',
            [
                'CS' => 'R',
                'EST' => 'R',
                'ENG' => 'C',
                'PPL' => 'C',
                'WKM' => '',
                'QA' => 'C',
                'SCM' => 'C',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-200-purchase/FRM-202_Contract_Review_Checklist.xlsx">FRM-202</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'A6',
            'G0',
            'Phê duyệt yêu cầu thay đổi của khách hàng (CCR) ảnh hưởng giá / lịch / phạm vi',
            [
                'CS' => 'R',
                'EST' => 'R',
                'ENG' => 'C',
                'PPL' => 'C',
                'WKM' => '',
                'QA' => 'C',
                'SCM' => '',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-200-purchase/FRM-212_Customer_Change_Request.xlsx">FRM-212</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'E1',
            'G2',
            'Phê duyệt PO theo bậc giá trị',
            [
                'CS' => '',
                'EST' => '',
                'ENG' => '',
                'PPL' => 'I',
                'WKM' => '',
                'QA' => '',
                'SCM' => 'R',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-400-quality/FRM-401_Purchase_Order_Tracking_Log.xlsx">FRM-401</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'E2',
            'G2',
            'Phê duyệt nhà cung cấp mới (qualify)',
            [
                'CS' => '',
                'EST' => '',
                'ENG' => '',
                'PPL' => '',
                'WKM' => '',
                'QA' => 'R',
                'SCM' => 'R',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-400-quality/FRM-402_Supplier_Evaluation_Form.xlsx">FRM-402</a> · <a href="../../../../forms/frm-400-quality/FRM-409_Supplier_Audit_Checklist.xlsx">FRM-409</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'E5',
            'G2',
            'Phê duyệt đơn mua khẩn / vật tư khẩn',
            [
                'CS' => '',
                'EST' => '',
                'ENG' => '',
                'PPL' => 'C',
                'WKM' => '',
                'QA' => 'I',
                'SCM' => 'R',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-400-quality/FRM-401_Purchase_Order_Tracking_Log.xlsx">FRM-401</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );
        $html = $this->replaceAnnex121RaciRow(
            $html,
            'E5',
            'G3',
            'Phê duyệt đơn mua khẩn / vật tư khẩn',
            [
                'CS' => '',
                'EST' => '',
                'ENG' => '',
                'PPL' => 'C',
                'WKM' => 'R',
                'QA' => '',
                'SCM' => 'R',
                'CEO' => 'A',
                'HRIT' => '',
            ],
            '<a href="../../../../forms/frm-400-quality/FRM-401_Purchase_Order_Tracking_Log.xlsx">FRM-401</a> · <a href="../../../sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html">SOP-201</a>'
        );

        return $html;
    }

    /**
     * @param array<string, mixed> $config
     */
    private function updateAnnex120Html(string $html, array $config): string
    {
        $html = $this->normaliseAnnexRoleWrapping($html);
        foreach ($this->items($config) as $item) {
            foreach ($item['cdrs'] as $cdr) {
                $html = $this->replaceCdrRow($html, (string)$cdr, $item);
            }
        }
        $html = $this->removeFinanceFromAnnexAuthorityNotes($html);

        return $html;
    }

    private function removeFinanceDeputyAuthority(string $html): string
    {
        $ceoRow = '<tr><td><a class="entity-link role-link" href="../03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a></td><td>L1: <a class="entity-link role-link" href="../03-Job-Descriptions/01-JD-Executive/jd-production-director.html">PD</a>; L2: hội đồng <a class="entity-link bundle-link" href="role-and-department-bundles.html#bundle-func-heads">FUNC_HEADS</a> do <a class="entity-link role-link" href="../03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a> chỉ định trước</td><td>≥ 24 giờ + xác nhận đa số <a class="entity-link bundle-link" href="role-and-department-bundles.html#bundle-func-heads">FUNC_HEADS</a>.</td><td><a href="../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html#d4">ANNEX-123 d4</a></td></tr>';
        $html = preg_replace(
            '/<tr><td><a class="entity-link role-link" href="\.\.\/03-Job-Descriptions\/01-JD-Executive\/jd-chief-executive-officer\.html">CEO<\/a><\/td><td>.*?<\/tr>/s',
            $ceoRow,
            $html,
            1
        ) ?? $html;
        $html = preg_replace(
            '/<tr><td><a class="entity-link role-link" href="\.\.\/03-Job-Descriptions\/07-JD-Finance\/jd-finance-manager\.html">FIN<\/a><\/td>.*?<\/tr>\n?/s',
            '',
            $html
        ) ?? $html;

        return $html;
    }

    private function removeFinanceFromAnnexAuthorityNotes(string $html): string
    {
        $html = $this->replaceDirectorLabelWithCeo($html);
        $html = preg_replace(
            '/<span class="inline-tag"><span class="role-cluster"><span class="role-code"><a class="entity-link role-link" href="\.\.\/\.\.\/\.\.\/\.\.\/system\/organization\/03-Job-Descriptions\/07-JD-Finance\/jd-finance-manager\.html">FIN<\/a><\/span><\/span><\/span>/',
            '',
            $html
        ) ?? $html;
        $html = str_replace(
            'Ngưỡng VND là ngưỡng vận hành nội bộ cho xưởng CNC bán dẫn quy mô vừa; <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a> + <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a> phải rà soát lại mỗi quý hoặc khi tỷ giá, giá vật liệu hoặc giá máy biến động trên 20%.',
            'Ngưỡng VND là ngưỡng vận hành nội bộ cho xưởng CNC bán dẫn quy mô vừa; <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a> phải rà soát lại mỗi quý hoặc khi tỷ giá, giá vật liệu hoặc giá máy biến động trên 20%.',
            $html
        );
        $html = str_replace(
            'bỏ bước <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html">QA</a>/<a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a>/<a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html">ENGM</a> bắt buộc',
            'bỏ bước <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html">QA</a>/<a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html">ENGM</a> bắt buộc',
            $html
        );
        $html = $this->removeFinanceRoleLinks($html);

        return $html;
    }

    private function removeFinanceFromAnnex121Intro(string $html): string
    {
        $html = $this->replaceDirectorLabelWithCeo($html);
        $html = preg_replace(
            '/<span class="inline-tag"><span class="role-cluster"><span class="role-code"><a class="entity-link role-link" href="\.\.\/\.\.\/\.\.\/\.\.\/system\/organization\/03-Job-Descriptions\/07-JD-Finance\/jd-finance-manager\.html">FIN<\/a><\/span><\/span><\/span>/',
            '',
            $html
        ) ?? $html;

        $html = str_replace(
            '<tr><td>C phải tham vấn trước khi chốt</td><td><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html">ENGM</a>, <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html">QA</a>, <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html">SCM</a>, <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a> hoặc <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html">CS</a> được ghi C phải được hỏi trước khi quyết định ảnh hưởng kỹ thuật, chất lượng, vật tư, tiền hoặc khách hàng.</td><td>Chỉ gửi thông báo sau khi đã quyết định.</td></tr>',
            '<tr><td>C phải tham vấn trước khi chốt</td><td><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html">ENGM</a>, <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html">QA</a>, <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html">SCM</a> hoặc <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html">CS</a> được ghi C phải được hỏi trước khi chốt kỹ thuật, chất lượng, vật tư hoặc cam kết khách hàng. Quyết định ảnh hưởng giá, dòng tiền hoặc vượt ngưỡng phải đưa <a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a> chốt cuối theo <a href="annex-120-authority-matrix.html">ANNEX-120</a>.</td><td>Chỉ gửi thông báo sau khi đã quyết định.</td></tr>',
            $html
        );

        $html = str_replace(
            '<tr><td>Rà soát KPI cycle và input Management Review</td><td><span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html">QMS</a></span></td><td><span class="role-code"><a class="entity-link bundle-link" href="../../../../system/organization/04-RACI-Authority/role-and-department-bundles.html#bundle-func-owners">FUNC_OWNERS</a></span></td><td><span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a></span> / <span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a></span></td><td><a href="annex-122-kpi-cascade-dictionary.html">ANNEX-122</a> · <a href="../../../sops/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html">SOP-102</a></td></tr>',
            '<tr><td>Rà soát chu kỳ KPI và đầu vào xem xét của lãnh đạo</td><td><span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html">QMS</a></span></td><td><span class="role-code"><a class="entity-link bundle-link" href="../../../../system/organization/04-RACI-Authority/role-and-department-bundles.html#bundle-func-owners">FUNC_OWNERS</a></span></td><td><span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a></span></td><td><a href="annex-122-kpi-cascade-dictionary.html">ANNEX-122</a> · <a href="../../../sops/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html">SOP-102</a></td></tr>',
            $html
        );

        $html = $this->removeFinanceRoleLinks($html);

        return $html;
    }

    private function replaceDirectorLabelWithCeo(string $html): string
    {
        return str_replace(
            '<span class="inline-tag">Tổng Giám đốc</span>',
            '<span class="inline-tag"><span class="role-cluster"><span class="role-code"><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a></span></span></span>',
            $html
        );
    }

    private function removeFinanceRoleLinks(string $html): string
    {
        $patterns = [
            '/\s*\/\s*<a class="entity-link role-link" href="\.\.\/\.\.\/\.\.\/\.\.\/system\/organization\/03-Job-Descriptions\/07-JD-Finance\/jd-finance-manager\.html">FIN<\/a>/',
            '/\s*\/\s*<span class="role-code"><a class="entity-link role-link" href="\.\.\/\.\.\/\.\.\/\.\.\/system\/organization\/03-Job-Descriptions\/07-JD-Finance\/jd-finance-manager\.html">FIN<\/a><\/span>/',
        ];
        foreach ($patterns as $pattern) {
            $html = preg_replace($pattern, '', $html) ?? $html;
        }

        return $html;
    }

    private function normaliseAnnexRoleWrapping(string $html): string
    {
        $html = str_replace(
            'table { max-width: 100%; table-layout: auto; }',
            'table { max-width: 100%; table-layout: fixed; }',
            $html
        );
        $html = str_replace(
            'td, th { max-width: 420px; overflow-wrap: break-word; word-wrap: break-word; }',
            'td, th { max-width: 420px; overflow-wrap: anywhere; word-wrap: break-word; }',
            $html
        );
        $html = str_replace(
            '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;white-space:nowrap}',
            '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;display:inline-block;box-sizing:border-box;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.35;vertical-align:middle;text-align:center}',
            $html
        );
        $html = str_replace(
            '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;display:inline-block;max-width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.35;vertical-align:middle}',
            '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;display:inline-block;box-sizing:border-box;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.35;vertical-align:middle;text-align:center}',
            $html
        );
        if (strpos($html, '.role-code a,.role-code .entity-link,.role-code .role-link,.role-code .bundle-link') === false) {
            $html = str_replace(
                '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;display:inline-block;box-sizing:border-box;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.35;vertical-align:middle;text-align:center}',
                '.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px;display:inline-block;box-sizing:border-box;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.35;vertical-align:middle;text-align:center}' . "\n" .
                '.role-code a,.role-code .entity-link,.role-code .role-link,.role-code .bundle-link{display:inline;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:break-word}',
                $html
            );
        }

        return $html;
    }

    private function replaceAnnex121FinanceColumnWithCeo(string $html): string
    {
        return str_replace(
            '<th><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html">FIN</a></th>',
            '<th><a class="entity-link role-link" href="../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html">CEO</a></th>',
            $html
        );
    }

    /**
     * @param array{CS: string, EST: string, ENG: string, PPL: string, WKM: string, QA: string, SCM: string, CEO: string, HRIT: string} $cells
     */
    private function replaceAnnex121RaciRow(
        string $html,
        string $cdr,
        string $gate,
        string $activityHtml,
        array $cells,
        string $evidenceHtml
    ): string {
        $row = '<tr>' . "\n"
            . '  <td><a href="annex-121-raci-master-matrix.html#r5gate">' . $this->e($gate) . '</a></td><td><a href="annex-120-authority-matrix.html#cdr-' . $this->e($cdr) . '">' . $this->e($cdr) . '</a></td><td>' . $activityHtml . '</td>' . "\n"
            . '  ' . $this->raciCell($cells['CS']) . "\n"
            . '  ' . $this->raciCell($cells['EST']) . "\n"
            . '  ' . $this->raciCell($cells['ENG']) . "\n"
            . '  ' . $this->raciCell($cells['PPL']) . "\n"
            . '  ' . $this->raciCell($cells['WKM']) . "\n"
            . '  ' . $this->raciCell($cells['QA']) . "\n"
            . '  ' . $this->raciCell($cells['SCM']) . "\n"
            . '  ' . $this->raciCell($cells['CEO']) . "\n"
            . '  ' . $this->raciCell($cells['HRIT']) . "\n"
            . '  <td>' . $evidenceHtml . '</td>' . "\n"
            . '</tr>';

        $pattern = '/<tr>\s*<td><a href="annex-121-raci-master-matrix\.html#r5gate">' . preg_quote($gate, '/') . '<\/a><\/td><td><a href="annex-120-authority-matrix\.html#cdr-' . preg_quote($cdr, '/') . '">' . preg_quote($cdr, '/') . '<\/a><\/td>.*?<\/tr>/s';
        $next = preg_replace($pattern, $row, $html, 1, $count);
        if ($count !== 1 || $next === null) {
            throw new RuntimeException('decision_threshold_annex121_row_not_found:' . $gate . ':' . $cdr);
        }

        return $next;
    }

    private function raciCell(string $value): string
    {
        $value = strtoupper(trim($value));
        if (!in_array($value, ['A', 'R', 'C', 'I'], true)) {
            return '<td></td>';
        }

        return '<td class="raci-cell raci-' . $value . '">' . $value . '</td>';
    }

    /**
     * @param array<string, mixed> $config
     */
    private function authorityQuickLookupBlock(array $config): string
    {
        $rows = [];
        foreach ($this->items($config) as $item) {
            $rows[] = '<tr class="authority-decision-row">'
                . '<td class="decision-subject-cell">' . $this->decisionSubjectBlock($item, 'system') . '</td>'
                . '<td class="threshold-cell">' . $this->thresholdLookupLines($item, 'system') . '</td>'
                . '<td class="cdr-cell">' . $this->cdrLinks($item['cdrs'], 'system') . '</td>'
                . '</tr>';
        }

        return '<h3>Tôi cần duyệt cái gì?</h3>' . "\n"
            . '<div class="table-card authority-lookup-card"><table class="table authority-lookup-table">' . "\n"
            . '<colgroup><col style="width:27%"/><col style="width:57%"/><col style="width:16%"/></colgroup>' . "\n"
            . '<thead><tr><th>Loại quyết định</th><th>Luồng ngưỡng / leo thang</th><th>CDR</th></tr></thead>' . "\n"
            . '<tbody>' . "\n"
            . implode("\n", $rows) . "\n"
            . '</tbody>' . "\n"
            . '</table></div>';
    }

    /**
     * @param array<string, mixed> $item
     */
    private function decisionSubjectBlock(array $item, string $context): string
    {
        $html = '<div class="decision-subject">'
            . '<strong>' . $this->e($item['label']) . '</strong>';

        $decision = $this->normaliseThresholdDisplayLine((string)($item['decision'] ?? ''));
        if ($decision !== '') {
            $html .= '<span class="decision-summary">' . $this->linkText($decision, $context) . '</span>';
        }

        return $html . '</div>';
    }

    /**
     * @param array<string, mixed> $item
     */
    private function thresholdLookupLines(array $item, string $context): string
    {
        $lines = [];
        foreach ([
            ['field' => 'l1', 'label' => 'L1', 'class' => 'l1'],
            ['field' => 'l2', 'label' => 'L2', 'class' => 'l2'],
            ['field' => 'l3', 'label' => 'L3 / CEO', 'class' => 'l3'],
        ] as $level) {
            $field = $level['field'];
            foreach ($this->thresholdTextFragments((string)($item[$field] ?? '')) as $line) {
                $lines[] = '<div class="threshold-step threshold-step-' . $level['class'] . '">'
                    . '<span class="threshold-badge threshold-badge-' . $level['class'] . '">' . $level['label'] . '</span>'
                    . '<div class="threshold-body">' . $this->linkText($line, $context) . '</div>'
                    . '</div>';
            }
        }

        foreach ($this->thresholdTextFragments((string)($item['escalation'] ?? '')) as $line) {
            $lines[] = '<div class="threshold-step threshold-escalation">'
                . '<span class="threshold-badge threshold-badge-escalation">LEO THANG</span>'
                . '<div class="threshold-body">' . $this->linkText($line, $context) . '</div>'
                . '</div>';
        }

        return implode('', $lines);
    }

    /**
     * @return array<int, string>
     */
    private function thresholdTextFragments(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return [];
        }

        $text = preg_replace('/(?<=[\p{L}\p{N}.])(?=[<>≤≥]\s*)/u', "\n", $text) ?? $text;
        $parts = preg_split('/\R/u', $text) ?: [$text];
        $lines = [];
        foreach ($parts as $part) {
            $line = $this->normaliseThresholdDisplayLine($part);
            if ($line !== '') {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    private function normaliseThresholdDisplayLine(string $text): string
    {
        $text = trim($text);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = preg_replace('/^\s*,\s*/u', '', $text) ?? $text;
        $text = preg_replace('/([:;]|->|→)\s*,\s*/u', '$1 ', $text) ?? $text;
        $text = str_replace('->', '→', $text);
        $text = preg_replace('/\s+([.,;:])/u', '$1', $text) ?? $text;

        return trim($text);
    }

    private function raciGateQuickTableBlock(): string
    {
        $annex121 = '../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html';
        $rows = [
            ['G0', 'RFQ, báo giá, điều kiện thương mại, chấp thuận đơn hàng và CCR sớm.', $this->roleList(['EST', 'CEO'], 'system')],
            ['G1', '<a class="entity-link role-link" href="../03-Job-Descriptions/03-JD-Engineering/jd-dfm-engineer.html">DFM</a>, phát hành kỹ thuật, ECO, thay thế và thu hồi gói kỹ thuật.', $this->roleList(['ENGM', 'QA'], 'system')],
            ['G2', 'Phát hành kế hoạch, PO, nhà cung cấp mới và vật tư khẩn trước khi đưa lệnh xuống xưởng.', $this->roleList(['PPL', 'SCM', 'CEO'], 'system')],
            ['G3', 'Điều phối trong ngày, đổi cài đặt máy, chuyển việc, tăng ca, khôi phục sau va chạm, điều phối gia công ngoài và phát hành <a class="entity-link role-link" href="../03-Job-Descriptions/03-JD-Engineering/jd-cam-nc-programmer.html">CAM</a>/NC.', $this->roleList(['PD', 'WKM', 'SCM', 'ENGM'], 'system')],
            ['G4', 'Nhả mẫu đầu tiên đạt hoặc xử lý mẫu đầu tiên không đạt; không chạy loạt nếu bằng chứng FAI chưa được quyết định.', $this->roleList(['QA'], 'system')],
            ['G5', 'NCR, quyết định xử lý, đóng CAPA, nhả giữ hàng, loại bỏ, SCAR và chấp thuận nhượng bộ.', $this->roleList(['QA', 'CEO', 'SCM'], 'system')],
            ['G6', 'Phát hành CoC, ký kiểm cuối và bằng chứng sẵn sàng giao hàng.', $this->roleList(['QA'], 'system')],
            ['G7', 'Chặn giao hàng, dỡ chặn giao hàng, khiếu nại/RMA và CCR muộn sau khi giao hoặc sát giao.', $this->roleList(['QA', 'CEO', 'CS'], 'system')],
        ];

        $htmlRows = [];
        foreach ($rows as $row) {
            $htmlRows[] = '<tr><td><a href="' . $annex121 . '#r5gate">' . $row[0] . '</a></td><td>' . $row[1] . '</td><td>' . $row[2] . '</td><td><a href="' . $annex121 . '">ANNEX-121</a> mục 5</td></tr>';
        }

        return '<div class="table-card"><table class="table">' . "\n"
            . '<colgroup><col style="width:12%"/><col style="width:48%"/><col style="width:20%"/><col style="width:20%"/></colgroup>' . "\n"
            . '<thead><tr><th>Cổng</th><th>Tóm tắt bàn giao</th><th>Người A thường gặp</th><th>Chi tiết</th></tr></thead>' . "\n"
            . '<tbody>' . "\n"
            . implode("\n", $htmlRows) . "\n"
            . '</tbody>' . "\n"
            . '</table></div>';
    }

    /**
     * @param array<string, mixed> $item
     */
    private function replaceCdrRow(string $html, string $cdr, array $item): string
    {
        $row = '<tr id="cdr-' . $this->e($cdr) . '">' . "\n"
            . '  <td><a href="annex-120-authority-matrix.html#cdr-' . $this->e($cdr) . '">' . $this->e($cdr) . '</a></td>' . "\n"
            . '  <td>' . $this->e($this->cdrDecisionLabel($cdr, $item)) . '</td>' . "\n"
            . '  <td>' . $this->linkText($item['condition'], 'annex') . '</td>' . "\n"
            . '  <td>' . $this->linkText($item['l1'], 'annex') . '</td>' . "\n"
            . '  <td>' . $this->linkText($item['l2'], 'annex') . '</td>' . "\n"
            . '  <td>' . $this->linkText($item['l3'], 'annex') . '</td>' . "\n"
            . '  <td><span class="role-code">' . $this->linkText($item['r'], 'annex') . '</span></td>' . "\n"
            . '  <td>' . $this->linkText($item['evidence'], 'annex') . '</td>' . "\n"
            . '  <td>' . $this->linkText($item['escalation'], 'annex') . '</td>' . "\n"
            . '</tr>';

        $pattern = '/<tr id="cdr-' . preg_quote($cdr, '/') . '">.*?<\/tr>/s';
        $next = preg_replace($pattern, $row, $html, 1, $count);
        if ($count !== 1 || $next === null) {
            throw new RuntimeException('decision_threshold_cdr_row_not_found:' . $cdr);
        }
        return $next;
    }

    /**
     * @param array<string, mixed> $item
     */
    private function cdrDecisionLabel(string $cdr, array $item): string
    {
        if ($cdr === 'E3') {
            return 'Phê duyệt điều kiện kỹ thuật cho gia công ngoài';
        }
        if ($cdr === 'E4') {
            return 'Xác nhận chất lượng đầu vào sau gia công ngoài';
        }
        return (string)$item['decision'];
    }

    private function replaceManagedBlock(string $html, string $key, string $block, string $fallbackPattern): string
    {
        $start = '<!-- ' . $key . ':START -->';
        $end = '<!-- ' . $key . ':END -->';
        $managed = $start . "\n" . $block . "\n" . $end;

        if (str_contains($html, $start) && str_contains($html, $end)) {
            $pattern = '/' . preg_quote($start, '/') . '.*?' . preg_quote($end, '/') . '/s';
            $next = preg_replace($pattern, $managed, $html, 1, $count);
            if ($count === 1 && $next !== null) {
                return $next;
            }
        }

        $next = preg_replace($fallbackPattern, $managed, $html, 1, $count);
        if ($count !== 1 || $next === null) {
            throw new RuntimeException('decision_threshold_managed_block_not_found:' . $key);
        }

        return $next;
    }

    /**
     * @return array{html: string, previous_revision: string, new_revision: string}
     */
    private function bumpDccRevision(string $html): array
    {
        $pattern = '/data-dcc-bootstrap=(["\'])(.*?)\1/s';
        if (!preg_match($pattern, $html, $match, PREG_OFFSET_CAPTURE)) {
            return ['html' => $html, 'previous_revision' => '', 'new_revision' => ''];
        }

        $quote = $match[1][0];
        $payload = html_entity_decode($match[2][0], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $data = json_decode($payload, true);
        if (!is_array($data) || !is_array($data['header'] ?? null)) {
            return ['html' => $html, 'previous_revision' => '', 'new_revision' => ''];
        }

        $previous = (string)($data['header']['revision'] ?? 'V0');
        $nextRevision = $this->nextRevision($previous);
        $data['header']['revision'] = $nextRevision;
        $data['header']['effective_date'] = gmdate('Y-m-d');
        $data['header']['approver_role_code'] = 'CEO';
        $data['header']['status'] = (string)($data['header']['status'] ?? 'draft');

        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            throw new RuntimeException('decision_threshold_dcc_encode_failed');
        }
        $attributeValue = $quote === '"'
            ? htmlspecialchars($encoded, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            : str_replace("'", '&#039;', $encoded);

        $replacement = 'data-dcc-bootstrap=' . $quote . $attributeValue . $quote;
        $html = substr_replace(
            $html,
            $replacement,
            (int)$match[0][1],
            strlen($match[0][0])
        );

        return [
            'html' => $html,
            'previous_revision' => $previous,
            'new_revision' => $nextRevision,
        ];
    }

    private function nextRevision(string $revision): string
    {
        if (preg_match('/^V(\d+)(?:\.(\d+))?$/', trim($revision), $match)) {
            $major = (int)$match[1];
            $minor = isset($match[2]) && $match[2] !== '' ? (int)$match[2] : 0;
            return 'V' . $major . '.' . ($minor + 1);
        }

        return 'V0.1';
    }

    /**
     * @param array<string, mixed> $config
     */
    private function assertNoFinanceAuthority(array $config): void
    {
        $haystack = json_encode($config['items'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($haystack !== false && preg_match('/\b(FIN|Finance|Tài chính)\b/iu', $haystack)) {
            throw new RuntimeException('decision_threshold_finance_role_blocked');
        }
    }

    private function linkText(string $text, string $context): string
    {
        $escaped = nl2br($this->e($text), false);
        $rolePrefix = $context === 'annex'
            ? '../../../../system/organization/03-Job-Descriptions/'
            : '../03-Job-Descriptions/';
        $docLinks = $context === 'annex' ? self::ANNEX_DOC_LINKS : self::SYSTEM_DOC_LINKS;

        foreach (self::ROLE_LINKS as $code => $path) {
            $href = $rolePrefix . $path;
            $escaped = preg_replace('/\b' . preg_quote($code, '/') . '\b/u', '<a class="entity-link role-link" href="' . $href . '">' . $code . '</a>', $escaped) ?? $escaped;
        }
        foreach ($docLinks as $code => $href) {
            $escaped = preg_replace('/\b' . preg_quote($code, '/') . '\b/u', '<a href="' . $href . '">' . $code . '</a>', $escaped) ?? $escaped;
        }

        return $escaped;
    }

    /**
     * @param array<int, string> $roles
     */
    private function roleList(array $roles, string $context): string
    {
        return implode(' / ', array_map(fn(string $role): string => $this->linkText($role, $context), $roles));
    }

    /**
     * @param array<int, string> $cdrs
     */
    private function cdrLinks(array $cdrs, string $context): string
    {
        $base = $context === 'annex'
            ? 'annex-120-authority-matrix.html'
            : '../../../operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html';
        return implode(', ', array_map(static fn(string $cdr): string => '<a href="' . $base . '#cdr-' . htmlspecialchars($cdr, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '">' . htmlspecialchars($cdr, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</a>', $cdrs));
    }

    /**
     * @param array<string, mixed> $config
     * @return array<int, array<string, mixed>>
     */
    private function items(array $config): array
    {
        $items = is_array($config['items'] ?? null) ? $config['items'] : [];
        return array_values(array_filter($items, static fn($item): bool => is_array($item)));
    }

    /**
     * @param mixed $value
     * @return array<int, string>
     */
    private function normaliseCdrList(mixed $value): array
    {
        $list = is_array($value) ? $value : preg_split('/[,;]/', (string)$value);
        $out = [];
        foreach ($list ?: [] as $raw) {
            $cdr = strtoupper(trim((string)$raw));
            if (preg_match('/^[A-F]\d+$/', $cdr)) {
                $out[] = $cdr;
            }
        }
        return array_values(array_unique($out));
    }

    private function actorName(array $actor): string
    {
        foreach (['username', 'full_name', 'name', 'email'] as $key) {
            $value = trim((string)($actor[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return 'admin';
    }

    private function cleanText(mixed $value): string
    {
        $text = trim((string)$value);
        $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        return str_replace(["\r\n", "\r"], "\n", $text);
    }

    private function configPath(): string
    {
        return $this->dataDir . '/' . self::CONFIG_RELATIVE_PATH;
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
