# Retention Matrix (v10)

Map of folder type → Purview retention label → period.

| Folder type                       | Purview label                  | Period            | Standard backing |
|-----------------------------------|--------------------------------|-------------------|------------------|
| Mill cert + heat genealogy        | RetentionLabel-Quality-10yr    | 10 years          | SEMI F20 + AS6174 + customer PO |
| Surface-finish + ESCA             | RetentionLabel-Quality-10yr    | 10 years          | SEMI F19 / F60 |
| Helium leak cert                  | RetentionLabel-LifeOfPart      | Life-of-Part      | SEMI F1 |
| Welding WPS/PQR                   | RetentionLabel-LifeOfWPS-10yr  | Life-of-WPS + 10y | SEMI F78/F81 + ASME IX |
| Particle/ionic/GCMS/FTIR          | RetentionLabel-Quality-7yr     | 7-10 years        | SEMI F57/F70 |
| Packaging MSL logs                | RetentionLabel-Packaging-1yr   | Installed + 1y    | J-STD-033 |
| Counterfeit-Prevention AS6174     | RetentionLabel-AS6174-10yr     | 10 years          | SAE AS6174 |
| Safety flow-down (S2/S8/S14/S22)  | RetentionLabel-Safety-LoE      | Life-of-Equipment | SEMI S2 |
| HR records                        | RetentionLabel-HR-VN-10yr      | 10y post-leave    | VN Labor Code |
| Finance records                   | RetentionLabel-Finance-10yr    | 10 years          | VN Accounting Law |
| PDPL data subject                 | RetentionLabel-PDPL-Request    | per request       | VN Decree 13/2023 |
| Customer contracts                | RetentionLabel-Contract-10yr   | 10y post-expire   | Civil Code + customer |
| SCAR closed                       | RetentionLabel-SCAR-7yr        | 7y post-closure   | Customer PO |
| Internal audit closed             | RetentionLabel-Audit-10yr      | 10 years          | ISO 9001 / AS9100D |
| Customer audit closed             | RetentionLabel-Audit-10yr      | 10 years          | Customer + AS9100D |
| ECN closed                        | RetentionLabel-ECN-10yr        | 10 years          | Customer PO |
| CAPA closed                       | RetentionLabel-CAPA-10yr       | 10 years          | ISO 9001 |
