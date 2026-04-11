# Runtime state sanitation

- Session files, rate-limit counters và php_error.log không thuộc controlled package.
- Chỉ giữ cấu trúc thư mục trống + README để môi trường triển khai tự tạo runtime data.
- Mọi gói phát hành QMS phải được làm sạch runtime artifacts trước khi bàn giao.
- Structured audit evidence trong `mom/data/audit/*.jsonl` la authority runtime va khong duoc xoa bo trong cleanup hygiene.
- Dung `mom/tools/runtime_cleanup.py` de rotate `php_error.log`, xoa `.DS_Store` / `__pycache__`, va purge session chi theo retention policy.
