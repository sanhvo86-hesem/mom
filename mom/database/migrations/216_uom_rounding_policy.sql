-- Migration 216: UoM Rounding Policy
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

CREATE TABLE IF NOT EXISTS uom_rounding_policy (
    policy_id            VARCHAR(64) PRIMARY KEY,
    algorithm            VARCHAR(32) NOT NULL
                         CHECK (algorithm IN ('ROUND_HALF_EVEN','ROUND_HALF_UP','ROUND_DOWN_TRUNCATE','ROUND_UP_CEILING','ROUND_NONE')),
    display_scale_default SMALLINT NOT NULL DEFAULT 4,
    calculation_scale    SMALLINT NOT NULL DEFAULT 20,
    description_en       VARCHAR(256) NOT NULL,
    description_vi       VARCHAR(256) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO uom_rounding_policy (policy_id, algorithm, display_scale_default, calculation_scale, description_en, description_vi) VALUES
    ('ROUND_HALF_EVEN',       'ROUND_HALF_EVEN',       4,  20, 'Banker''s rounding: half rounds to nearest even digit. Standard for regulated/scientific contexts.', 'Làm tròn ngân hàng: nửa làm tròn về chữ số chẵn gần nhất. Chuẩn cho ngữ cảnh quy định/khoa học.'),
    ('ROUND_HALF_UP',         'ROUND_HALF_UP',         3,  20, 'Standard rounding: half always rounds up. Used for commercial invoicing.', 'Làm tròn thông thường: nửa luôn làm tròn lên. Dùng cho hóa đơn thương mại.'),
    ('ROUND_DOWN_TRUNCATE',   'ROUND_DOWN_TRUNCATE',   0,  20, 'Truncate toward zero. Used for conservative inventory counting.', 'Cắt ngắn về không. Dùng cho kiểm kê hàng tồn kho bảo thủ.'),
    ('ROUND_UP_CEILING',      'ROUND_UP_CEILING',      2,  20, 'Always round up (ceiling). Used for safety margin calculations.', 'Luôn làm tròn lên. Dùng cho tính toán biên an toàn.'),
    ('ROUND_NONE',            'ROUND_NONE',            20, 20, 'No rounding. Full precision preserved. For internal calculation chains only.', 'Không làm tròn. Giữ độ chính xác đầy đủ. Chỉ dùng cho chuỗi tính toán nội bộ.')
ON CONFLICT (policy_id) DO NOTHING;
