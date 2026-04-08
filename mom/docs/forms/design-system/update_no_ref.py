# -*- coding: utf-8 -*-
"""Rebuild FRM-511 and FRM-651 with 6-zone checklist (no Ref column)"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Just re-run the create scripts with updated CK_ZONES
# We need to update the zone constant in both scripts

# === Update create_frm511_v3.py ===
f511 = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/create_frm511_v3.py"
with open(f511, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace old 7-zone with new 6-zone
code = code.replace(
    "CK_ZONES = [(1,2), (3,5), (6,19), (20,31), (32,35), (36,38), (39,NC)]",
    "CK_ZONES = [(1,2), (3,5), (6,21), (22,31), (32,35), (36,NC)]"
)

# Update column header definition
code = code.replace(
    "CKH = [(1,2,'#'),(3,5,'Cat.'),(6,19,'Setup / FP Check Item'),\n"
    "       (20,31,'Acceptance / Control Rule'),(32,35,'Result'),\n"
    "       (36,38,'Owner'),(39,NC,'Ref.')]",
    "CKH = [(1,2,'#'),(3,5,'Cat.'),(6,21,'Setup / FP Check Item'),\n"
    "       (22,31,'Acceptance / Control Rule'),(32,35,'Result'),\n"
    "       (36,NC,'Owner')]"
)

# Update ckrow function - remove Ref zone handling
code = code.replace(
    '    zone_fills = [fi(P[\'fog\']),                                          # #\n'
    '                  fi(catc[0]) if catc else fi(P[\'fog\']),                  # Cat\n'
    '                  ifill,                                                   # Item\n'
    '                  fi(P[\'fog\']),                                            # Criteria\n'
    '                  fi(P[\'white\']),                                          # Result\n'
    '                  fi(P[\'white\']),                                          # Owner\n'
    '                  fi(P[\'white\'])]                                          # Ref',
    '    zone_fills = [fi(P[\'fog\']),                                          # #\n'
    '                  fi(catc[0]) if catc else fi(P[\'fog\']),                  # Cat\n'
    '                  ifill,                                                   # Item\n'
    '                  fi(P[\'fog\']),                                            # Criteria\n'
    '                  fi(P[\'white\']),                                          # Result\n'
    '                  fi(P[\'white\'])]                                          # Owner'
)

# Remove the Ref cell styling in ckrow
code = code.replace(
    "    for s in [32,36,39]:\n"
    "        ws.cell(r,s).font=fo(8,False,'dk'); ws.cell(r,s).alignment=AC",
    "    for s in [32,36]:\n"
    "        ws.cell(r,s).font=fo(8,False,'dk'); ws.cell(r,s).alignment=AC"
)

# Update DV range (Result column stays at col 32 = AF)
# No change needed for DV

with open(f511, 'w', encoding='utf-8') as f:
    f.write(code)
print("FRM-511 script updated: 6-zone checklist")

# === Update create_frm651_sample.py ===
f651 = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/create_frm651_sample.py"
with open(f651, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "CK_ZONES = [(1,2),(3,5),(6,19),(20,31),(32,35),(36,38),(39,NC)]",
    "CK_ZONES = [(1,2),(3,5),(6,21),(22,31),(32,35),(36,NC)]"
)

code = code.replace(
    "CKH = [(1,2,'#'),(3,5,'Cat.'),(6,19,'Containment / Disposition Item'),\n"
    "       (20,31,'Requirement / Evidence'),(32,35,'Status'),(36,38,'Owner'),(39,NC,'Ref.')]",
    "CKH = [(1,2,'#'),(3,5,'Cat.'),(6,21,'Containment / Disposition Item'),\n"
    "       (22,31,'Requirement / Evidence'),(32,35,'Status'),(36,NC,'Owner')]"
)

code = code.replace(
    "    zone_fills = [fi(P['fog']),                                          # #\n"
    "                  fi(catc[0]) if catc else fi(P['fog']),                  # Cat\n"
    "                  ifill,                                                   # Item\n"
    "                  fi(P['fog']),                                            # Criteria\n"
    "                  fi(P['white']),                                          # Result\n"
    "                  fi(P['white']),                                          # Owner\n"
    "                  fi(P['white'])]                                          # Ref",
    "    zone_fills = [fi(P['fog']),                                          # #\n"
    "                  fi(catc[0]) if catc else fi(P['fog']),                  # Cat\n"
    "                  ifill,                                                   # Item\n"
    "                  fi(P['fog']),                                            # Criteria\n"
    "                  fi(P['white']),                                          # Result\n"
    "                  fi(P['white'])]                                          # Owner"
)

code = code.replace(
    "    for s in [32,36,39]:\n"
    "        ws.cell(r,s).font = fo(8,False,'dk'); ws.cell(r,s).alignment = AL if s < 25 else AC",
    "    for s in [32,36]:\n"
    "        ws.cell(r,s).font = fo(8,False,'dk'); ws.cell(r,s).alignment = AL if s < 25 else AC"
)

with open(f651, 'w', encoding='utf-8') as f:
    f.write(code)
print("FRM-651 script updated: 6-zone checklist")

print("\nNew checklist layout:")
print("  #(1-2) | Cat(3-5) | Item(6-21) | Criteria(22-31) | Result(32-35) | Owner(36-40)")
print("  Item gained +2 cols (70mm -> 80mm), Owner gained +2 cols (15mm -> 25mm)")
print("  Ref column REMOVED")
