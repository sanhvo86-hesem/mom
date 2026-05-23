<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Portal;

use PHPUnit\Framework\TestCase;

final class DocumentPortalWorkflowActionsTest extends TestCase
{
    public function testReleasedDccDocumentsCanStartNewRevisionButCannotDirectEdit(): void
    {
        $editorCore = $this->portalScript('03-editor-core.js');
        $shell = $this->portalScript('02-state-auth-ui.js');
        $workflow = $this->portalScript('05-workflow-panel.js');

        self::assertStringContainsString(
            "const DOC_WORKFLOW_REVISION_SOURCE_STATUSES = ['approved', 'released', 'effective', 'initial_release'];",
            $editorCore
        );
        self::assertStringContainsString('function isDocRevisionSourceStatus(status)', $editorCore);
        self::assertStringContainsString('const status=getDocStatus(doc);', $editorCore);
        self::assertStringContainsString('if(isDocEditLockedStatus(status)) return false;', $editorCore);
        self::assertStringContainsString("return status==='draft' && r.canEditDocs === true;", $editorCore);

        self::assertStringContainsString('isDocRevisionSourceStatus(status)', $shell);
        self::assertStringContainsString("renderDocHeaderButton(T('new_revision')", $shell);
        self::assertStringContainsString('const approvedCount = VDOCS.filter(d=>{', $shell);

        self::assertStringContainsString("typeof getDocRevision==='function' ? getDocRevision(doc)", $workflow);
        self::assertStringContainsString("filter==='approved'", $workflow);
        self::assertStringContainsString('isDocRevisionSourceStatus(status)', $workflow);
    }

    private function portalScript(string $filename): string
    {
        $path = QMS_TEST_BASE_DIR . '/scripts/portal/' . $filename;
        self::assertFileExists($path);

        $source = file_get_contents($path);
        self::assertIsString($source);

        return $source;
    }
}
