package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type Task struct {
	ID        string     `gorm:"column:id;type:varchar(64);primaryKey" json:"id"`
	HookID    string     `gorm:"column:hook_id;type:varchar(64);not null;index" json:"hook_id"`
	TriggerID string     `gorm:"column:trigger_id;type:varchar(64);not null;index" json:"trigger_id"`
	Status    string     `gorm:"column:status;type:varchar(32);not null;index" json:"status"`
	CostTime  int        `gorm:"column:cost_time;type:int;default:0" json:"cost_time"`
	CreatedAt time.Time  `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
	EndAt     *time.Time `gorm:"column:end_at" json:"end_at"`
}

func (Task) TableName() string {
	return "task"
}

type JSONMap map[string]interface{}

func (j *JSONMap) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("JSONMap.Scan: 值不是 []byte 类型")
	}
	return json.Unmarshal(bytes, j)
}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

type TaskActionLog struct {
	ID           string    `gorm:"column:id;type:varchar(64);primaryKey" json:"id"`
	TaskID       string    `gorm:"column:task_id;type:varchar(64);not null;index" json:"task_id"`
	ActionType   string    `gorm:"column:action_type;type:varchar(32);not null;index" json:"action_type"` // api/email/mysql
	ActionConfig JSONMap   `gorm:"column:action_config;type:json;not null" json:"action_config"`
	Status       string    `gorm:"column:status;type:varchar(32);not null;index" json:"status"` // success/failed
	ErrorMsg     string    `gorm:"column:error_msg;type:text" json:"error_msg"`
	CostTime     int       `gorm:"column:cost_time;type:int;default:0" json:"cost_time"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (TaskActionLog) TableName() string {
	return "task_action_log"
}
