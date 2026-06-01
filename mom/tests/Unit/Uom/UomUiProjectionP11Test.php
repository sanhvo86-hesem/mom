<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

final class UomUiProjectionP11Test extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
    }

    public function testControlCenterIsProjectionWithFixtureDefault(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/80-uom-control-center.js');

        $this->assertStringContainsString("data-authority-class', 'projection", $js);
        $this->assertStringContainsString("data-route-class', 'workspace-projection", $js);
        $this->assertStringContainsString('fixture-default', $js);
        $this->assertStringContainsString('UOM_LIVE_API_ENABLED', $js);
        $this->assertStringContainsString('uom_live_api', $js);
    }

    public function testControlCenterRejectsNakedNumberSubmit(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/80-uom-control-center.js');

        $this->assertStringContainsString('validateCalcForm', $js);
        $this->assertStringContainsString('Không được gửi số đo thiếu đơn vị', $js);
        $this->assertStringContainsString("btn.disabled = !ok", $js);
        $this->assertStringContainsString('quantity_kind_code', $js);
        $this->assertStringContainsString('source_system', $js);
    }

    public function testWidgetBindsMagnitudeUnitKindSourceAndContext(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/81-uom-quantity-widget.js');

        foreach (['magnitude', 'unit_code', 'quantity_kind', 'source_system', 'context', 'measval', 'valid', 'errors'] as $field) {
            $this->assertStringContainsString($field, $js);
        }
        $this->assertStringContainsString('quantityKind', $js);
        $this->assertStringContainsString('sourceSystem', $js);
        $this->assertStringContainsString('policy_id', $js);
        $this->assertStringContainsString('site_id', $js);
    }

    public function testWidgetAliasAmbiguityGoesToQuarantine(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/81-uom-quantity-widget.js');

        $this->assertStringContainsString('allowExternalAlias', $js);
        $this->assertStringContainsString('/api/v1/uom/aliases/resolve', $js);
        $this->assertStringContainsString('ambiguous', $js);
        $this->assertStringContainsString('quarantine_id', $js);
        $this->assertStringContainsString('Không tự động ánh xạ', $js);
    }

    public function testWidgetFiltersAndDisablesUnitsByKind(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/81-uom-quantity-widget.js');

        $this->assertStringContainsString('data-quantity-kind', $js);
        $this->assertStringContainsString('disabled_reason_vi', $js);
        $this->assertStringContainsString('Không thuộc loại đại lượng', $js);
        $this->assertStringContainsString('kind=', $js);
        $this->assertStringContainsString('item_id=', $js);
        $this->assertStringContainsString('site_id=', $js);
        $this->assertStringContainsString('policy_id=', $js);
    }

    public function testWidgetHasVietnameseAccessibleFeedback(): void
    {
        $js = (string)file_get_contents($this->root . '/scripts/portal/81-uom-quantity-widget.js');

        foreach (['aria-describedby', 'aria-invalid', 'aria-live', 'role', 'Đơn vị đo', 'Loại đại lượng', 'Nguồn dữ liệu'] as $needle) {
            $this->assertStringContainsString($needle, $js);
        }
        $this->assertStringContainsString('Gốc:', $js);
        $this->assertStringContainsString('Chuẩn hóa:', $js);
    }
}
