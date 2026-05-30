# P01 Test Evidence

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

## Web Research Evidence

- NIST SI/SP 330 and SI Units pages found on `nist.gov`.
- OPC Foundation EUInformation page found on `opcfoundation.org`.
- ISA-95 official page found on `isa.org`.
- NIST AI RMF page found on `nist.gov`.
- SAP Help UoM pages found on `help.sap.com`.
- Siemens Opcenter, Dassault DELMIA, AVEVA MES, and Tulip CDM/Units pages found on allowed domains.

## Commands To Run After Writing

```text
grep -R "CONTROLLED_GAP\\|GLOBAL_STANDARD" _reports/uom-v5/P01* || true
Expected: controlled gaps and global standard tags are visible.
Result: tags visible across matrix, reports, simulation, and decision.
```

```text
test -s _reports/uom-v5/P01-global-standards-authority-matrix.md
Expected: exit 0.
Result: matrix ok.
```

```text
php -r 'json_decode(file_get_contents("_reports/uom-v5/P01-decision.json"), true, flags: JSON_THROW_ON_ERROR); echo "json ok\n";'
Expected: json ok.
Result: json ok.
```

## Test Classification

P01 is report-only. Full PHPStan/PHPUnit is not required by risk because no runtime code changed.
