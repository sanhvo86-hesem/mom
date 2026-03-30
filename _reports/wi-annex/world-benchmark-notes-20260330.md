# WI-ANNEX world benchmark notes

Date: 2026-03-30
Scope: CNC job-order WI/ANNEX migration baseline

## Official-source notes

1. ISO 9001:2015 official overview confirms the standard covers operation, support, documented information, performance evaluation and improvement, but it does not force a WI for every activity.
Source:
- https://www.iso.org/standard/62085.html

2. GM public CSR for IATF 16949 clause 8.5.1.2 states standardized work should include `what`, `how` and `why`, and all standardized work shall be followed.
Source:
- https://www.iatfglobaloversight.org/wp/wp-content/uploads/2016/12/IATF-16949-GM-CSR_Dec.-2016-1.pdf

3. SAE and IAQG official pages confirm AS9102 / 9102 remain the aerospace first article inspection requirement, and IAQG official support materials still center the 3-form structure:
- Form 1: part number accountability
- Form 2: product accountability - materials, special processes, functional testing
- Form 3: characteristic accountability, verification, compatibility evaluation
Sources:
- https://saemobilus.sae.org/standards/as9102-aerospace-first-article-inspection-requirement
- https://scmh.iaqg.org/standard/9102-first-article-inspection-requirement/
- https://iaqg.org/wp-content/uploads/2023/03/Draft-9102-Rev-C-Forms.pdf
- https://iaqg.org/wp-content/uploads/2019/10/9102-FAQ-1.pdf

4. ISO official publication pages confirm:
- ISO 2859-1 public page still points to controlled acceptance-sampling source material and marks a newer edition available: ISO 2859-1:2026;
- HESEM should keep numeric sampling tables in released controlled references instead of copying copyrighted tables into ANNEX;
- ISO/IEC 15416:2025 is the current linear barcode print-quality test specification and is the right method reference when customer or approved label spec requires barcode verification.
Sources:
- https://www.iso.org/standard/35236.html
- https://www.iso.org/standard/83390.html

5. GS1 official guidance confirms:
- each logistic unit must be identified with a unique SSCC;
- SSCC is an 18-digit identifier;
- GS1 Logistic Labels have historically used GS1-128, with supplementary 2D use introduced in current guidance;
- pallet barcode placement shall be between 400 mm and 800 mm from the base.
Sources:
- https://www.gs1.org/standards/gs1-logistic-label-guideline/1-3
- https://www.gs1.org/docs/tl/GS1_Logistic_Label_Guideline.pdf

6. GS1 General Specifications remain the core barcode/ID standard set, and the current official page lists version 25.0 published in January 2025. GS1 official architecture/spec pages also reinforce print quality verification and conformance checking.
Sources:
- https://www.gs1.org/standards/gs1-system-architecture-document/current-standard
- https://www.gs1.org/standards/barcodes-epcrfid-id-keys/gs1-general-specifications

7. NIST SP 800-34 Rev.1 confirms contingency planning is tied to resiliency, BIA, recovery priorities and practical planning guidance.
Source:
- https://csrc.nist.gov/pubs/sp/800/34/r1/final

8. NIST SP 800-88 Rev.2 was published on September 26, 2025 and confirms a stronger focus on an enterprise media sanitization program, validation and updated sanitization recommendations.
Source:
- https://csrc.nist.gov/pubs/sp/800/88/r2/final

9. Public SEMI sources confirm current relevance of SEMI S2 safety guidance and the use of SEMI F19/F20/F57/E10/E79 families in semiconductor manufacturing contexts. Detailed acceptance numbers may still be locked in paid standards or customer specs and must not be guessed.
Sources:
- https://www.semi.org/en/standards-watch-2024-sep/new-version-of-semi-s2-0724-published
- https://store-us.semi.org/products/f10500-semi-f105-guide-for-metallic-material-compatibility-in-gas-distribution-systems
- https://www.semi.org/sites/semi.org/files/2023-12/CompilationTerms1023.pdf

## Repo-level implications

- WI phai chia ro theo user va context, khong lap lai SOP governance.
- POU-WI nen co `what-how-why`.
- Acceptance criteria cho vacuum/clean/leak/surface nen dua vao Specification Annex thay vi nhot trong WI thao tac.
- Shipping/receiving phai khoa SSCC 18-so, GS1-128, placement, traceability va print-quality logic ro hon.
- Offline fallback, backup va sanitization cho portal/M365/NC-program media phai duoc xem la control that, khong chi la note.
