package action

import (
	"context"
	"fmt"
	"go-lighthouse/db"
	"log"
)

type MySQLAction struct{}

func (a *MySQLAction) Execute(ctx context.Context, config map[string]interface{}) error {
	// ==================== 1. 读取配置 ====================

	sql := getConfigString(config, "sql", "")
	if sql == "" {
		return fmt.Errorf("MySQLAction: 缺少必填配置 sql")
	}

	// params 可选，SQL参数（用于占位符 ? ）
	// 将 []string 转为 []interface{} 供GORM使用
	stringParams := getConfigStringSlice(config, "params")
	params := make([]interface{}, len(stringParams))
	for i, v := range stringParams {
		params[i] = v
	}

	// =================== 2. 获取数据库连接 ===============

	database := db.GetDB()
	if database == nil {
		return fmt.Errorf("MySQLAction: 数据库连接未初始化")
	}

	// ==================== 3. 执行SQL ====================
	log.Printf("[MySQLAction] 执行SQL: %s, params=%v", sql, params)

	// WithContext: 将Context传递给GORM，实现超时控制
	// 当Context超时或取消时，SQL执行会自动中断
	result := database.WithContext(ctx).Exec(sql, params...)

	// ==================== 4. 检查执行结果 ====================

	if result.Error != nil {
		return fmt.Errorf("MySQLAction: SQL执行失败: %w", result.Error)
	}

	rowsAffected := result.RowsAffected
	log.Printf("[MySQLAction] SQL执行成功: affected=%d rows", rowsAffected)
	return nil
}
