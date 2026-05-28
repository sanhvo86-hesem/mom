# LLM Router Setup — HESEM AEOI

AEOI tách extraction (đọc PDF/body → JSON cấu trúc) khỏi mail provider. Provider AI thực hiện extraction được chọn qua `LlmExtractionRouterService` dựa trên **tier**. Cấu hình ở migration `207_aeoi_llm_routing.sql` + admin UI tab "🤖 LLM Model".

## Routing tiers

AEOI có 3 tier tương ứng với 3 độ phức tạp của extraction:

| Tier | Khi dùng | Primary provider mặc định | Fallback chain |
|------|----------|---------------------------|----------------|
| `extraction_default` | Email body ngắn, không attachment, đơn lẻ | `ollama` (local) | `anthropic` |
| `extraction_pdf` | Email kèm PDF attachment (PO scan, quote, FAI) | `anthropic` (Claude Haiku 4.5) | `ollama` |
| `extraction_complex` | Multi-page PDF, multi-line PO, edge cases | `anthropic` (Claude Sonnet 4.6) | `openai` |

Routing data lưu trong table `aeoi_llm_routing`:
```sql
SELECT scope_type, scope_value, primary_provider, fallback_chain
FROM aeoi_llm_routing ORDER BY scope_type, scope_value;
```

## Provider 1: Ollama (local, default)

### When to use
- VPS đủ RAM (≥4 GB available cho model 3B, ≥8 GB cho 8B).
- Không có budget Anthropic credits hoặc privacy concerns (không gửi data ra ngoài).
- Batch processing không real-time (Ollama trên CPU = 4 min/extraction).

### Setup
1. Cài Ollama trên VPS:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   sudo systemctl enable ollama
   ```
2. Pull model:
   ```bash
   # Cho VPS RAM ~8 GB (HESEM eqms):
   ollama pull llama3.2:3b
   # Cho VPS RAM ≥16 GB:
   ollama pull llama3.1:8b
   ```
3. Verify:
   ```bash
   curl -s http://127.0.0.1:11434/api/tags | jq '.models[].name'
   # Expected: ["llama3.2:3b"]
   ```
4. (Nếu cần GPU acceleration) — install NVIDIA drivers + CUDA, Ollama auto detect.

### Chi tiết: [ollama-setup.md](ollama-setup.md)

### Gotchas
- **CPU mode**: 4 minutes/extraction trên 4-vCPU. Acceptable cho cron poll (chạy mỗi 2 giờ), **không acceptable cho user-facing test_parse**. Trên VPS HESEM (load avg ~5 với PHP-FPM + Postgres + RabbitMQ), Ollama 3B JSON-mode extraction thường timeout ngay cả với 240s. **Khuyến nghị: Anthropic làm primary, Ollama làm fallback** cho production.
- **OOM**: model 8B cần 4.8 GB RAM — VPS HESEM (7.8 GB RAM) đã có Postgres + RabbitMQ + PHP-FPM consume ~3 GB → OOM. Dùng 3B (2 GB).
- **Network**: Ollama mặc định bind `127.0.0.1` only. Đừng expose ra public — không có auth.
- **keep_alive**: AEOI gửi `keep_alive: "30m"` để giữ model trong RAM 30 phút sau mỗi call — tránh cold-load tax (~30s) cho call tiếp theo. Tăng/giảm bằng `OllamaService::KEEP_ALIVE` constant.
- **Timeout**: `OllamaService::TIMEOUT_SECONDS = 240` (4 phút). Đủ cho 3B model + complex prompt + warmed model trên 4-vCPU. Nếu VPS yếu hơn, tăng lên 360+ nhưng cẩn thận PHP-FPM request timeout cũng phải tăng theo.

## Provider 2: Anthropic Claude (recommended cho production)

### When to use
- Cần extraction nhanh (3 giây/extraction).
- Có Anthropic API credits.
- Quality cao hơn local model (cần thiết cho complex PDF với scanning artifacts).

### Setup
1. Đăng ký tại [console.anthropic.com](https://console.anthropic.com/).
2. Top up credits ở [Billing](https://console.anthropic.com/settings/billing). Tối thiểu $5.
3. Tạo API key ở [API Keys](https://console.anthropic.com/settings/keys). Name: `HESEM AEOI worker`.
4. Add vào PHP-FPM env (`/etc/php/8.5/fpm/pool.d/mom.conf`):
   ```ini
   env[ANTHROPIC_API_KEY] = "sk-ant-api03-..."
   ```
5. Reload PHP-FPM:
   ```bash
   sudo systemctl reload php8.5-fpm
   ```
6. Verify trong portal: AEOI tab → click **🧪 Test phân tích** với body sample → confirm extraction succeed.

### Models
- `claude-haiku-4-5` — default cho `extraction_pdf` tier. Fast + cheap (~$0.001/extraction).
- `claude-sonnet-4-6` — default cho `extraction_complex` tier. Better quality (~$0.005/extraction).
- `claude-opus-4-7` — KHÔNG khuyến nghị cho extraction (overkill, $0.015/extraction).

### Gotchas
- **Credit low** → API trả 400 error. AEOI UI surface banner đỏ "Anthropic API credit-low" ở Test Parse modal (P0-41 fix).
- **Rate limit**: free tier ~5 req/min. Paid tier rộng hơn.
- **PII exposure**: data PO khách hàng được gửi lên Anthropic — verify legal/compliance trước khi enable.

## Provider 3: OpenAI (optional)

### When to use
- Anthropic không khả dụng (down hoặc tài khoản bị suspend).
- Cần GPT-4o-mini cho price comparison.

### Setup
1. API key từ [platform.openai.com](https://platform.openai.com/api-keys).
2. Add env:
   ```ini
   env[OPENAI_API_KEY] = "sk-proj-..."
   ```
3. Add row vào `aeoi_llm_routing`:
   ```sql
   UPDATE aeoi_llm_routing
   SET primary_provider = 'openai', fallback_chain = '["anthropic","ollama"]'
   WHERE scope_value = 'extraction_complex';
   ```
4. Reload PHP-FPM.

### Gotchas
- Chưa enable mặc định. Yêu cầu manual UPDATE table như trên.
- OpenAI JSON mode (`response_format: json_object`) đôi khi sinh JSON invalid — `LlmExtractionRouterService` retry 2 lần trước khi fallback.

## Cài đặt routing trong admin UI

Login portal → AEOI tab → sub-tab **🤖 LLM Model**:

- Bảng hiển thị 3 tier với primary_provider + fallback_chain.
- Click row → modal Edit:
  - Đổi primary provider (dropdown).
  - Đổi thứ tự fallback (drag-drop hoặc nhập JSON array).
  - Optional: scope hẹp hơn (ví dụ chỉ áp dụng cho mailbox cụ thể) — set `scope_type=mailbox`, `scope_value=<mailbox_id>`.

Sau khi Save → routing rule có hiệu lực ngay (không cần reload).

## Health check / monitoring

Sub-tab **🤖 LLM Model** có section "Provider Health":

| Provider | Endpoint | Status check |
|----------|----------|--------------|
| Ollama | `GET http://127.0.0.1:11434/api/tags` | HTTP 200 + models list |
| Anthropic | `POST https://api.anthropic.com/v1/messages` (1-token probe) | HTTP 200 |
| OpenAI | `POST https://api.openai.com/v1/chat/completions` (1-token probe) | HTTP 200 |

Click button **🩺 Test provider health** chạy probe cho từng provider, hiển thị latency + status.

## Cost monitoring

Mỗi extraction tạo row trong `aeoi_llm_call_log` (nếu enabled) với:
- `provider`, `model`, `tokens_input`, `tokens_output`, `cost_usd_estimate`
- `case_id` (link tới case nếu là cron poll) hoặc `null` (nếu test_parse).

Query monthly cost:
```sql
SELECT provider, model, 
       SUM(tokens_input + tokens_output) AS total_tokens,
       SUM(cost_usd_estimate)            AS total_cost_usd,
       COUNT(*)                          AS call_count
  FROM aeoi_llm_call_log
 WHERE created_at >= date_trunc('month', now())
 GROUP BY provider, model
 ORDER BY total_cost_usd DESC;
```

(Cost estimate dựa trên prompt token + completion token + provider pricing snapshot. Verify monthly bill với Anthropic console.)

## Recommended config for HESEM eqms VPS (production)

```sql
-- extraction_default: thử Ollama trước (free), fallback Anthropic
UPDATE aeoi_llm_routing
   SET primary_provider = 'ollama', fallback_chain = '["anthropic"]'
 WHERE scope_value = 'extraction_default';

-- extraction_pdf: Anthropic Haiku trước (cần speed + quality), fallback Ollama
UPDATE aeoi_llm_routing
   SET primary_provider = 'anthropic', fallback_chain = '["ollama"]'
 WHERE scope_value = 'extraction_pdf';

-- extraction_complex: Anthropic Sonnet trước, fallback OpenAI (nếu có)
UPDATE aeoi_llm_routing
   SET primary_provider = 'anthropic', fallback_chain = '["openai","ollama"]'
 WHERE scope_value = 'extraction_complex';
```

→ Đảm bảo `ANTHROPIC_API_KEY` set và có credits trước khi promote Anthropic làm primary.
