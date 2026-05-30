-- Migration 224: UoM Phase 1 Seed Data
-- Quantity kinds (58), Units (78+), Rounding policies (seeded in 216), Conversion rules (~50)
-- Package: HESEM_UOM_PROMPT_OS_V1_2026-05-28
-- Date: 2026-05-29

-- ============================================================
-- QUANTITY KINDS
-- ============================================================

INSERT INTO uom_quantity_kind (kind_code, parent_kind_code, qudt_uri, dimension_vector, label_en, label_vi, is_dimensionless, source) VALUES

-- SI base
('Mass',                    NULL,           'qudt:Mass',                       'M1L0T0I0Θ0N0J0', 'Mass',                         'Khối lượng',                   false, 'QUDT'),
('Length',                  NULL,           'qudt:Length',                     'M0L1T0I0Θ0N0J0', 'Length',                       'Chiều dài',                    false, 'QUDT'),
('Duration',                NULL,           'qudt:Time',                       'M0L0T1I0Θ0N0J0', 'Duration',                     'Thời gian',                    false, 'QUDT'),
('ElectricCurrent',         NULL,           'qudt:ElectricCurrent',            'M0L0T0I1Θ0N0J0', 'Electric Current',             'Cường độ dòng điện',           false, 'QUDT'),
('ThermodynamicTemperature',NULL,           'qudt:Temperature',                'M0L0T0I0Θ1N0J0', 'Thermodynamic Temperature',    'Nhiệt độ nhiệt động',          false, 'QUDT'),
('AmountOfSubstance',       NULL,           'qudt:AmountOfSubstance',          'M0L0T0I0Θ0N1J0', 'Amount of Substance',          'Lượng chất',                   false, 'QUDT'),
('LuminousIntensity',       NULL,           'qudt:LuminousIntensity',          'M0L0T0I0Θ0N0J1', 'Luminous Intensity',           'Cường độ sáng',                false, 'QUDT'),

-- SI derived (manufacturing focus)
('Area',                    NULL,           'qudt:Area',                       'M0L2T0I0Θ0N0J0', 'Area',                         'Diện tích',                    false, 'QUDT'),
('Volume',                  NULL,           'qudt:Volume',                     'M0L3T0I0Θ0N0J0', 'Volume',                       'Thể tích',                     false, 'QUDT'),
('Velocity',                NULL,           'qudt:Velocity',                   'M0L1T-1I0Θ0N0J0','Velocity',                     'Vận tốc',                      false, 'QUDT'),
('Acceleration',            NULL,           'qudt:Acceleration',               'M0L1T-2I0Θ0N0J0','Acceleration',                 'Gia tốc',                      false, 'QUDT'),
('Force',                   NULL,           'qudt:Force',                      'M1L1T-2I0Θ0N0J0','Force',                        'Lực',                          false, 'QUDT'),
('Pressure',                NULL,           'qudt:Pressure',                   'M1L-1T-2I0Θ0N0J0','Pressure',                   'Áp suất',                      false, 'QUDT'),
('Energy',                  NULL,           'qudt:Energy',                     'M1L2T-2I0Θ0N0J0','Energy',                       'Năng lượng',                   false, 'QUDT'),
('Power',                   NULL,           'qudt:Power',                      'M1L2T-3I0Θ0N0J0','Power',                        'Công suất',                    false, 'QUDT'),
('Frequency',               NULL,           'qudt:Frequency',                  'M0L0T-1I0Θ0N0J0','Frequency',                    'Tần số',                       false, 'QUDT'),
('Density',                 NULL,           'qudt:Density',                    'M1L-3T0I0Θ0N0J0','Density',                      'Khối lượng riêng',             false, 'QUDT'),
('DynamicViscosity',        NULL,           'qudt:DynamicViscosity',           'M1L-1T-1I0Θ0N0J0','Dynamic Viscosity',           'Độ nhớt động lực',             false, 'QUDT'),
('MassFlowRate',            NULL,           'qudt:MassFlowRate',               'M1L0T-1I0Θ0N0J0','Mass Flow Rate',               'Lưu lượng khối lượng',         false, 'QUDT'),
('VolumetricFlowRate',      NULL,           'qudt:VolumetricFlowRate',         'M0L3T-1I0Θ0N0J0','Volumetric Flow Rate',         'Lưu lượng thể tích',           false, 'QUDT'),
('Angle',                   NULL,           'qudt:Angle',                      'M0L0T0I0Θ0N0J0', 'Angle',                        'Góc phẳng',                    true,  'QUDT'),
('AngularVelocity',         NULL,           'qudt:AngularVelocity',            'M0L0T-1I0Θ0N0J0','Angular Velocity',             'Vận tốc góc',                  false, 'QUDT'),
('Torque',                  NULL,           'qudt:Torque',                     'M1L2T-2I0Θ0N0J0','Torque',                       'Mômen xoắn',                   false, 'QUDT'),
('ElectricPotential',       NULL,           'qudt:ElectricPotential',          'M1L2T-3I-1Θ0N0J0','Electric Potential',          'Điện thế',                     false, 'QUDT'),
('TemperatureDifference',   'ThermodynamicTemperature', NULL,                  'M0L0T0I0Θ1N0J0', 'Temperature Difference',       'Hiệu nhiệt độ',                false, 'QUDT'),
('LinearMassDensity',       'Density',      NULL,                              'M1L-1T0I0Θ0N0J0', 'Linear Mass Density',          'Khối lượng tuyến tính',        false, 'QUDT'),

-- Dimensionless base
('Dimensionless',           NULL,           'qudt:Dimensionless',              'M0L0T0I0Θ0N0J0', 'Dimensionless',                'Không thứ nguyên',             true,  'QUDT'),
('CountOrQuantity',         'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Count or Quantity',            'Số lượng đếm',                 true,  'QUDT'),

-- HESEM manufacturing dimensionless kinds
('YieldPercentage',         'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Yield Percentage',             'Tỷ lệ sản lượng',              true,  'HESEM_CUSTOM'),
('ScrapRate',               'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Scrap Rate',                   'Tỷ lệ phế phẩm',               true,  'HESEM_CUSTOM'),
('CompletionPercentage',    'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Completion Percentage',        'Tỷ lệ hoàn thành',             true,  'HESEM_CUSTOM'),
('ConformanceRate',         'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Conformance Rate',             'Tỷ lệ phù hợp',                true,  'HESEM_CUSTOM'),
('OEEScore',                'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'OEE Score',                    'Hiệu suất thiết bị tổng thể',  true,  'HESEM_CUSTOM'),
('MoistureContent',         'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Moisture Content',             'Độ ẩm',                        true,  'HESEM_CUSTOM'),
('PurityPercentage',        'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Purity Percentage',            'Độ tinh khiết',                true,  'HESEM_CUSTOM'),
('ConcentrationPercentage', 'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Concentration Percentage',     'Nồng độ phần trăm',            true,  'HESEM_CUSTOM'),
('RecoveryRate',            'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Recovery Rate',                'Tỷ lệ thu hồi',                true,  'HESEM_CUSTOM'),
('FillRate',                'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Fill Rate',                    'Tỷ lệ hoàn thành đơn hàng',    true,  'HESEM_CUSTOM'),
('RelativeHumidity',        'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Relative Humidity',            'Độ ẩm tương đối',              true,  'HESEM_CUSTOM'),
('MassFraction',            'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Mass Fraction',                'Phần khối lượng',              true,  'HESEM_CUSTOM'),
('VolumeFraction',          'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Volume Fraction',              'Phần thể tích',                true,  'HESEM_CUSTOM'),
('pH',                      'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'pH',                           'Độ pH',                        true,  'HESEM_CUSTOM'),

-- Ratio/Concentration kinds (structural ratios)
('Molarity',                NULL,           'qudt:Molarity',                   'M0L-3T0I0Θ0N1J0','Molarity',                     'Nồng độ mol',                  false, 'QUDT'),
('MassConcentration',       NULL,           'qudt:MassConcentration',          'M1L-3T0I0Θ0N0J0','Mass Concentration',           'Nồng độ khối lượng',           false, 'QUDT'),
('NumberConcentration',     NULL,           NULL,                              'M0L-3T0I0Θ0N0J0','Number Concentration',         'Nồng độ số lượng',             false, 'QUDT'),

-- Procedure-defined
('PotencyUnit',             'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Potency Unit',                 'Đơn vị hiệu lực',              true,  'HESEM_CUSTOM'),
('ArbitraryUnit',           'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Arbitrary Unit',               'Đơn vị tùy ý',                 true,  'HESEM_CUSTOM'),

-- Logging
('LogarithmicRatio',        'Dimensionless',NULL,                              'M0L0T0I0Θ0N0J0', 'Logarithmic Ratio',            'Tỷ lệ logarit',                true,  'HESEM_CUSTOM')

ON CONFLICT (kind_code) DO NOTHING;

-- ============================================================
-- UNIT CATALOG — Phase 1 (78 units + Wh)
-- ============================================================

INSERT INTO uom_unit_catalog
    (canonical_code, ucum_code, display_symbol, display_name_en, display_name_vi,
     quantity_kind_code, si_base, si_factor, si_offset, is_affine,
     lifecycle_status, source_tag, risk_level)
VALUES

-- Mass
('kg',   'kg',        'kg',  'kilogram',       'kilôgam',          'Mass',   true,  1,              0, false, 'active', 'BIPM', 'low'),
('g',    'g',         'g',   'gram',           'gam',              'Mass',   false, 0.001,          0, false, 'active', 'BIPM', 'low'),
('mg',   'mg',        'mg',  'milligram',      'miligam',          'Mass',   false, 0.000001,       0, false, 'active', 'BIPM', 'low'),
('ug',   'ug',        'µg',  'microgram',      'micrôgam',         'Mass',   false, 0.000000001,    0, false, 'active', 'UCUM', 'low'),
('t',    't',         't',   'metric ton',     'tấn',              'Mass',   false, 1000,           0, false, 'active', 'BIPM', 'low'),
('lb',   '[lb_av]',   'lb',  'pound',          'pao',              'Mass',   false, 0.45359237,     0, false, 'active', 'ISO',  'low'),
('oz',   '[oz_av]',   'oz',  'ounce',          'ao-xơ',            'Mass',   false, 0.028349523125, 0, false, 'active', 'ISO',  'low'),

-- Length
('m',    'm',         'm',   'metre',          'mét',              'Length', true,  1,              0, false, 'active', 'BIPM', 'low'),
('cm',   'cm',        'cm',  'centimetre',     'centimét',         'Length', false, 0.01,           0, false, 'active', 'BIPM', 'low'),
('mm',   'mm',        'mm',  'millimetre',     'milimét',          'Length', false, 0.001,          0, false, 'active', 'BIPM', 'low'),
('um',   'um',        'µm',  'micrometre',     'micrômét',         'Length', false, 0.000001,       0, false, 'active', 'BIPM', 'low'),
('km',   'km',        'km',  'kilometre',      'kilômét',          'Length', false, 1000,           0, false, 'active', 'BIPM', 'low'),
('in',   '[in_i]',    'in',  'inch',           'insơ',             'Length', false, 0.0254,         0, false, 'active', 'ISO',  'low'),
('ft',   '[ft_i]',    'ft',  'foot',           'feet',             'Length', false, 0.3048,         0, false, 'active', 'ISO',  'low'),
('yd',   '[yd_i]',    'yd',  'yard',           'yard',             'Length', false, 0.9144,         0, false, 'active', 'ISO',  'low'),

-- Area
('m2',   'm2',        'm²',  'square metre',   'mét vuông',        'Area',   false, 1,              0, false, 'active', 'BIPM', 'low'),
('cm2',  'cm2',       'cm²', 'square centimetre','centimét vuông', 'Area',   false, 0.0001,         0, false, 'active', 'BIPM', 'low'),
('mm2',  'mm2',       'mm²', 'square millimetre','milimét vuông',  'Area',   false, 0.000001,       0, false, 'active', 'BIPM', 'low'),

-- Volume
('m3',   'm3',        'm³',  'cubic metre',    'mét khối',         'Volume', false, 1,              0, false, 'active', 'BIPM', 'low'),
('L',    'L',         'L',   'litre',          'lít',              'Volume', false, 0.001,          0, false, 'active', 'BIPM', 'low'),
('mL',   'mL',        'mL',  'millilitre',     'mililít',          'Volume', false, 0.000001,       0, false, 'active', 'BIPM', 'low'),
('uL',   'uL',        'µL',  'microlitre',     'micrôlít',         'Volume', false, 0.000000001,    0, false, 'active', 'BIPM', 'low'),

-- Temperature (absolute)
('K',    'K',         'K',   'kelvin',         'kelvin',           'ThermodynamicTemperature', true, 1, 0,      false, 'active', 'BIPM', 'low'),
('Cel',  'Cel',       '°C',  'degree Celsius', 'độ C',             'ThermodynamicTemperature', false,1, 273.15, true,  'active', 'BIPM', 'medium'),
('degF', '[degF]',    '°F',  'degree Fahrenheit','độ F',           'ThermodynamicTemperature', false,NULL,NULL,  true,  'active', 'UCUM', 'medium'),

-- Temperature difference — UCUM annotation codes to avoid conflict with K/Cel
('DeltaK',   'K{diff}',   'ΔK',   'kelvin difference',  'chênh lệch kelvin',  'TemperatureDifference', false, 1,    0, false, 'active', 'BIPM', 'low'),
('DeltaCel', 'Cel{diff}', 'Δ°C',  'Celsius difference', 'chênh lệch độ C',    'TemperatureDifference', false, 1,    0, false, 'active', 'BIPM', 'low'),

-- Time / Duration
('s',    's',         's',   'second',         'giây',             'Duration', true,  1,       0, false, 'active', 'BIPM', 'low'),
('min',  'min',       'min', 'minute',         'phút',             'Duration', false, 60,      0, false, 'active', 'BIPM', 'low'),
('h',    'h',         'h',   'hour',           'giờ',              'Duration', false, 3600,    0, false, 'active', 'BIPM', 'low'),
('d',    'd',         'ngày','day',            'ngày',             'Duration', false, 86400,   0, false, 'active', 'BIPM', 'low'),
('wk',   'wk',        'tuần','week',           'tuần',             'Duration', false, 604800,  0, false, 'active', 'UCUM', 'low'),
('mo',   'mo',        'tháng','month (30d)',   'tháng',            'Duration', false, 2592000, 0, false, 'active', 'UCUM', 'low'),
('a',    'a',         'năm', 'year (365d)',    'năm',              'Duration', false, 31536000,0, false, 'active', 'UCUM', 'low'),

-- Pressure
('Pa',   'Pa',        'Pa',  'pascal',         'pascal',           'Pressure', false, 1,          0, false, 'active', 'BIPM', 'low'),
('kPa',  'kPa',       'kPa', 'kilopascal',     'kilopascal',       'Pressure', false, 1000,       0, false, 'active', 'BIPM', 'low'),
('MPa',  'MPa',       'MPa', 'megapascal',     'megapascal',       'Pressure', false, 1000000,    0, false, 'active', 'BIPM', 'low'),
('bar',  'bar',       'bar', 'bar',            'bar',              'Pressure', false, 100000,     0, false, 'active', 'ISO',  'low'),
('psi',  '[psi]',     'psi', 'pound-force per square inch','psi',  'Pressure', false, 6894.757293,0, false, 'active', 'UCUM', 'low'),
('atm',  'atm',       'atm', 'standard atmosphere','átmôtphe',     'Pressure', false, 101325,     0, false, 'active', 'UCUM', 'low'),

-- Energy
('J',    'J',         'J',   'joule',          'jun',              'Energy', false, 1,        0, false, 'active', 'BIPM', 'low'),
('kJ',   'kJ',        'kJ',  'kilojoule',      'kilôjun',          'Energy', false, 1000,     0, false, 'active', 'BIPM', 'low'),
('MJ',   'MJ',        'MJ',  'megajoule',      'megajun',          'Energy', false, 1000000,  0, false, 'active', 'BIPM', 'low'),
('kWh',  'kW.h',      'kWh', 'kilowatt-hour',  'kilôoát giờ',      'Energy', false, 3600000,  0, false, 'active', 'UCUM', 'low'),
('Wh',   'W.h',       'Wh',  'watt-hour',      'oát giờ',          'Energy', false, 3600,     0, false, 'active', 'UCUM', 'low'),

-- Power
('W',    'W',         'W',   'watt',           'oát',              'Power', false, 1,       0, false, 'active', 'BIPM', 'low'),
('kW',   'kW',        'kW',  'kilowatt',       'kilôoát',          'Power', false, 1000,    0, false, 'active', 'BIPM', 'low'),
('MW',   'MW',        'MW',  'megawatt',       'megaoát',          'Power', false, 1000000, 0, false, 'active', 'BIPM', 'low'),

-- Frequency / Angular velocity
('Hz',   'Hz',        'Hz',  'hertz',          'héc',              'Frequency',    false, 1,       0, false, 'active', 'BIPM', 'low'),
('rpm',  '{r}/min',   'rpm', 'revolution per minute','vòng/phút',  'AngularVelocity',false,0.10471975511966,0,false,'active','UCUM','low'),

-- Speed
('m_s',  'm/s',       'm/s', 'metre per second','mét mỗi giây',   'Velocity', false, 1,       0, false, 'active', 'BIPM', 'low'),
('km_h', 'km/h',      'km/h','kilometre per hour','km mỗi giờ',   'Velocity', false, 0.27778, 0, false, 'active', 'BIPM', 'low'),

-- Count / Each (dimensionless — via ITUOM for packaging)
('each', '{each}',    'cái', 'each (piece)',   'cái / chiếc',      'CountOrQuantity', false, 1, 0, false, 'active', 'UCUM', 'low'),
('pcs',  '{pcs}',     'mảnh','piece',          'mảnh',             'CountOrQuantity', false, 1, 0, false, 'active', 'UCUM', 'low'),

-- Concentration / Chemistry
('mol_L',  'mol/L',   'mol/L',  'mole per litre',    'mol mỗi lít',   'Molarity',          false, 1000,  0, false, 'active', 'UCUM', 'medium'),
('mmol_L', 'mmol/L',  'mmol/L', 'millimole per litre','milimol/lít',  'Molarity',          false, 1,     0, false, 'active', 'UCUM', 'medium'),
('mg_mL',  'mg/mL',   'mg/mL',  'milligram per millilitre','mg/mL', 'MassConcentration',  false, 1000,  0, false, 'active', 'UCUM', 'medium'),
('g_L',    'g/L',     'g/L',    'gram per litre',    'gam mỗi lít',   'MassConcentration',  false, 1,     0, false, 'active', 'UCUM', 'medium'),
('mg_L',   'mg/L',    'mg/L',   'milligram per litre','mg mỗi lít',  'MassConcentration',  false, 0.001, 0, false, 'active', 'UCUM', 'medium'),

-- Dimensionless
('pct',    '%',       '%',      'percent',          'phần trăm',      'ConcentrationPercentage',false,0.01, 0,false,'active','UCUM','low'),
('ppm',    '[ppm]',   'ppm',    'parts per million', 'phần triệu',     'Dimensionless',      false, 0.000001,0,false,'active','UCUM','medium'),
('pH_unit','[pH]',    'pH',     'pH unit',          'đơn vị pH',      'pH',                 false, NULL,  0, false,'active','UCUM','medium'),

-- Angle
('rad',  'rad',       'rad', 'radian',         'radian',            'Angle', false, 1,              0, false, 'active', 'BIPM', 'low'),
('deg',  'deg',       '°',   'degree',         'độ (góc)',           'Angle', false, 0.01745329252,  0, false, 'active', 'BIPM', 'low'),

-- Density
('kg_m3','kg/m3',     'kg/m³','kilogram per cubic metre','kg/m³',   'Density', false, 1,    0, false, 'active', 'BIPM', 'low'),
('kg_L',  'kg/L',     'kg/L', 'kilogram per litre',    'kg/lít',   'Density', false, 1000, 0, false, 'active', 'BIPM', 'low')

ON CONFLICT (canonical_code) DO NOTHING;

-- ============================================================
-- CONVERSION RULES — Phase 1
-- Seeds as 'draft'; DO block below activates them using first
-- available user to satisfy chk_rule_approved constraint.
-- ============================================================

INSERT INTO uom_conversion_rule
    (rule_code, version, from_unit_code, to_unit_code, quantity_kind_code,
     category, factor, offset_value, factor_source, factor_exact,
     rounding_policy_id, bidirectional, effective_from, lifecycle_status, risk_level)
VALUES

-- Mass linear
('UOMCONV-MASS-KG-G-v1',   1,'kg',  'g',   'Mass',   'exact_linear',  1000,            0,'BIPM SI prefix k=10^3',              true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-MASS-KG-MG-v1',  1,'kg',  'mg',  'Mass',   'exact_linear',  1000000,         0,'BIPM SI prefix m=10^-3',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-MASS-KG-UG-v1',  1,'kg',  'ug',  'Mass',   'exact_linear',  1000000000,      0,'BIPM SI prefix µ=10^-6',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-MASS-KG-T-v1',   1,'kg',  't',   'Mass',   'exact_linear',  0.001,           0,'BIPM SI: 1 t = 1000 kg',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-MASS-KG-LB-v1',  1,'kg',  'lb',  'Mass',   'exact_linear',  2.20462262184878,0,'NIST/ISO: 1 lb = 0.45359237 kg exact',true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-MASS-KG-OZ-v1',  1,'kg',  'oz',  'Mass',   'exact_linear',  35.27396194958,  0,'NIST: 1 oz_av = 28.349523125 g',    true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Length linear
('UOMCONV-LEN-M-MM-v1',    1,'m',   'mm',  'Length', 'exact_linear',  1000,            0,'BIPM SI prefix m=10^-3',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-LEN-M-CM-v1',    1,'m',   'cm',  'Length', 'exact_linear',  100,             0,'BIPM SI prefix c=10^-2',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-LEN-M-UM-v1',    1,'m',   'um',  'Length', 'exact_linear',  1000000,         0,'BIPM SI prefix µ=10^-6',             true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-LEN-M-KM-v1',    1,'m',   'km',  'Length', 'exact_linear',  0.001,           0,'BIPM SI prefix k=10^3',              true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-LEN-M-IN-v1',    1,'m',   'in',  'Length', 'exact_linear',  39.3700787401575,0,'ISO 31-1/NIST: 1 in=0.0254 m exact', true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-LEN-M-FT-v1',    1,'m',   'ft',  'Length', 'exact_linear',  3.28083989501312,0,'ISO 31-1: 1 ft=0.3048 m exact',      true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Volume linear
('UOMCONV-VOL-M3-L-v1',    1,'m3',  'L',   'Volume', 'exact_linear',  1000,            0,'SI: 1 m³=1000 L (1 dm³=1 L)',        true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-VOL-L-ML-v1',    1,'L',   'mL',  'Volume', 'exact_linear',  1000,            0,'SI: 1 L = 1000 mL',                  true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-VOL-ML-UL-v1',   1,'mL',  'uL',  'Volume', 'exact_linear',  1000,            0,'SI prefix',                          true, 'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Temperature affine (°C→K uses additive offset 273.15; engine: K = °C + 273.15)
('UOMCONV-TEMP-CEL-K-v1',  1,'Cel', 'K',   'ThermodynamicTemperature','affine',1,273.15,'ITS-90/BIPM: K = °C + 273.15 exactly', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','medium'),
-- °F→°C affine: C = (F + offset) × factor where offset=-32, factor=5/9
('UOMCONV-TEMP-DEGF-CEL-v1',1,'degF','Cel','ThermodynamicTemperature','affine',
    0.55555555555555555556,-32.0,'ITS-90/BIPM: C=(F-32)×5/9',
    true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','medium'),

-- Temperature difference (linear, factor=1 — ΔK and Δ°C are numerically equal)
('UOMCONV-TDIFF-DELTAK-DELTACEL-v1',1,'DeltaK','DeltaCel','TemperatureDifference','exact_linear',1,0,'ITS-90: ΔK = Δ°C exactly', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Pressure
('UOMCONV-PRES-PA-KPA-v1',  1,'Pa',  'kPa', 'Pressure','exact_linear',   0.001,         0,'SI prefix', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-PRES-PA-MPA-v1',  1,'Pa',  'MPa', 'Pressure','exact_linear',   0.000001,      0,'SI prefix', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-PRES-PA-BAR-v1',  1,'Pa',  'bar', 'Pressure','defined_linear', 0.00001,       0,'ISO 80000-4: 1 bar=100000 Pa', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-PRES-PA-PSI-v1',  1,'Pa',  'psi', 'Pressure','defined_linear', 0.000145038,   0,'NIST: 1 psi=6894.757293 Pa',false,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-PRES-PA-ATM-v1',  1,'Pa',  'atm', 'Pressure','defined_linear', 0.0000098692,  0,'SI: 1 atm=101325 Pa exactly', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Energy
('UOMCONV-ENRG-J-KJ-v1',   1,'J',   'kJ',  'Energy','exact_linear',  0.001,             0,'SI prefix', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-ENRG-J-KWH-v1',  1,'J',   'kWh', 'Energy','defined_linear',0.00000027778,     0,'SI: 1 kWh=3600000 J exactly', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-ENRG-J-WH-v1',   1,'J',   'Wh',  'Energy','defined_linear',0.000277778,       0,'SI: 1 Wh=3600 J', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Power
('UOMCONV-PWR-W-KW-v1',    1,'W',   'kW',  'Power','exact_linear',   0.001,             0,'SI prefix', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-PWR-W-MW-v1',    1,'W',   'MW',  'Power','exact_linear',   0.000001,          0,'SI prefix', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Duration
('UOMCONV-TIME-S-MIN-v1',  1,'s',   'min', 'Duration','exact_linear',0.01666667,        0,'1 min=60 s', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-TIME-S-H-v1',    1,'s',   'h',   'Duration','exact_linear',0.000277778,       0,'1 h=3600 s', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),
('UOMCONV-TIME-S-D-v1',    1,'s',   'd',   'Duration','exact_linear',0.0000115741,      0,'1 d=86400 s', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Density
('UOMCONV-DENS-KGM3-KGL-v1',1,'kg_m3','kg_L','Density','exact_linear',0.001,            0,'SI: 1 kg/m³ = 0.001 kg/L', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low'),

-- Angle
('UOMCONV-ANG-RAD-DEG-v1', 1,'rad', 'deg', 'Angle','defined_linear', 57.2957795131,     0,'SI: 1 rad = 180/π deg', true,'ROUND_HALF_EVEN', true, '2026-01-01','draft','low')

ON CONFLICT (rule_code, version) DO NOTHING;

-- Activate standard conversion rules using first available user.
-- Rules stay 'draft' if no users exist yet (safe for empty-DB bootstrap).
DO $$
DECLARE
    v_approver UUID;
    v_count    INT;
BEGIN
    SELECT user_id INTO v_approver FROM users ORDER BY created_at ASC LIMIT 1;
    IF v_approver IS NOT NULL THEN
        UPDATE uom_conversion_rule
        SET    lifecycle_status = 'approved',
               approved_by     = v_approver,
               approved_at     = NOW()
        WHERE  rule_code LIKE 'UOMCONV-%'
          AND  lifecycle_status = 'draft';
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'UoM seed: activated % standard conversion rules', v_count;
    ELSE
        RAISE NOTICE 'UoM seed: no users found — % UOMCONV rules remain in draft; activate via admin UI',
            (SELECT COUNT(*) FROM uom_conversion_rule WHERE rule_code LIKE 'UOMCONV-%' AND lifecycle_status = 'draft');
    END IF;
END;
$$;

-- ============================================================
-- MATERIAL DENSITY REGISTRY — Phase 1 seeds
-- ============================================================

INSERT INTO material_density_registry
    (substance_code, substance_name_vi, substance_name_en,
     density_value, density_unit_code, temperature_celsius, density_source, effective_from)
VALUES
    ('WATER',       'Nước',           'Water',         0.99821,  'kg_L', 20.0, 'NIST Webbook',          '2026-01-01'),
    ('ETHANOL',     'Cồn etanol',     'Ethanol',       0.78945,  'kg_L', 20.0, 'NIST Webbook',          '2026-01-01'),
    ('ACETONE',     'Axêtôn',         'Acetone',       0.79100,  'kg_L', 20.0, 'NIST Webbook',          '2026-01-01'),
    ('STEEL_CARBON','Thép carbon',    'Carbon Steel',  7.850,    'kg_L', 20.0, 'Engineering reference',  '2026-01-01'),
    ('ALUMINUM',    'Nhôm',           'Aluminum',      2.700,    'kg_L', 20.0, 'Engineering reference',  '2026-01-01'),
    ('POLYETHYLENE','Polyêtylen',     'Polyethylene',  0.950,    'kg_L', 20.0, 'Engineering reference',  '2026-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- EXTERNAL CODE MAP — UNECE Rec 20 key mappings
-- ============================================================

INSERT INTO uom_external_code_map
    (canonical_code, external_system, external_code, external_numeric_id, confidence, source_document)
VALUES
    ('kg',  'UNECE_REC20', 'KGM', 4408,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('g',   'UNECE_REC20', 'GRM', 3539,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('mg',  'UNECE_REC20', 'MGM', 5656,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('t',   'UNECE_REC20', 'TNE', 6977,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('lb',  'UNECE_REC20', 'LBR', 5566,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('m',   'UNECE_REC20', 'MTR', 5595,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('cm',  'UNECE_REC20', 'CMT', 4416,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('mm',  'UNECE_REC20', 'MMT', 5694,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('L',   'UNECE_REC20', 'LTR', 5565,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('mL',  'UNECE_REC20', 'MLT', 5591,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('m3',  'UNECE_REC20', 'MTQ', 5600,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('each','UNECE_REC20', 'EA',  3294,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('each','UNECE_REC20', 'C62', 4418,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('pcs', 'UNECE_REC20', 'PCE', 5780,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('K',   'UNECE_REC20', 'KEL', 5513,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('Cel', 'UNECE_REC20', 'CEL', 6548,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('Pa',  'UNECE_REC20', 'PAL', 5581,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('bar', 'UNECE_REC20', 'BAR', 4385,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('W',   'UNECE_REC20', 'WTT', 6082,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('kW',  'UNECE_REC20', 'KWT', 5530,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('s',   'UNECE_REC20', 'SEC', 5898,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('min', 'UNECE_REC20', 'MIN', 5651,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('h',   'UNECE_REC20', 'HUR', 5107,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    ('d',   'UNECE_REC20', 'DAY', 4476,  'VERIFIED', 'UNECE Recommendation 20 Rev.18 2021'),
    -- OPC UA UnitId mappings (via UNECE numeric codes)
    ('kg',  'OPC_UA', 'KGM', 4408,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('m',   'OPC_UA', 'MTR', 5595,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('K',   'OPC_UA', 'KEL', 5513,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('Cel', 'OPC_UA', 'CEL', 6548,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('Pa',  'OPC_UA', 'PAL', 5581,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('bar', 'OPC_UA', 'BAR', 4385,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('L',   'OPC_UA', 'LTR', 5565,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId'),
    ('h',   'OPC_UA', 'HUR', 5107,  'VERIFIED', 'OPC UA Part 8 via UNECE Rec20 UnitId')
ON CONFLICT (external_system, external_code) DO NOTHING;
