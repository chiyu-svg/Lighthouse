package model

import "time"

// webhook Log
type WebhookLog struct {
	ID          string    `gorm:"column:id;type:varchar(64);primaryKey" json:"id"`
	HookID      string    `gorm:"column:hook_id;type:varchar(64);not null;index" json:"hook_id"`
	RequestBody string    `gorm:"column:request_body;type:text;not null" json:"request_body"`
	Signature   string    `gorm:"column:signature;type:varchar(256)" json:"signature"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (WebhookLog) TableName() string {
	return "webhook_log"
}
