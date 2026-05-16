# Production-Run-Axis (v5 NEW) — consolidated production runs

For batch consolidation: 1 production run covers 3 small POs from 3 OEMs
(rare but real for efficiency on shared machines). The bath/run produces
ONE bath chemistry log, but maps to 3 Jobs.

Path: `Production-Run-Axis/{RunID}/`
- 01-Run-Setup
- 02-Bath-or-Machine-Run-Log
- 03-Linked-Jobs (back-link to Job-Dossiers)
- 04-Run-Closeout-Disposition
- 99-Archive

**Interim policy v5:** FORBID multi-OEM consolidated runs until governance
+ IB segmentation rules approved. This axis pre-allocated for future use.
