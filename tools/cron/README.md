# Cron triển khai vận hành

## Cài

1. Tạo API key:

   `sudo install -d -m 750 -o www-data -g www-data /var/www/data-private/secrets`

   `echo "<KEY_SINH_TỪ_CỔNG>" | sudo tee /var/www/data-private/secrets/cron-api-key > /dev/null`

   `sudo chmod 600 /var/www/data-private/secrets/cron-api-key`

   `sudo chown www-data:www-data /var/www/data-private/secrets/cron-api-key`

2. Cài systemd unit:

   `sudo cp /var/www/eqms.hesemeng.com/tools/cron/deploy-*.{service,timer} /etc/systemd/system/`

   `sudo systemctl daemon-reload`

   `sudo systemctl enable --now deploy-drill-cron.timer`

   `sudo systemctl enable --now deploy-availability-check.timer`

   `sudo systemctl enable --now deploy-doc-usage-cron.timer`

3. Kiểm:

   `sudo systemctl list-timers --all | grep deploy`

   `sudo tail -f /var/log/qms-drill-cron.log`

   `sudo tail -f /var/log/qms-availability-cron.log`

   `sudo tail -f /var/log/qms-doc-usage-cron.log`

## Lịch trình

| Timer | Tần suất | Endpoint | Thông báo |
|---|---|---|---|
| `deploy-drill-cron.timer` | 06:00 mỗi ngày | `deploy_drill_reminders_run` | Trưởng QMS, QA (Zalo OA + log) khi có diễn tập quá hạn |
| `deploy-availability-check.timer` | 06:30 mỗi ngày | `deploy_availability_check` | Trưởng QMS khi có người dẫn dắt vắng chưa có người trực thay |
| `deploy-doc-usage-cron.timer` | 15 phút/lần | `deploy_doc_usage_aggregate` | Không — cập nhật KPI USE-01/02/03 lên bảng điều khiển |

## Yêu cầu

- File `/var/www/data-private/secrets/cron-api-key` chứa khóa API
  sinh từ trang Quản trị → Khóa API trên cổng (vai trò `cron`).
- Quyền 600, chủ sở hữu `www-data` để PHP-FPM đọc được, người khác không đọc.
- Token Zalo OA đặt riêng tại `/var/www/data-private/secrets/zalo-oa-token`,
  chỉ `NotificationGateway` đọc.
