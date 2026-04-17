# VPS Observability Stack Setup

## Mục tiêu

Biến tab `Observability` trong `VPS Control Tower` thành workspace xem metric và dashboard thật, ngay trong cùng domain của portal.

Luồng đúng:

- browser mở `https://qms.hesem.com.vn/ops/netdata/` hoặc `https://qms.hesem.com.vn/ops/grafana/`
- Nginx gọi `auth_request` vào `api.php?action=vps_observability_auth`
- API kiểm tra session portal + role đọc VPS
- Nginx reverse proxy vào Netdata và Grafana trên loopback
- Grafana tin cậy header `X-WEBAUTH-USER` từ Nginx auth proxy

## Tại sao dùng cách này

- Netdata cho telemetry realtime của host mà không phải SSH vào xem từng lệnh
- Grafana cho dashboard, alerting và nhúng iframe ngay trong control plane
- cả hai được giữ sau cùng domain và cùng session portal, không mở thêm tab đăng nhập riêng
- Netdata được ép bind vào `127.0.0.1` để không lộ cổng `19999` trực tiếp ra internet

## File đã có trong repo

- script cài đặt: `mom/ops/vps/install-observability-stack.sh`
- auth endpoint: `api.php?action=vps_observability_auth`
- inventory observability: `mom/data/config/vps_control_tower.json`

## Cách cài

Trên máy local:

```bash
ssh root@103.110.87.55 "bash -s" < mom/ops/vps/install-observability-stack.sh
```

Hoặc trên chính VPS:

```bash
cd /var/www/hesem-mom
bash mom/ops/vps/install-observability-stack.sh
```

## Script này làm gì

1. cài prerequisite APT cho Netdata và Grafana
2. cài Netdata từ script kickstart chính thức
3. ghi cấu hình Netdata để:
   - chỉ bind `127.0.0.1 ::1`
   - tắt access log của Netdata để tránh double logging sau Nginx
   - tắt collector PostgreSQL mặc định nếu chưa cấp `NETDATA_POSTGRES_DSN`
4. cài Grafana từ APT repo chính thức
5. tạo systemd drop-in cho Grafana để:
   - chạy sau `127.0.0.1:3000`
   - dùng subpath `/ops/grafana/`
   - bật `allow_embedding`
   - bật `auth.proxy`
   - tự sign-up user từ header `X-WEBAUTH-USER`
6. tạo Nginx snippet reverse proxy + `auth_request` cho:
   - `/ops/netdata/`
   - `/ops/grafana/`
7. chèn snippet đó vào site Nginx đang phục vụ portal
8. restart `netdata`, `grafana-server` và reload `nginx`

## Runtime detect

Script tự dò:

- `APP_DIR` từ vị trí script hoặc `/var/www/hesem-mom`
- `PORTAL_DIR` chứa `api.php`
- file Nginx site đang phục vụ portal
- PHP-FPM unix socket của site đó

Nếu môi trường khác chuẩn hiện tại, export biến môi trường trước khi chạy:

```bash
DOMAIN=ops.example.com \
APP_DIR=/srv/hesem-mom \
PORTAL_DIR=/srv/hesem-mom/mom \
NGINX_SITE=/etc/nginx/sites-available/hesem-mom \
PHP_SOCK=/run/php/php8.5-fpm-hesem.sock \
GRAFANA_PORT=3000 \
NETDATA_PORT=19999 \
NETDATA_ENABLE_POSTGRES_COLLECTOR=0 \
bash mom/ops/vps/install-observability-stack.sh
```

Nếu thật sự muốn Netdata đọc PostgreSQL, bật rõ ràng thay vì để agent tự đoán credential:

```bash
NETDATA_ENABLE_POSTGRES_COLLECTOR=1 \
NETDATA_POSTGRES_DSN='postgres://netdata:strong-password@127.0.0.1:5432/postgres?sslmode=disable' \
bash mom/ops/vps/install-observability-stack.sh
```

## URL sau khi cài

- `https://qms.hesem.com.vn/ops/netdata/`
- `https://qms.hesem.com.vn/ops/grafana/`

Tab `Observability` trong dashboard sẽ nhúng hai URL này trực tiếp nếu inventory vẫn dùng path mặc định.

## Phân quyền

Hiện observability panels dùng quyền read của `VpsController` và đã đi cùng chính guard của module `Hạ tầng VPS` trong `Admin`.

Role read hiện theo `admin_roles()` của portal:

- `admin`
- `it_admin`
- `ceo`
- `qa_manager`

Nếu sau này thêm panel có quyền write, route `vps_observability_auth` đã có nhánh kiểm tra write role.

## Kiểm tra sau khi cài

```bash
systemctl status netdata
systemctl status grafana-server
nginx -t
curl -I http://127.0.0.1:19999
curl -I http://127.0.0.1:3000
```

Rồi đăng nhập portal và mở `VPS Control Tower -> Observability`.

Có thể kiểm tra auth proxy của Grafana trên loopback:

```bash
curl -H 'X-WEBAUTH-USER: admin' http://127.0.0.1:3000/api/user
```

## Ràng buộc quan trọng

- endpoint auth observability phải dùng cùng domain/session cookie với portal
- script sẽ fail sớm nếu không dò được `api.php`, Nginx site hoặc PHP-FPM socket hợp lệ
- Grafana đang auto gán user mới vào role `Viewer`; nếu cần editor/admin phải phân quyền riêng
- Netdata chỉ bind loopback, nên mọi truy cập ngoài phải đi qua Nginx
- PostgreSQL collector của Netdata chỉ nên bật khi đã có DSN hoặc account read-only rõ ràng; nếu không, cứ để disabled để tránh spam lỗi auth trong log

## Nguồn chính thức

- Netdata Agent: <https://learn.netdata.cloud/docs/netdata-agent/installation/linux>
- Netdata behind Nginx: <https://learn.netdata.cloud/docs/netdata-agent/configuration/securing-agents/running-the-agent-behind-a-reverse-proxy/nginx>
- Grafana Debian/Ubuntu install: <https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/>
- Grafana Auth Proxy: <https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/auth-proxy/>
- Grafana configure docs: <https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/>
