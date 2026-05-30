package service

import (
	"fmt"
	"go-lighthouse/db"
	"go-lighthouse/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CreateHookReq struct {
	Name          string `json:"name" binding:"required"`
	Description   string `json:"description"`
	TriggerType   string `json:"trigger_type" binding:"required,oneof=manual timer api"`
	TriggerConfig string `json:"trigger_config"`
}

type UpdateHookReq struct {
	Name        *string `json:"name"`        // Hook名称（可选更新）
	Description *string `json:"description"` // Hook描述（可选更新）
}

type HookListResp struct {
	List  []model.Hook `json:"list"`
	Total int64        `json:"total"`
}

// 创建Hook
func CreateHook(req CreateHookReq) (*model.Hook, string, error) {
	database := db.GetDB()

	// 生成 UUID 作为 Hook ID
	hookID := uuid.New().String()

	// 自动生成 Hook 接收地址
	receiveURL := fmt.Sprintf("/api/v1/hook/receive/%s", hookID)

	// 构造 Hook 对象
	hook := model.Hook{
		ID:            hookID,
		Name:          req.Name,
		Description:   req.Description,
		TriggerType:   req.TriggerType,
		TriggerConfig: stringToPtr(req.TriggerConfig),
		Status:        1, // 默认启用
	}

	// 写入数据库
	if err := database.Create(&hook).Error; err != nil {
		return nil, "", fmt.Errorf("创建Hook失败: %w", err)
	}

	return &hook, receiveURL, nil
}

// ListHook 分页查询Hook 列表
func ListHook(page, pageSize int) (*HookListResp, error) {
	database := db.GetDB()

	var list []model.Hook
	var total int64

	// 查询总数
	if err := database.Model(&model.Hook{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("查询Hook总数失败: %w", err)
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := database.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, fmt.Errorf("查询Hook列表失败: %w", err)
	}
	return &HookListResp{List: list, Total: total}, nil
}

// GetHookDetail 根据ID 查询 Hook 详情
func GetHookDetail(id string) (*model.Hook, error) {
	database := db.GetDB()

	var hook model.Hook
	if err := database.Where("id = ?", id).First(&hook).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("Hook不存在: %s", id)
		}
		return nil, fmt.Errorf("查询Hook详情失败: %w", err)
	}
	return &hook, nil
}

// 更新Hook 信息
func UpdateHook(id string, req UpdateHookReq) error {
	database := db.GetDB()

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if len(updates) == 0 {
		return fmt.Errorf("没有需要更新的字段")
	}

	// 执行更新
	result := database.Model(&model.Hook{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return fmt.Errorf("更新Hook失败: %w", result.Error)

	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("Hook不存在: %s", id)
	}
	return nil
}

// 删除 Hook
func DeleteHook(id string) error {
	database := db.GetDB()

	// 先检查 Hook 是否存在
	var hook model.Hook
	if err := database.Where("id = ?", id).First(&hook).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("Hook 不存在: %s", id)
		}
		return fmt.Errorf("查询Hook失败: %w", err)
	}

	// 开启事务， 保证原子性
	return database.Transaction(func(tx *gorm.DB) error {
		// 删除关联的 Trigger
		tx.Where("hook_id = ?", id).Delete(&model.Trigger{})
		// 删除 Hook 本身
		if err := tx.Delete(&hook).Error; err != nil {
			return fmt.Errorf("删除Hook失败: %w", err)
		}
		return nil
	})
}

// 切换 Hook 启用/禁用状态
func ToggleHookStatus(id string) error {
	database := db.GetDB()

	// 查询当前状态
	var hook model.Hook

	if err := database.Where("id = ?", id).First(&hook).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("Hook不存在: %s", id)
		}
		return fmt.Errorf("查询Hook失败: %w", err)
	}

	newStatus := int8(1)
	if hook.Status == 1 {
		newStatus = 0
	}

	if err := database.Model(&hook).Update("status", newStatus).Error; err != nil {
		return fmt.Errorf("更新Hook状态失败: %w", err)
	}
	return nil
}

// 用于 JSON 字段： 空字符串存为 SQL NULL
func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
