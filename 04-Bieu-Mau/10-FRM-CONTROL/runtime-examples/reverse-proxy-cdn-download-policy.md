# Reverse proxy / CDN download-only policy for HESEM FRM library

## Mandatory controls
- Preserve `Content-Disposition: attachment` for `.xlsx`.
- Preserve `X-Content-Type-Options: nosniff`.
- Do not rewrite workbook requests into inline preview.
- Do not public-cache controlled FRM workbooks.
- Do not content-transform workbook responses.
- Preserve authentication and authorization decisions from origin.
- Re-test portal click and internal-doc click after every edge change.

## Evidence
- Header capture at edge.
- Header capture at origin.
- One portal click test and one internal-doc click test.
- Confirmation that downloaded workbook opens with desktop Excel.
