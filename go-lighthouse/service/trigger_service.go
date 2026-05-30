package service

import (
	"fmt"
	"go-lighthouse/db"
	"go-lighthouse/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// 创建 Trigger 请求参数
type CreateTriggerReq struct {
	HookID        string                 `json:"hook_id" binding:"required"`
	Expression    string                 `json:"expression" binding:"required"`
	ActionConfigs model.ActionConfigList `json:"action_configs" binding:"required"`
}

// UpdateTriggerReq 更新 Trigger 请求参数
// Expression 为指针类型，支持可选更新
type UpdateTriggerReq struct {
	Expression    *string                `json:"expression"`
	ActionConfigs model.ActionConfigList `json:"action_configs" binding:"required"`
}

// CreateTrigger 为 Hook 创建 Trigger
// 流程：校验 Hook 存在 → 检查是否已有 Trigger → 创建并写入数据库
func CreateTrigger(req CreateTriggerReq) (*model.Trigger, error) {
	database := db.GetDB()

	// 检查Hook是否存在
	var hook model.Hook

	if err := database.Where("id = ?", req.HookID).First(&hook).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("Hook不存在: %s", req.HookID)
		}
		return nil, fmt.Errorf("查询Hook失败: %w", err)
	}

	// 检查该Hook是否已经有 Trigger
	var count int64
	database.Model(&model.Trigger{}).Where("hook_id = ?", req.HookID).Count(&count)
	if count > 0 {
		return nil, fmt.Errorf("Hook %s 已存在Trigger，请使用更新接口", req.HookID)
	}

	// 创建 Trigger
	trigger := model.Trigger{
		ID:            uuid.New().String(),
		HookID:        req.HookID,
		Expression:    req.Expression,
		ActionConfigs: req.ActionConfigs,
	}

	if err := database.Create(&trigger).Error; err != nil {
		return nil, fmt.Errorf("创建Trigger失败: %w", err)
	}
	return &trigger, nil

}

// GetTriggerByHookID 根据 HookID 查询 Trigger 及其动作配置

func GetTriggerByHookID(hookID string) (*model.Trigger, error) {
	database := db.GetDB()
	var trigger model.Trigger
	if err := database.Where("hook_id = ?", hookID).First(&trigger).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("该Hook尚未配置Trigger: %s", hookID)
		}
		return nil, fmt.Errorf("查询Trigger失败: %w", err)
	}
	return &trigger, nil
}

// 更新 Trigger 的动作配置
func UpdateTrigger(id string, req UpdateTriggerReq) error {
	database := db.GetDB()

	// 检查 Trigger 是否存在
	var trigger model.Trigger
	if err := database.Where("id = ?", id).First(&trigger).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("Trigger不存在: %s", id)
		}
		return fmt.Errorf("查询Trigger失败: %w", err)
	}

	// 构造更新字段
	updates := map[string]interface{}{
		"action_configs": req.ActionConfigs,
	}
	// 如果传入了 Expression，则更新
	if req.Expression != nil {
		updates["expression"] = *req.Expression
	}

	// 更细动作配置
	if err := database.Model(&trigger).Updates(updates).Error; err != nil {
		return fmt.Errorf("更新Trigger失败: %w", err)
	}
	return nil
}
