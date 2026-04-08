# Module Builder NextGen Upgrade — 2026-04-07

## Tóm tắt

Bản nâng cấp này biến module builder hiện tại thành một cockpit có lớp quản trị module-level và schema-level mạnh hơn, hướng tới ERP / MES / eQMS quy mô enterprise.

## 1) Nâng cấp trong `00-block-engine.js`

Patch schema bổ sung các section mới cho hầu hết block:

### General
- Governance metadata
  - domain
  - boundedContext
  - entityKey
  - ownerTeam
  - processOwner
  - lifecycle
  - criticality
  - packRef
  - tagsText
  - auditRequired
  - note

### Data
- Query / data pipeline
  - dataSource.mode
  - dataPipeline.profile
  - primaryKey
  - labelField
  - cacheStrategy
  - offlineReady
  - joins[]
  - steps[]
  - contracts[]
- Streaming
  - connector
  - topic
  - snapshotField
  - refreshMs
  - bufferSize

### Style
- Design system
  - themePreset
  - density
  - shellPreset
  - surfaceVariant
  - semanticTone
  - motionPreset
  - className
  - cssVars
- Responsive grid
  - mobile/tablet/desktop/wide span
  - hide per breakpoint
  - overflowMode
  - stickyPriority
  - print preset

### Events
- Action flow orchestration
  - eventFlow.steps[]
- Automation policy
  - requireComment
  - requireESign
  - requireApproval
  - approvalWorkflow
  - rollbackOnError
  - concurrencyKey
  - namespace
  - note

## 2) Nâng cấp trong `31-module-builder.js`

### Module Studio
Bổ sung cockpit ở right rail cho module-level metadata:

- Overview
  - title vi/en
  - subtitle vi/en
  - icon
  - route
  - roles CSV
- Governance
  - domain
  - bounded context
  - owner team
  - process owner
  - lifecycle
  - release channel
  - criticality
  - feature flag
  - tags CSV
  - docs URL
  - support group
- Design
  - theme preset
  - density
  - shell preset
  - navigation mode
  - default breakpoint
- Quality
  - test owner
  - last reviewed on
  - smoke checklist
  - critical journeys
  - acceptance criteria
  - readiness notes
- Publish / Integration
  - environment
  - publish mode
  - rollout percent
  - require signoff
  - change summary
  - release note
  - primary entity
  - source systems CSV
  - digital thread CSV
  - default API namespace

### Builder hero actions
- Open Module Studio
- Duplicate module
- Export builder JSON
- Export runtime JSON
- Existing preview / save / undo / redo vẫn giữ nguyên

### Manifest + readiness
- builderManifest được sync với:
  - patchVersion
  - domain
  - boundedContext
  - lifecycle
  - releaseChannel
  - criticality
  - themePreset
  - navigationMode
  - tabCount
  - blockCount
  - readinessScore
  - updatedAt
  - updatedBy
- readiness score dựa trên các trường governance / design / QA / publish / integration quan trọng.

## 3) Kỳ vọng sử dụng

Bản này phù hợp để tiếp tục phát triển các capability sau:

- catalog template theo domain
- packaging / promotion workflow dev → sit → uat → prod
- approval / e-sign cho publish
- visual action flow editor thực sự dạng graph
- reusable module package / plugin marketplace
- automated QA gates và release checklist

## 4) Ghi chú kỹ thuật

- Patch được chèn theo kiểu wrapper / extension để giảm phụ thuộc vào việc chỉnh tay sâu trong file gốc.
- Syntax đã được kiểm tra trước khi đóng gói.
