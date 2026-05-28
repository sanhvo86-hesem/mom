# RACI V3 World Benchmark Map

## Official sources used in this tranche

1. ISO 9001 official page: current published standard remains `ISO 9001:2015`; ISO notes the published amendment `ISO 9001:2015/Amd 1:2024` and shows `ISO/FDIS 9001` under development with expected publication in September 2026.
   Link: https://www.iso.org/standard/62085.html
   Link: https://www.iso.org/standard/88464.html

2. ISO 45001 official page: current published standard remains `ISO 45001:2018`; ISO states the version remains current after 2024 review and also shows amendment / revision lifecycle.
   Link: https://www.iso.org/standard/63787.html

3. ISO/IEC 27001 official page: current information-security management baseline is `ISO/IEC 27001:2022`.
   Link: https://www.iso.org/standard/27001

4. NIST official CSF references: CSF 2.0 is the current cybersecurity baseline, and NIST continues to publish implementation resources and manufacturing-aligned material under the 2.0 model.
   Link: https://www.nist.gov/node/1840561
   Link: https://www.nist.gov/nist-work/improved-cybersecurity
   Link: https://www.nist.gov/news-events/news/2025/09/cybersecurity-framework-20-manufacturing-profile-nist-ir-8183r2-initial

## Operational interpretation for this repo

1. RACI / Authority docs must not present `ISO 9001:2026` as the current in-force standard today. At most, `2026` can be described as draft or expected future publication.
2. EHS / incident / near-miss governance should keep aligning with ISO 45001 language around hazard, incident, emergency planning, worker participation, and continual improvement.
3. System-access, break-glass, audit-trail, and privileged-role governance should stay aligned with ISO/IEC 27001 and NIST CSF 2.0 rather than local ad hoc wording.
4. Manufacturing-cyber hardening should reference NIST’s manufacturing profile material when system / MOM / ERP / equipment-interface decisions need a public benchmark and repo policy does not permit broader external domains.

## Deliberate limitation

This tranche did not use direct SEMI references because repository research policy explicitly allowlists a narrower set of external domains. Semiconductor-specific operational scenarios were therefore hardened from repo-truth process risk plus the approved ISO/NIST manufacturing-adjacent sources above.
