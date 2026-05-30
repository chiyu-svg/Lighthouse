package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type ActionConfig struct {
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config"`
}

type ActionConfigList []ActionConfig

func (a *ActionConfigList) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("ActionConfigList.Scan: 值不是 []byte 类型")
	}
	return json.Unmarshal(bytes, a)
}

func (a ActionConfigList) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "[]", nil
	}
	return json.Marshal(a)
}

type Trigger struct {
	ID            string           `gorm:"column:id;type:varchar(64);primaryKey" json:"id"`
	HookID        string           `gorm:"column:hook_id;type:varchar(64);not null;index" json:"hook_id"`
	Expression    string           `gorm:"column:expression;type:varchar(512);not null;default:'true'" json:"expression"`
	ActionConfigs ActionConfigList `gorm:"column:action_configs;type:json;not null" json:"action_configs"`
	CreatedAt     time.Time        `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time        `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

// 指定表明
func (Trigger) TableName() string {
	return "trigger"
}
