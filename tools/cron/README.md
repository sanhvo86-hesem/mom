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

3. Kiểm:

   `sudo systemctl list-timers --all | grep deploy`

   `sudo tail -f /var/log/qms-drill-cron.log`

   `sudo tail -f /var/log/qms-availability-cron.log`
