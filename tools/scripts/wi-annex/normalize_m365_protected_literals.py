#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]

TARGET_FILES = [
    ROOT / "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-116-m365-folder-structure-blueprint.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-131-m365-records-metadata-list-schema-and-register-catalog.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-132-m365-records-flow-approval-sharing-and-exception-control.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-137-evidence-and-records-naming-convention.html",
    ROOT / "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-138-sharepoint-local-sync-and-git-workspace-boundary.html",
]

# Canonical proper nouns from current core standards.
CANONICAL_REPLACEMENTS = [
    ("HESEM-QMS-Core", "HESEM-Records"),
    ("HESEM-QMS-Cốt lõi", "HESEM-Records"),
    ("HESEM-Con Người-Hạn chế", "HESEM-People"),
    ("HESEM-Con người-Hạn chế", "HESEM-People"),
    ("HESEM-People-Restricted", "HESEM-People"),
    ("HESEM-People-Hạn chế", "HESEM-People"),
    ("HESEM-Số hóa-Control", "HESEM-Digital"),
    ("HESEM-Digital-Control", "HESEM-Digital"),
    ("01-QMS-Hồ sơ", "QMS-Governance"),
    ("01-QMS-Records", "QMS-Governance"),
    ("02-Quality-Hồ sơ", "Quality-Records"),
    ("02-Chất lượng-Hồ sơ", "Quality-Records"),
    ("02-Quality-Records", "Quality-Records"),
    ("03-Job-Hồ sơ", "Job-Dossiers"),
    ("03-Job-Records", "Job-Dossiers"),
    ("03-Job-Dossiers", "Job-Dossiers"),
    ("04-Đào tạo-Hồ sơ", "Training-Records"),
    ("04-Training-Hồ sơ", "Training-Records"),
    ("04-Training-Records", "Training-Records"),
    ("05-Phòng ban-Hồ sơ", "Department-Ops"),
    ("05-Department-Records", "Department-Ops"),
    ("08-Con Người-Hồ sơ", "Employee-Records"),
    ("08-Con người-Hồ sơ", "Employee-Records"),
    ("08-People-Records", "Employee-Records"),
    ("09-Số hóa-System-Hồ sơ", "System-Records"),
    ("09-Digital-System-Records", "System-Records"),
    ("10-QMS-Source-Control", "QMS-Source-Control"),
    ("Part-REV-Bản gốc", "Part-REV-Master"),
    ("07-Mẫu-Làm việc", "07-Working-Templates"),
    ("07-Mẫu-Working", "07-Working-Templates"),
    ("06-Lưu trữ", "06-Archive"),
    ("M365-Hồ sơ-cung cấp / cấp phát-yêu cầu", "M365-Record-Provisioning-Requests"),
    ("Bên ngoài-chia sẻ-Phê duyệt-Log", "External-Share-Approval-Log"),
    ("QMS-Source-Promotion-Sổ đăng ký", "QMS-Source-Promotion-Register"),
    ("Server-Deploy-Sổ đăng ký", "Server-Deploy-Register"),
    ("Reverse-Sync-Sổ đăng ký", "Reverse-Sync-Register"),
    ("tự động hóa-Run-Log", "Automation-Run-Log"),
    ("Phòng ban-Khu vực-danh mục", "Department-Zone-Catalog"),
    ("Con Người-Hồ sơ-Index", "People-Dossier-Index"),
    ("Con người-Hồ sơ-Index", "People-Dossier-Index"),
    ("System-Hồ sơ-Yêu cầu-Log", "System-Record-Request-Log"),
    ("Lưu trữ-khóa-Sổ đăng ký", "Archive-Lock-Register"),
    ("QMS-Chủ sở hữu", "QMS-Owner"),
    ("QMS-QA-Biên tập viên", "QMS-QA-Editors"),
    ("QMS-ENG-Biên tập viên", "QMS-ENG-Editors"),
    ("QMS-Kế hoạch-Biên tập viên", "QMS-Plan-Editors"),
    ("QMS-PRO-Biên tập viên", "QMS-PRO-Editors"),
    ("QMS-SCM-Biên tập viên", "QMS-SCM-Editors"),
    ("QMS-SAL-Biên tập viên", "QMS-SAL-Editors"),
    ("QMS-FIN-Biên tập viên", "QMS-FIN-Editors"),
    ("QMS-EHS-Biên tập viên", "QMS-EHS-Editors"),
    ("QMS-IT-Governance viên", "QMS-IT-Governance"),
    ("QMS-IT-Quản trị viên", "QMS-IT-Governance"),
    ("QMS-ERP-Governance viên", "QMS-ERP-Governance"),
    ("QMS-ERP-Quản trị viên", "QMS-ERP-Governance"),
    ("QMS-HR-Hạn chế", "QMS-HR-Restricted"),
    ("HR-Bảng lương-Hạn chế", "HR-Payroll-Restricted"),
    ("HR-y tế-Hạn chế", "HR-Medical-Restricted"),
    ("QMS-External-Khách-Hạn chế", "QMS-External-Customer-Restricted"),
    ("DEP-EXEC-Biên tập viên", "DEP-EXEC-Editors"),
    ("DEP-QMS-Biên tập viên", "DEP-QMS-Editors"),
    ("DEP-QA-Biên tập viên", "DEP-QA-Editors"),
    ("DEP-ENG-Biên tập viên", "DEP-ENG-Editors"),
    ("DEP-PRO-Biên tập viên", "DEP-PRO-Editors"),
    ("DEP-SCM-Biên tập viên", "DEP-SCM-Editors"),
    ("DEP-SAL-Biên tập viên", "DEP-SAL-Editors"),
    ("DEP-FIN-Biên tập viên", "DEP-FIN-Editors"),
    ("DEP-HR-Biên tập viên", "DEP-HR-Editors"),
    ("DEP-EHS-Biên tập viên", "DEP-EHS-Editors"),
    ("DEP-IT-Biên tập viên", "DEP-IT-Editors"),
    ("DEP-ERP-Biên tập viên", "DEP-ERP-Editors"),
    ("DEP-{DeptCode}-Biên tập viên", "DEP-{DeptCode}-Editors"),
]

# Path / folder / tree segments that must stay English.
PATH_SEGMENT_REPLACEMENTS = [
    ("Change-Hồ sơ", "Change-Records"),
    ("Communication-Hồ sơ", "Communication-Records"),
    ("Document-Control-Hồ sơ", "Document-Control-Records"),
    ("Contingency-Hồ sơ", "Contingency-Records"),
    ("Customer-Khiếu nại", "Customer-Complaints"),
    ("Supplier-Hồ sơ", "Supplier-Records"),
    ("Kiểm tra-Hồ sơ", "Inspection-Records"),
    ("SPC-Hồ sơ", "SPC-Records"),
    ("QC-Hold-Các nhật ký", "QC-Hold-Logs"),
    ("Active-Nhân viên", "Active-Employees"),
    ("trước đây-Nhân viên", "Former-Employees"),
    ("nhà thầu-and-thực tập sinh", "Contractors-and-Interns"),
    ("Khách tham quan-and-tạm thời-Truy cập", "Visitors-and-Temporary-Access"),
    ("Truy cập-and-nhận dạng", "Access-and-Identity"),
    ("M365-and-SharePoint-cấu hình", "M365-and-SharePoint-Configuration"),
    ("Epicor-Bản gốc-Data-and-Role-Control", "Epicor-Master-Data-and-Role-Control"),
    ("Triển khai-UAT-Chuyển giao hệ thống", "Deployment-UAT-and-Cutover"),
    ("Backup-khôi phục-and-Khôi phục", "Backup-Restore-and-Recovery"),
    ("Sự cố-and-Vấn đề-Quản lý", "Incident-and-Problem-Management"),
    ("Tài sản-and-điểm cuối-Control", "Asset-and-Endpoint-Control"),
    ("Quản lý-Rà soát", "Management-Review"),
    ("Nội bộ-đợt đánh giá", "Internal-Audits"),
    ("Bên ngoài-đợt đánh giá-and-CB", "External-Audits-and-CB"),
    ("Rủi ro-and-Cơ hội", "Risk-and-Opportunity"),
    ("Thay đổi-Control", "Change-Control"),
    ("Tài liệu-Control-and-phát hành", "Document-Control-and-Issuance"),
    ("Truyền đạt-and-Lãnh đạo", "Communication-and-Leadership"),
    ("bối cảnh-and-Quan tâm-bên liên quan", "Context-and-Interested-Parties"),
    ("Liên tục-Cải tiến-and-Kaizen", "Continual-Improvement-and-Kaizen"),
    ("dự phòng-and-Gián đoạn", "Contingency-and-Disruption"),
    ("pháp lý-and-Tuân thủ", "Legal-and-Compliance"),
    ("Kiến thức-and-bài học-rút kinh nghiệm", "Knowledge-and-Lessons-Learned"),
    ("Thẩm quyền-RACI-Phó", "Authority-RACI-Deputy"),
    ("Chất lượng-Kế hoạch", "Quality-Planning"),
    ("Kiểm tra-thực thi", "Inspection-Execution"),
    ("Hiệu chuẩn-and-MSA", "Calibration-and-MSA"),
    ("Sản phẩm-An toàn-and-FOD", "Product-Safety-and-FOD"),
    ("Đầu tiên-chi tiết / sản phẩm", "First-Piece"),
    ("Chuyên cần-and-Class-Hồ sơ", "Attendance-and-Class-Records"),
    ("Năng lực-đánh giá", "Competence-Assessment"),
    ("Chứng nhận-Sổ đăng ký", "Certification-Register"),
    ("Kỹ năng-Matrix-and-phạm vi bao phủ", "Skill-Matrix-and-Coverage"),
    ("Academy-nội dung-Control", "Academy-Content-Control"),
    ("An toàn-đào tạo hội nhập-and-đặc biệt-buổi họp ngắn", "Safety-Induction-and-Special-Briefings"),
    ("01-Quản trị", "01-Governance"),
    ("99-Lưu trữ", "99-Archive"),
    ("01-Inputs-and-yêu cầu/", "01-Inputs-and-Requirements/"),
]

CONTROLLED_REPLACEMENTS = CANONICAL_REPLACEMENTS + PATH_SEGMENT_REPLACEMENTS


def normalize_literal_text(text: str) -> str:
    updated = text
    for old, new in CONTROLLED_REPLACEMENTS:
        updated = updated.replace(old, new)
    return updated


def main() -> int:
    changed = 0
    for path in TARGET_FILES:
        original = path.read_text(encoding="utf-8")
        updated = normalize_literal_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"[OK] {path.relative_to(ROOT)}")
    print(f"Normalized {changed} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
