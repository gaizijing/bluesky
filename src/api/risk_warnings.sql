-- 创建风险预警表
CREATE TABLE IF NOT EXISTS `weather_risk_warnings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `point_id` INT(11) NOT NULL COMMENT '监测点ID',
  `risk_level` ENUM('low', 'medium', 'high', 'extreme') NOT NULL COMMENT '风险等级',
  `risk_type` VARCHAR(50) NOT NULL COMMENT '风险类型',
  `risk_description` TEXT NOT NULL COMMENT '风险描述',
  `report_time` DATETIME NOT NULL COMMENT '报告时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_point_id` (`point_id`),
  INDEX `idx_report_time` (`report_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='天气风险预警表';

-- 插入示例数据
INSERT INTO `weather_risk_warnings` (`point_id`, `risk_level`, `risk_type`, `risk_description`, `report_time`) VALUES
(1, 'medium', '强风', '预计未来6小时内将出现8-10级强风，可能对飞行造成影响', '2026-02-26 10:00:00'),
(1, 'high', '暴雨', '预计未来12小时内将出现暴雨，累计降雨量可能超过50mm', '2026-02-26 11:30:00'),
(2, 'low', '能见度低', '预计未来3小时内能见度可能降至1000米以下', '2026-02-26 09:00:00'),
(3, 'extreme', '雷暴', '预计未来2小时内将出现强雷暴天气，伴随冰雹和强风', '2026-02-26 12:00:00'),
(2, 'medium', '大雾', '预计未来4小时内将出现大雾天气，能见度可能降至500米以下', '2026-02-26 08:30:00'),
(1, 'low', '降温', '预计未来24小时内气温将下降8-10℃，请注意保暖', '2026-02-26 07:00:00'),
(3, 'high', '大风', '预计未来8小时内将出现10-12级大风，可能对设施造成损坏', '2026-02-26 13:00:00'),
(2, 'medium', '雷电', '预计未来6小时内将出现雷电活动，请注意防范', '2026-02-26 14:30:00'),
(1, 'high', '暴雨', '预计未来10小时内将出现持续性暴雨，可能引发内涝', '2026-02-26 15:00:00'),
(3, 'low', '降温', '预计未来24小时内气温将下降5-7℃，请注意添加衣物', '2026-02-26 16:00:00');

-- 创建监测点表（如果不存在）
CREATE TABLE IF NOT EXISTS `monitoring_points` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '监测点名称',
  `latitude` DOUBLE NOT NULL COMMENT '纬度',
  `longitude` DOUBLE NOT NULL COMMENT '经度',
  `description` TEXT COMMENT '监测点描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监测点表';

-- 插入监测点示例数据
INSERT INTO `monitoring_points` (`name`, `latitude`, `longitude`, `description`) VALUES
('青岛流亭机场', 36.2747, 120.3895, '青岛主要机场监测点'),
('黄岛监测站', 35.9907, 120.1689, '黄岛地区气象监测站'),
('崂山监测站', 36.1407, 120.4028, '崂山地区气象监测站');
