# HESEM QMS — Language Convention

## Nguyên tắc bắt buộc:

1. **Backend (PHP, SQL, JSON config, API responses)**: Tiếng Anh hoàn toàn
   - Variable names, field names, table names, column names: English
   - API action names: English (snake_case)
   - Error codes: English
   - Comments in code: English

2. **Frontend (JS, HTML, CSS)**: Tiếng Việt có dấu cho end-user text
   - Tất cả text hiển thị cho user: Tiếng Việt CÓ DẤU
   - Dùng `_t('Tiếng Việt có dấu', 'English')` cho mọi text
   - KHÔNG BAO GIỜ viết tiếng Việt không dấu (Tong quan → Tổng quan)
   - Labels, placeholders, tooltips, error messages: Vietnamese có dấu
   - Block catalog labels: Vietnamese có dấu
   - Exception bắt buộc: controlled document language switching phải tuân theo `37-document-translation-publication-workflow.md`
   - `_t(...)` áp dụng cho portal shell/runtime UI; không được dùng như cơ chế browser live translation cho document body

3. **Database migrations**: English
   - Table names, column names: English
   - COMMENT ON TABLE: Bilingual (English / Vietnamese có dấu)

4. **Core standards docs**: Bilingual hoặc English
