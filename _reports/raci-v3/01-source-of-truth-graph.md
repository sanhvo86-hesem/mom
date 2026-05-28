# RACI V3 Source-of-Truth Graph

```mermaid
flowchart TD
    A["RACI-MASTER-MATRIX<br/>Process RACI SSOT"] --> B["RaciMatrixService<br/>Generated SOP/JD RACI blocks"]
    A --> C["check_raci_integrity.php<br/>One A, at least one R, CDR anchor parity"]
    D["decision_thresholds.bootstrap.json<br/>Threshold baseline SSOT"] --> E["decision_thresholds.json<br/>Runtime threshold registry"]
    E --> F["DecisionThresholdService<br/>AUTHORITY-MATRIX threshold block publish"]
    E --> G["check_decision_threshold_consistency.php<br/>bootstrap = runtime = published block"]
    F --> H["AUTHORITY-MATRIX<br/>Decision / threshold register"]
    B --> I["check_raci_derivatives.php<br/>Generated SOP/JD parity"]
    H --> C
    H --> J["Operator point of use<br/>Authority lookup by CDR"]
    B --> J
```

## Read order

1. `RACI-MASTER-MATRIX` governs process responsibility and gate ownership.
2. `decision_thresholds.bootstrap.json` and `decision_thresholds.json` govern threshold wording for `AUTHORITY-MATRIX`.
3. `AUTHORITY-MATRIX` is the point-of-use decision register generated from the threshold registry and cross-checked against RACI CDR usage.
4. SOP/JD RACI fragments are derivatives only; they must never outrank the master or authority registers.
