# VPS Control Tower Architecture

## Mục tiêu

Xây một control plane duy nhất cho VPS để:

- xem toàn bộ host, service, Docker, reverse proxy, DNS, alert và terminal từ một chỗ
- bỏ kiểu vận hành phải mở web AZDIGI rồi nhảy sang SSH thủ công
- có terminal mạnh và trực quan hơn Terminal mặc định trên macOS
- tạo nền để tự động hóa thay đổi hạ tầng thay vì thao tác tay

## Kết luận chính

Không nên cố biến giao diện AZDIGI thành control plane trung tâm.

Lý do:

- portal nhà cung cấp chỉ là lớp giao diện khách hàng, không phải lớp điều phối vận hành lâu dài
- terminal, observability, container control và DNS/API là bốn lớp khác nhau; nhét tất cả vào một trang PHP duy nhất sẽ thành mong manh
- nếu DNS vẫn nằm trong portal không có API ổn định cho stack của mình, dashboard không thể sửa DNS đúng nghĩa

## Kiến trúc đề xuất

### 1. Portal orchestration layer

Dùng chính `mom/portal.html` làm control plane UI:

- inventory host, service, ingress, DNS, terminal, alert
- safe action runner dạng whitelist
- audit log cho mọi thao tác vận hành
- deep links sang spec, runbook, Portainer, Grafana, terminal gateway

Portal này không nên trực tiếp mở arbitrary shell.

Pha hiện tại đã scaffold thêm đường terminal gateway theo mẫu:

- `ttyd` chạy cục bộ trên `127.0.0.1`
- Nginx reverse proxy path `/ops/terminal/*`
- `auth_request` quay lại `api.php?action=vps_terminal_auth`
- portal session trở thành lớp auth cho terminal gateway

### 2. Terminal layer

Terminal mạnh và đúng kiến trúc nên là:

- frontend: `xterm.js`
- gateway: `ttyd` hoặc bastion terminal tương đương
- transport: SSH key, MFA, session policy

Lý do chọn hướng này:

- xterm.js xử lý UI terminal rất tốt ở browser
- ttyd sinh ra đúng bài toán share terminal over the web
- portal chỉ cần nhúng hoặc mở gateway đã harden, thay vì tự làm PTY server trong PHP

### 3. Observability layer

Tách metric/alert khỏi shell:

- Netdata cho host telemetry realtime
- Grafana cho dashboard và alerting
- OpenTelemetry Collector để nối stack hiện có của repo với metric/log/trace pipeline

Repo hiện đã có `mom/ops/local-runtime/docker-compose.yml` chạy `otel-collector`, nên hướng nâng cấp là reuse đường này chứ không bắt đầu từ con số 0.

### 4. Container and workload layer

Nếu host chạy Docker thật sự:

- Portainer Edge phù hợp cho quản lý container nhiều host
- portal nội bộ vẫn là control plane cấp điều phối
- Portainer là lớp chuyên cho container lifecycle

Không nên bắt portal PHP thay luôn phần container management.

### 5. DNS and ingress layer

Đây là điểm then chốt.

Nếu zone còn nằm trong giao diện quản lý DNS kiểu portal của nhà cung cấp, dashboard sẽ bị giới hạn ở:

- inventory record
- diff mong muốn và hiện trạng
- checklist hoặc nhắc việc
- scrape bán thủ công, rất dễ gãy

Muốn điều khiển DNS thật:

- chuyển sang Cloudflare DNS API
- hoặc tự giữ authoritative DNS bằng PowerDNS HTTP API

Nếu không làm bước này, bài toán “không cần vào AZDIGI nữa” sẽ không bao giờ hoàn tất.

## Kiến trúc triển khai thực tế cho HESEM

### P0. Inventory and bastion

- chốt toàn bộ host, domain, subdomain, port, TLS, log path, docker project
- tạo bastion SSH hoặc chính host chính đóng vai trò gateway
- bắt buộc SSH key, không dùng password trong browser

### P1. Read-only control tower

Mục tiêu:

- host health
- service state
- docker inventory
- ingress map
- DNS inventory
- quick links sang log/monitoring

### P2. Safe actions only

Chỉ bật action whitelist:

- `health snapshot`
- `docker ps`
- `nginx -t`
- `listen ports`
- `recent logs`

Chưa mở:

- arbitrary shell
- restart service hàng loạt
- write DNS

### P3. Terminal gateway

Triển khai terminal đúng chuẩn:

- xterm.js ở portal
- ttyd trên bastion hoặc host
- auth ở gateway
- session log/audit ở lớp ngoài PHP

Repo đã có script bootstrap cho bước này tại `mom/ops/vps/install-terminal-gateway.sh` và runbook chi tiết tại `mom/docs/system/vps-terminal-gateway-setup-2026-04-09.md`.

### P4. Observability stack

Triển khai metric và dashboard cùng domain:

- Netdata sau Nginx reverse proxy ở `/ops/netdata/`
- Grafana auth proxy ở `/ops/grafana/`
- `auth_request` quay về `api.php?action=vps_observability_auth`

Repo đã có script bootstrap cho bước này tại `mom/ops/vps/install-observability-stack.sh` và runbook chi tiết tại `mom/docs/system/vps-observability-stack-setup-2026-04-09.md`.

### P5. DNS API cutover

Di chuyển zone khỏi portal thủ công sang API-first DNS.

Đây là điều kiện cần để dashboard thực sự thay thế tab DNS của AZDIGI.

## Bảo mật bắt buộc

- Không đưa root password vào frontend.
- Không mở `bash -lc ...` tùy ý từ browser.
- Mọi action đều phải là whitelist rõ ràng.
- Mọi action đều có audit log.
- Terminal phải có MFA hoặc ít nhất SSH key + bastion policy.
- DNS write phải có dual control hoặc approval cho production zone.

## Những gì module đã scaffold trong repo

Đợt này module `VPS Control Tower` mới làm phần nền:

- control plane screen trong portal
- inventory host/site/DNS
- live probe qua local runner hoặc SSH nếu key đã sẵn
- safe action runner dạng read-only
- research/spec gắn ngay trong repo

Những gì chưa nên làm ngay trong PHP layer:

- arbitrary web shell
- session recording phức tạp
- DNS write trực tiếp tới AZDIGI portal

## Stack khuyến nghị

- UI terminal: xterm.js
- Web terminal gateway: ttyd
- Host telemetry: Netdata
- Dashboard + alert: Grafana
- Docker fleet: Portainer Edge
- DNS API nhanh: Cloudflare
- DNS self-host authoritative: PowerDNS

## Tính năng nên bổ sung tiếp

### 1. Multi-host observability hub

- Dùng Netdata parent-child để gom nhiều VPS vào một điểm quan sát trung tâm.
- Khi số host tăng, đây là cách đúng để dashboard không bị chia nhỏ theo từng máy.

Nguồn chính thức:

- Netdata parent-child configuration: <https://learn.netdata.cloud/docs/netdata-parents/parent-child-configuration-reference>

### 2. Dashboards as code

- Provision datasource, folder và dashboard Grafana từ file trong Git.
- Mục tiêu là bỏ tình trạng dashboard sửa tay trên UI rồi drift khỏi repo.

Nguồn chính thức:

- Grafana provisioning: <https://grafana.com/docs/grafana/latest/administration/provisioning/>

### 3. Container fleet control

- Nếu estate Docker mở rộng, nối Portainer Edge Agent thay vì bắt portal PHP tự gánh lifecycle của container.
- Cách này hợp với nhiều host, nhiều site và environment grouping.

Nguồn chính thức:

- Portainer Edge environments: <https://docs.portainer.io/admin/environments/add/docker/edge>

### 4. Scoped DNS automation

- Khi chuyển DNS sang Cloudflare, dùng API token giới hạn đúng zone và quyền `DNS Read/Edit`.
- Đây là điều kiện để dashboard ghi DNS an toàn hơn so với reuse thông tin tài khoản toàn cục.

Nguồn chính thức:

- Cloudflare API token creation: <https://developers.cloudflare.com/fundamentals/api/get-started/create-token/>

## Nguồn chính thức đã dùng để chốt kiến trúc

- xterm.js Docs: <https://xtermjs.org/docs/>
- ttyd: <https://tsl0922.github.io/ttyd/>
- ttyd Releases: <https://github.com/tsl0922/ttyd/releases>
- ttyd Auth Proxy: <https://github.com/tsl0922/ttyd/wiki/Auth-Proxy>
- Netdata Agent Docs: <https://learn.netdata.cloud/docs/netdata-agent/installation/linux>
- Netdata behind Nginx: <https://learn.netdata.cloud/docs/netdata-agent/configuration/securing-agents/running-the-agent-behind-a-reverse-proxy/nginx>
- Portainer Edge Agent Docs: <https://docs.portainer.io/advanced/edge-agent>
- Grafana Alerting Docs: <https://grafana.com/docs/grafana/latest/alerting/>
- Grafana Debian/Ubuntu install: <https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/>
- Grafana Auth Proxy: <https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/auth-proxy/>
- Grafana configure docs: <https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/>
- Cloudflare DNS API: <https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/edit/>
- PowerDNS HTTP API: <https://doc.powerdns.com/authoritative/http-api/>
