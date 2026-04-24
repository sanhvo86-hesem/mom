<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * Canonical control-plane bridge for file-backed QMS document authoring.
 *
 * The legacy `?action=doc_*` surface is permanently fail-closed by policy.
 * This controller reuses the existing file-backed authoring logic on a
 * governed REST surface under `/api/v1/eqms/control-plane/documents/*`.
 */
final class CanonicalDocumentAuthoringController extends DocumentController
{
    public function create(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::create();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function saveDraft(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::saveDraft();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function submitReview(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::submitReview();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function approve(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::approve();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function reject(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::reject();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function deleteDrafts(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::deleteDrafts();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function deleteVersion(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::deleteVersion();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function startNewRevision(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::startNewRevision();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }

    public function ensureLocale(): never
    {
        $this->suspendLegacyWriteGuard();
        try {
            parent::ensureLocale();
        } finally {
            $this->restoreLegacyWriteGuard();
        }
    }
}
