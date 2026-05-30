-- ============================================
-- Go-Lighthouse 数据库初始化脚本
-- 使用前请确保 MySQL 服务已启动
-- ============================================

-- 创建数据库（UTF-8字符集，InnoDB引擎）
CREATE DATABASE IF NOT EXISTS go_lighthouse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE go_lighthouse;

-- 1. hook 表：存储钩子配置（触发源）
CREATE TABLE IF NOT EXISTS `hook` (
    `id` VARCHAR(64) NOT NULL COMMENT 'Hook唯一ID（UUID）',
    `name` VARCHAR(128) NOT NULL COMMENT 'Hook名称',
    `description` VARCHAR(512) DEFAULT '' COMMENT 'Hook描述',
    `trigger_type` VARCHAR(32) NOT NULL COMMENT '触发类型：manual（手动）、timer（定时）、api（接口触发）',
    `trigger_config` JSON DEFAULT NULL COMMENT '触发配置（JSON）：定时触发存cron表达式，接口触发存密钥等',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_trigger_type` (`trigger_type`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='钩子配置表';

-- 2. trigger 表：存储触发器（关联Hook与动作）
CREATE TABLE IF NOT EXISTS `trigger` (
    `id` VARCHAR(64) NOT NULL COMMENT 'Trigger唯一ID（UUID）',
    `hook_id` VARCHAR(64) NOT NULL COMMENT '关联的HookID',
    `action_configs` JSON NOT NULL COMMENT '动作配置列表（JSON）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_hook_id` (`hook_id`),
    CONSTRAINT `fk_trigger_hook_id` FOREIGN KEY (`hook_id`) REFERENCES `hook`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='触发器表（关联Hook与动作）';

-- 3. task 表：存储任务执行记录
CREATE TABLE IF NOT EXISTS `task` (
    `id` VARCHAR(64) NOT NULL COMMENT 'Task唯一ID（UUID）',
    `hook_id` VARCHAR(64) NOT NULL COMMENT '关联的HookID',
    `trigger_id` VARCHAR(64) NOT NULL COMMENT '关联的TriggerID',
    `status` VARCHAR(32) NOT NULL COMMENT '任务状态：pending/processing/success/failed',
    `cost_time` INT DEFAULT 0 COMMENT '执行耗时（毫秒）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `end_at` DATETIME DEFAULT NULL COMMENT '结束时间',
    PRIMARY KEY (`id`),
    INDEX `idx_hook_id` (`hook_id`),
    INDEX `idx_trigger_id` (`trigger_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    CONSTRAINT `fk_task_hook_id` FOREIGN KEY (`hook_id`) REFERENCES `hook`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_task_trigger_id` FOREIGN KEY (`trigger_id`) REFERENCES `trigger`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务执行记录表';

-- 4. task_action_log 表：存储任务动作执行日志
CREATE TABLE IF NOT EXISTS `task_action_log` (
    `id` VARCHAR(64) NOT NULL COMMENT '日志唯一ID（UUID）',
    `task_id` VARCHAR(64) NOT NULL COMMENT '关联的TaskID',
    `action_type` VARCHAR(32) NOT NULL COMMENT '动作类型：api/email/mysql',
    `action_config` JSON NOT NULL COMMENT '动作配置（JSON）',
    `status` VARCHAR(32) NOT NULL COMMENT '动作执行状态：success/failed',
    `error_msg` TEXT DEFAULT NULL COMMENT '错误信息（执行失败时存储）',
    `cost_time` INT DEFAULT 0 COMMENT '动作执行耗时（毫秒）',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_task_id` (`task_id`),
    INDEX `idx_action_type` (`action_type`),
    INDEX `idx_status` (`status`),
    CONSTRAINT `fk_log_task_id` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务动作执行日志表';

-- 5. webhook_log 表：存储Webhook请求日志
CREATE TABLE IF NOT EXISTS `webhook_log` (
    `id` VARCHAR(64) NOT NULL COMMENT '日志唯一ID（UUID）',
    `hook_id` VARCHAR(64) NOT NULL COMMENT '关联的HookID',
    `request_body` TEXT NOT NULL COMMENT '请求体内容',
    `signature` VARCHAR(256) DEFAULT NULL COMMENT '请求签名',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_hook_id` (`hook_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Webhook请求日志表';