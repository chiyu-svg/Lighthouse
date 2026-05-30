package model

import "time"

type Hook struct {
	ID            string    `gorm:"column:id;type:varchar(64);primaryKey" json:"id"`
	Name          string    `gorm:"column:name;type:varchar(128);not null" json:"name"`
	Description   string    `gorm:"column:description;type:varchar(512);default:''" json:"description"`
	TriggerType   string    `gorm:"column:trigger_type;type:varchar(32);not null" json:"trigger_type"` // manual/timer/api
	TriggerConfig *string   `gorm:"column:trigger_config;type:json" json:"trigger_config"`             // JSON配置，可选
	Status        int8      `gorm:"column:status;type:tinyint;not null;default:1" json:"status"`       // 1-启用, 0-禁用
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Hook) TableName() string {
	return "hook"
}
