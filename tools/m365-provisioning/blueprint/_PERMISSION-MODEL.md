# Permission Model (v10)

## Information Barriers (IB v2)

IB binds at SITE level, not folder level (Microsoft Learn,
https://learn.microsoft.com/en-us/purview/information-barriers-sharepoint).

Therefore v10 uses one site per customer (Hub-Spoke).

### IB segments

| Segment           | Filter                                    |
|-------------------|-------------------------------------------|
| AMAT              | MemberOf -eq "SG-CUSTOMER-AMAT"           |
| LAM               | MemberOf -eq "SG-CUSTOMER-LAM"            |
| ASML              | MemberOf -eq "SG-CUSTOMER-ASML"           |
| TEL               | MemberOf -eq "SG-CUSTOMER-TEL"            |
| HESEM-Unrestricted| MemberOf "SG-ALL-HESEM" AND NOT "SG-CUSTOMER-*" |

Six block policies (each customer pair is mutually incompatible).

## Sensitivity labels

  HESEM-Public                                  no encryption
  HESEM-Internal                                no encryption
  HESEM-Restricted-HR                           encrypt; SG-DEP-HR + SG-DEP-EXEC
  HESEM-Restricted-Finance                      encrypt; SG-DEP-FIN + SG-DEP-EXEC
  HESEM-IP-Confidential                         encrypt; SG-ALL-HESEM (no externals)
  Customer:AMAT-Confidential                    encrypt; SG-CUSTOMER-AMAT
  Customer:LAM-Confidential                     encrypt; SG-CUSTOMER-LAM
  Customer:ASML-Confidential                    encrypt; SG-CUSTOMER-ASML
  Customer:TEL-Confidential                     encrypt; SG-CUSTOMER-TEL
  Customer:<X>-Source-IP-DKE                    DKE; SG-CUSTOMER-X-DKE-APPROVERS only

## Security group naming

  SG-ALL-HESEM
  SG-DEP-{Code}              (16: EXEC, QMS, QA, METRO, ENG, PRO, SP, MNT,
                              SCM, SCS, FIN, HR, EHS, IT, ERP, LEGAL)
  SG-ROLE-{RoleName}         (e.g. SG-ROLE-QMSDOCCONTROL, SG-ROLE-INTERNAL-AUDITOR,
                              SG-ROLE-SQE, SG-ROLE-MRBCHAIR)
  SG-CUSTOMER-{Code}         (AMAT / LAM / ASML / TEL)
  SG-CUSTOMER-{Code}-DKE-APPROVERS

## Licensing

Microsoft 365 E5 or E3 + Purview Suite required for IB + sensitivity labels +
auto-apply + 1-year audit retention. At ~200 users this is a non-trivial line.

## Audit retention

E3 default: 180 days (INSUFFICIENT for SQEP audit window).
E5/Purview Suite: 1 year (default acceptable).
10-Year add-on: recommended for SG-DEP-ENG and SG-ROLE-PROGRAMMGMT.
