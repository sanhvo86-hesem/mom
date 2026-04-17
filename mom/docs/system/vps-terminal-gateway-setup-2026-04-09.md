# VPS Terminal Gateway Setup

## Mục tiêu

Biến tab `Terminal` trong `VPS Control Tower` thành terminal thật, nhưng không biến PHP thành PTY server.

Luồng đúng:

- browser mở `https://qms.hesem.com.vn/ops/terminal/...`
- Nginx gọi `auth_request` vào `api.php?action=vps_terminal_auth`
- API kiểm tra session portal + role
- Nginx chuyển header `X-Remote-User` vào `ttyd`
- `ttyd` chạy shell wrapper cục bộ trên chính VPS

## Tại sao dùng cách này

- `ttyd` đã có sẵn terminal web UI dựa trên xterm.js, không cần tự viết terminal frontend mới
- auth đi theo session portal hiện có, không cần mở thêm user/password riêng cho terminal
- terminal nằm sau Nginx reverse proxy, không expose trực tiếp cổng `ttyd` ra internet
- vẫn tách rõ terminal gateway khỏi PHP application layer

## File đã có trong repo

- script cài đặt: `mom/ops/vps/install-terminal-gateway.sh`
- auth endpoint: `api.php?action=vps_terminal_auth`
- inventory terminal: `mom/data/config/vps_control_tower.json`

## Cách cài

Trên máy local:

```bash
ssh root@103.110.87.55 "bash -s" < mom/ops/vps/install-terminal-gateway.sh
```

Hoặc trên chính VPS:

```bash
cd /var/www/hesem-mom
bash mom/ops/vps/install-terminal-gateway.sh
```

## Script này làm gì

1. cài `tmux`
2. tải binary `ttyd` mới nhất phù hợp kiến trúc máy từ GitHub Releases
3. tạo 2 wrapper script:
   - `hesem-terminal-primary`: shell chính, ưu tiên vào `tmux` session `hesem-ops`
   - `hesem-terminal-readonly`: dashboard diagnostics tự refresh
4. tạo 2 systemd service:
   - `hesem-ttyd-primary.service`
   - `hesem-ttyd-readonly.service`
5. tạo Nginx snippet reverse proxy + `auth_request`
6. chèn snippet đó vào site `hesem-mom`
7. reload `nginx` và start các service `ttyd`

Script hiện tự dò:

- `APP_DIR` từ chính vị trí script hoặc `/var/www/hesem-mom`
- `PORTAL_DIR` chứa `api.php`
- Nginx site đang map domain/root của portal
- PHP-FPM unix socket đang được site đó dùng

Nếu tự dò sai trên một máy khác chuẩn hiện tại, export biến môi trường trước khi chạy:

```bash
DOMAIN=ops.example.com \
APP_DIR=/srv/hesem-mom \
PORTAL_DIR=/srv/hesem-mom/mom \
NGINX_SITE=/etc/nginx/sites-available/hesem-mom \
PHP_SOCK=/run/php/php8.5-fpm-hesem.sock \
bash mom/ops/vps/install-terminal-gateway.sh
```

## URL sau khi cài

- `https://qms.hesem.com.vn/ops/terminal/primary/`
- `https://qms.hesem.com.vn/ops/terminal/readonly/`

Tab `Terminal` trong dashboard sẽ nhúng các URL này trực tiếp nếu inventory vẫn dùng path mặc định.

## Phân quyền

- `primary` dùng quyền write của `VpsController`
- `readonly` dùng quyền read của `VpsController`

Hiện role read gồm:

- `admin`
- `it_admin`
- `ceo`
- `engineering_manager`
- `engineering_lead`

Role write hiện là:

- `admin`
- `it_admin`

## Kiểm tra sau khi cài

```bash
systemctl status hesem-ttyd-primary
systemctl status hesem-ttyd-readonly
nginx -t
curl -I http://127.0.0.1:7681
curl -I http://127.0.0.1:7682
```

Rồi đăng nhập portal và mở tab `VPS Control Tower -> Terminal`.

## Ràng buộc quan trọng

- endpoint auth terminal phải dùng cùng domain/session cookie với portal
- script sẽ fail sớm nếu không dò được `api.php`, Nginx site hoặc PHP-FPM socket hợp lệ
- nếu đổi `DOMAIN`, `HOST_ID`, `APP_DIR` hoặc socket PHP-FPM, hãy export biến môi trường trước khi chạy script
- terminal `primary` vẫn là shell mạnh; không nên cấp role write quá rộng

## Nguồn chính thức

- xterm.js docs: <https://xtermjs.org/docs/>
- ttyd home: <https://tsl0922.github.io/ttyd/>
- ttyd releases: <https://github.com/tsl0922/ttyd/releases>
- ttyd auth proxy wiki: <https://github.com/tsl0922/ttyd/wiki/Auth-Proxy>
