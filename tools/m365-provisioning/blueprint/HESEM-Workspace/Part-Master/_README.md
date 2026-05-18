# Part-Master — Engineering vault (PLM-frozen)

Path: `Part-Master/{CustomerCode}/{PartNumber}/{Rev}/`

Customer-major key (so AMAT engineer with IB scope sees only AMAT parts).
PartNumber is customer's PN. Rev is engineering revision (A, B, C, A01, ...).

## 7 Engineering Deliverables (each with 3-state lifecycle)

1. **01-Drawing** — Customer drawing PDF, DWG
2. **02-Model-3D** — STEP, IGES, MBD with PMI
3. **03-BOM** — Bill of Materials
4. **04-CAM** — NC programs, post-processor refs, tool list
5. **05-Inspection-Plan** — CMM .prg, balloon, control plan, MSA ref
6. **06-Specification** — Special-process spec per customer
7. **07-FAI-Baseline** — Last released FAI reference (read-only)

Plus:
- **08-ECN-PCN-History** — Engineering changes (each ECN has own 3-state)
- **09-Approved-Source-List** — Material + special-process subcon
- **10-Tooling-Fixture-Refs** — Links to Asset-Master
- **11-Customer-Standards-Linked** — Links to Customer-Account/Standards-Library
- **12-Trade-Secret-Restricted** — Recipe/know-how (L4)
- **99-Superseded** — Old Rev when new Rev released

## 3-state lifecycle (every deliverable)

- **1-Working/{Initials}/** — Author draft (Edit per author + Sr peer mentor)
- **2-In-Review/** — Pending review + approval (Read SG-DEP, Approve = SG-Eng-Manager)
- **3-Released/** — Frozen master, read-only after Power Automate promotion (write-blocked)

Job-Dossier/.../01-Engineering-Release/ contains `_release-manifest.json`
with modern-link references to 3-Released — NEVER copy files.
