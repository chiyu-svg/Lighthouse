package db

import (
	"fmt"
	"go-lighthouse/config"
	"go-lighthouse/model"
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var dbInstance *gorm.DB

const DevMode = false

func InitDB() {
	cfg := config.GetDBConfig()

	// 连接 MySql
	var err error
	dbInstance, err = gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{
		PrepareStmt: false,
	})

	if err != nil {
		log.Fatalf("[DB] 获取底层 sql.DB 失败: %v", err)
	}
	log.Println("[DB] 数据库连接成功")

	// 配置连接池
	sqlDB, err := dbInstance.DB()
	if err != nil {
		log.Fatalf("[DB] 获取底层 sql.DB 失败: %v", err)
	}
	sqlDB.SetMaxOpenConns(100)                 // 最多 100 个连接
	sqlDB.SetMaxIdleConns(10)                  // 最多保留 10 个空闲连接
	sqlDB.SetConnMaxIdleTime(10 * time.Second) // 空闲10秒就关闭
	sqlDB.SetConnMaxLifetime(1 * time.Hour)    // 连接最长存活1小时

	if DevMode {
		// 先删表（按外键依赖倒序）
		dbInstance.Exec("SET FOREIGN_KEY_CHECKS = 0")
		dbInstance.Exec("DROP TABLE IF EXISTS task_action_log")
		dbInstance.Exec("DROP TABLE IF EXISTS task")
		dbInstance.Exec("DROP TABLE IF EXISTS webhook_log")
		dbInstance.Exec("DROP TABLE IF EXISTS trigger")
		dbInstance.Exec("DROP TABLE IF EXISTS hook")
		dbInstance.Exec("SET FOREIGN_KEY_CHECKS = 1")
		log.Println("[DB] 开发模式：已清空旧表")
	}

	// 自动迁移表结构
	err = dbInstance.AutoMigrate(
		&model.Hook{},
		&model.Trigger{},
		&model.Task{},
		&model.TaskActionLog{},
		&model.WebhookLog{},
	)

	if err != nil {
		log.Fatalf("[DB] 表结构迁移失败: %v", err)
	}
	log.Println("[DB] 表结构迁移成功")
	fmt.Printf("[DB] 已连接: %s@%s:%s/%s\n", cfg.User, cfg.Host, cfg.Port, cfg.DBName)
}

func GetDB() *gorm.DB {
	return dbInstance
}
