# Checklist Test Word-like Editor (HESEM QMS)

## 1) Mục tiêu
- Xác nhận các lệnh soạn thảo hoạt động gần hành vi Microsoft Word nhất có thể trong kiến trúc web hiện tại.
- Tìm lỗi chức năng, lỗi hành vi bất thường, lỗi ổn định và lỗ hổng chèn nội dung.
- Ghi kết quả theo mã test để vá theo vòng lặp ngắn.

## 2) Ma trận môi trường bắt buộc
- Windows 11 + Chrome bản mới nhất.
- Windows 11 + Edge bản mới nhất.
- macOS + Chrome/Safari.
- Android Chrome (ít nhất 1 máy).
- iOS Safari (ít nhất 1 máy).

## 3) Dữ liệu test chuẩn
- Tài liệu có: văn bản dài 5-10 trang, bảng 6x6, ảnh lớn + ảnh nhỏ, checklist, shape, chart, textbox.
- Chuỗi test tìm kiếm: `Alpha`, `alpha`, `ALPHA`, `αβγ`, `123-XYZ`, `Từ khóa tiếng Việt`.
- Nội dung dán từ Word: heading, table, bullet, numbering, hyperlink, hình ảnh.

## 4) Checklist chi tiết theo lệnh/nhóm lệnh

## A. Core Editing Commands
| ID | Lệnh/nhóm | Bước test | Kỳ vọng (Word-like) | Mức độ |
|---|---|---|---|---|
| W-001 | `Undo` | Gõ 1 đoạn, bấm `Ctrl+Z` 3 lần | Lùi đúng từng bước thay đổi | P0 |
| W-002 | `Redo` | Sau `Undo`, bấm `Ctrl+Y` | Khôi phục đúng thứ tự | P0 |
| W-003 | `Bold` | Chọn từ, bấm `Ctrl+B` 2 lần | Bật/tắt đậm ổn định | P0 |
| W-004 | `Italic` | Chọn từ, bấm `Ctrl+I` | Áp dụng nghiêng chính xác | P1 |
| W-005 | `Underline` | Chọn từ, bấm `Ctrl+U` | Gạch chân đúng vùng chọn | P1 |
| W-006 | `Strike` | Dùng nút strike | Không phá format xung quanh | P2 |
| W-007 | `Sub/Superscript` | Áp dụng trên cùng 1 từ | Chuyển trạng thái đúng, không lệch dòng quá mức | P1 |
| W-008 | `Remove format` | Văn bản đã nhiều style -> clear | Xóa style, giữ text content | P1 |
| W-009 | Font name | Đổi font 3 lần liên tục | Font thay đúng vùng chọn | P1 |
| W-010 | Font size | Đổi cỡ 8/12/24 | Không mất selection | P1 |

## B. Paragraph & Layout
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-011 | Heading H1/H2/H3 | Áp dụng heading rồi đổi về Normal | Cấu trúc block đúng | P1 |
| W-012 | Align left/center/right/justify | Thử trên 1 đoạn dài | Căn dòng đúng, không nhảy style | P1 |
| W-013 | Line spacing | Chuyển 1.0 / 1.5 / 2.0 | Dòng thay đúng đoạn hiện tại | P2 |
| W-014 | Indent | Ấn nút indent/outdent trên đoạn thường | Mức thụt ổn định | P2 |
| W-015 | Tab thường | Con trỏ ngoài bảng/list -> bấm Tab | Chèn indent mềm ổn định | P2 |
| W-016 | Tab trong list | Trong `li`, bấm Tab/Shift+Tab | Tăng/giảm cấp list như Word | P1 |
| W-017 | Tab trong table | Trong ô bảng, bấm Tab | Chuyển ô kế tiếp | P0 |
| W-018 | Tab ô cuối bảng | Ở ô cuối cùng, bấm Tab | Tự thêm dòng mới như Word | P0 |

## C. List & Checklist
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-019 | Bullet list | Bật/tắt bullet nhiều lần | Không tạo DOM rác | P1 |
| W-020 | Numbered list | Bật/tắt numbered | Đánh số liên tục đúng | P1 |
| W-021 | Đổi list style | Disc/circle/square/roman | Style áp dụng đúng list hiện tại | P2 |
| W-022 | Checklist insert | Chèn checklist, tick/untick | Checkbox hoạt động, text edit bình thường | P1 |

## D. Find/Replace
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-023 | `Ctrl+F` | Mở thanh tìm kiếm | Focus ô find | P1 |
| W-024 | `Ctrl+H` | Mở thay thế | Focus ô replace | P1 |
| W-025 | Find chữ thường/hoa | Tìm `alpha` trong nhiều biến thể | Có highlight + count đúng | P1 |
| W-026 | Replace one | Thay 1 kết quả | Chỉ thay match hiện tại | P1 |
| W-027 | Replace all | Thay tất cả | Không phá shape/chart/textbox | P0 |
| W-028 | Close find | Đóng thanh tìm | Gỡ toàn bộ highlight tạm | P2 |

## E. Link/Image/Paste
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-029 | Insert link | URL hợp lệ + text tùy ý | Chèn link đúng, mở tab mới | P1 |
| W-030 | Link protocol độc hại | Dùng `javascript:` | Bị chặn, không chèn | P0 |
| W-031 | Insert image URL | URL ảnh hợp lệ + width | Ảnh hiển thị đúng tỷ lệ | P1 |
| W-032 | Upload image | File png/jpg <=10MB | Chèn ảnh thành công | P1 |
| W-033 | Upload sai loại file | PDF/EXE đổi đuôi | Bị từ chối | P0 |
| W-034 | Resize image | Kéo handle đủ hướng | Cập nhật kích thước mượt, không vỡ layout | P1 |
| W-035 | Align image | Left/center/right/inline | Căn đúng | P2 |
| W-036 | Paste from Word basic | Dán đoạn + heading | Không mang script/style độc hại | P0 |
| W-037 | Paste Word table | Dán bảng Word | Không vỡ editor, bảng vẫn chỉnh được | P1 |

## F. Table Commands
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-038 | Insert table | Chèn 3x3 + header | Render đúng | P1 |
| W-039 | Add/del row | Thêm/xóa row bằng context menu | Hoạt động đúng vị trí | P1 |
| W-040 | Add/del col | Thêm/xóa col | Hoạt động đúng vị trí | P1 |
| W-041 | Merge/split | Gộp phải, gộp xuống, tách | Không lỗi DOM | P1 |
| W-042 | Cell align | Căn trái/giữa/phải + vertical | Áp dụng đúng ô | P2 |
| W-043 | Border & radius | Đổi độ dày/màu/bo góc | Hiển thị đúng | P2 |
| W-044 | Resize col drag | Kéo biên cột | Width thay đổi ổn định | P1 |
| W-045 | Reset responsive | Double-click cell sau fixed | Trở về responsive | P2 |
| W-046 | Save/reopen table | Lưu bản nháp, mở lại | Width cột giữ nguyên | P0 |
| W-046A | Add row with rowspan | Bảng có ô rowspan=2, thêm hàng trên/dưới vùng span | Không vỡ lưới; rowspan liên quan tự điều chỉnh | P0 |
| W-046B | Add col with colspan | Bảng có ô colspan=2, thêm cột trái/phải vùng gộp | Cột mới chèn đúng logic, không lệch dữ liệu | P0 |
| W-046C | Delete row in merged grid | Xóa hàng có ô neo rowspan và hàng bị che bởi rowspan | Không mất dữ liệu ngoài vùng xóa, DOM hợp lệ | P0 |
| W-046D | Delete col in merged grid | Xóa cột đi qua ô colspan/ô thường xen kẽ | colspan giảm đúng, bảng không méo | P0 |
| W-046E | Toggle header row/col | Bật/tắt header row + header col trên bảng đã merge | Chuyển `td/th` ổn định, không mất style/chữ | P1 |
| W-046F | Tab in merged table | Tab/Shift+Tab khi con trỏ ở ô merge | Di chuyển theo thứ tự lưới logic như Word | P0 |
| W-046G | Table properties apply | Đổi width/layout/align trong Properties | Không vỡ bảng, thay đổi áp dụng đúng | P0 |
| W-046H | Border model | Đổi border width/style/color + spacing | Viền hiển thị đúng, không mất nội dung ô | P1 |
| W-046I | Cell padding | Đặt padding 0/8/20 từ Properties | Khoảng cách trong ô đổi đúng toàn bảng | P1 |
| W-046J | Caption | Thêm/sửa/xóa caption bảng | Caption lưu đúng, không ảnh hưởng dữ liệu ô | P1 |

## G. Shape/Textbox/Chart (Word-like drawing)
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-047 | Insert textbox | Chèn textbox và gõ text | Editable trong box, khung vẫn chọn được | P1 |
| W-048 | Textbox resize | Kéo handle textbox | Kích thước đổi đúng | P1 |
| W-049 | Insert shape | Chèn 10 loại shape khác nhau | Không lỗi JS, shape chọn được | P0 |
| W-050 | Select/deselect shape | Click shape, click ngoài | Trạng thái chọn rõ ràng, không treo | P0 |
| W-051 | Move shape | Kéo thả shape nhiều lần | Không nhảy vị trí bất thường | P1 |
| W-052 | Rotate shape | Xoay tự do + giữ Shift | Có snap 15 độ khi giữ Shift | P2 |
| W-053 | Resize shape | Kéo 8 handle | Không méo bất thường ngoài ý muốn | P1 |
| W-054 | Shape text toggle | Bật/tắt text trong shape | Không làm mất shape | P2 |
| W-055 | Duplicate/Delete shape | Nhân bản và xóa | Không để lại control rác | P1 |
| W-056 | Insert chart | Tạo bar/line/pie/hbar | Render đúng dữ liệu | P1 |
| W-057 | Edit chart | Sửa data/title/color | Cập nhật tức thì | P1 |
| W-058 | Resize chart | Kéo handle chart | Tỷ lệ/khung hợp lý | P2 |

## H. Source Mode / Save / Reload / Print
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-059 | Toggle source | WYSIWYG <-> HTML | Chuyển mode không mất nội dung | P1 |
| W-060 | Block edit in source | Khi source mode bấm command format | Bị chặn đúng cảnh báo | P2 |
| W-061 | Save draft | Sửa nội dung rồi save | Trạng thái lưu thành công | P0 |
| W-062 | Reopen after save | Đóng mở lại document | Nội dung giữ đúng | P0 |
| W-063 | Print preview | In tài liệu có bảng/shape/chart | Bố cục không lỗi lớn | P2 |

## I. Keyboard & Stability
| ID | Lệnh/nhóm | Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-064 | Delete selected shape | Chọn shape -> Delete | Xóa đúng shape đang chọn | P1 |
| W-065 | Escape behavior | ESC khi shape/find/fullscreen | Đóng/deselect đúng ưu tiên | P2 |
| W-066 | Ctrl+S | Đang edit bấm Ctrl+S | Save draft không reload trang | P0 |
| W-067 | Zoom in/out | + / - nhiều lần | Không vỡ vùng thao tác | P2 |
| W-068 | Fullscreen toggle | Bật/tắt fullscreen | UI về trạng thái ban đầu chuẩn | P2 |
| W-069 | Long session 30 phút | Soạn liên tục + chèn shape/table | Không đơ, không memory leak nặng | P1 |

## J. Security (bắt buộc)
| ID | Lệnh/nhóm | Payload/Bước test | Kỳ vọng | Mức độ |
|---|---|---|---|---|
| W-070 | XSS link href | `javascript:alert(1)` | Bị chặn | P0 |
| W-071 | XSS image URL | `javascript:`/`vbscript:` | Bị chặn | P0 |
| W-072 | HTML injection alt | Alt chứa `" onerror=...` | Không thực thi script | P0 |
| W-073 | Paste script tag | Dán `<script>alert(1)</script>` | Không thực thi | P0 |
| W-074 | Data URL abuse | `data:text/html,...` vào link | Không thực thi JS | P0 |

## 5) Tiêu chí nghiệm thu vòng hiện tại
- Không còn lỗi P0 mở.
- Tỷ lệ pass tổng >= 95% cho P1.
- Không có crash editor khi thao tác shape/table/find-replace liên tiếp.

## 6) Mẫu ghi kết quả
- Dùng file: `docs/editor-wordlike-test-results-template.csv`.
- Mỗi case cần: `Result(PASS/FAIL/BLOCKED)` + `Evidence` + `BugID`.
