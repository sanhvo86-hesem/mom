# HMV4 Live API Toggle Replication — Implementation Report

**Branch:** codex/live-api-toggle-replication-phase3
**Date:** 2026-04-26
**Status:** LIVE_API_REPLICATION_PASS_READY_FOR_REVIEW

## Summary

Refactored per-resource live-mode functions (NC + WO) into HMV4_LIVE_RESOURCE_REGISTRY
with 7 entries. Added CAPA, CDOC, INSP, BREL, ECO registry entries. 21 new E2E tests.

## Registry (7 entries)

| Family | Path | Fixture global | Record attr |
|---|---|---|---|
| nonconformance-cases | /api/v1/nonconformance-cases | HMV4_NONCONFORMANCE_CASE_FIXTURE | data-hmv4-nonconformance-record |
| work-orders | /api/v1/work-orders | HMV4_WO_RECORD_FIXTURE | data-hmv4-wo-record |
| capas | /api/v1/capas | HMV4_CAPA_RECORD_FIXTURE | data-hmv4-capa-record |
| controlled-documents | /api/v1/controlled-documents | HMV4_CDOC_RECORD_FIXTURE | data-hmv4-cdoc-record |
| inspections | /api/v1/inspections | HMV4_INSP_RECORD_FIXTURE | data-hmv4-insp-record |
| batch-releases | /api/v1/batch-releases | HMV4_BREL_RECORD_FIXTURE | data-hmv4-brel-record |
| engineering-changes | /api/v1/engineering-changes | HMV4_ECO_RECORD_FIXTURE | data-hmv4-eco-record |
