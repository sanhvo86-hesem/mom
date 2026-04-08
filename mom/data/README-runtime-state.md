# Runtime state sanitation

- Session files, rate-limit counters và php_error.log không thuộc controlled package.
- Chỉ giữ cấu trúc thư mục trống + README để môi trường triển khai tự tạo runtime data.
- Mọi gói phát hành QMS phải được làm sạch runtime artifacts trước khi bàn giao.
