package service

import (
	"encoding/json"
	"fmt"
	"go-lighthouse/db"
	"go-lighthouse/model"
	"time"
)

// ==================== 请求参数结构体 ====================

// TaskListReq 任务列表查询请求参数
type TaskListReq struct {
	Page      int    `form:"page"`       // 页码
	PageSize  int    `form:"pageSize"`   // 每页条数
	Status    string `form:"status"`     // 状态筛选：pending/processing/success/failed
	HookID    string `form:"hook_id"`    // Hook ID 筛选
	StartTime string `form:"start_time"` // 开始时间（格式：2024-01-01）
	EndTime   string `form:"end_time"`   // 结束时间（格式：2024-12-31）
}

// TaskListResp 任务列表响应
type TaskListResp struct {
	List  []TaskWithHookName `json:"list"`  // 任务列表（含 Hook 名称）
	Total int64              `json:"total"` // 总数
}

// TaskWithHookName 带Hook名称的任务信息
// 列表页需要展示 Hook 名称，但 task 表里只有 hook_id
type TaskWithHookName struct {
	model.Task
	HookName string `json:"hook_name"` // 关联的 Hook 名称
}

// TaskDetailResp 任务详情响应（含 Action 日志和 Webhook 请求信息）
type TaskDetailResp struct {
	Task       model.Task            `json:"task"`        // 任务基本信息
	HookName   string                `json:"hook_name"`   // Hook 名称
	ActionLogs []model.TaskActionLog `json:"action_logs"` // Action 执行日志
	WebhookLog *model.WebhookLog     `json:"webhook_log"` // 关联的 Webhook 请求日志
}

// ==================== GetTaskList 查询任务列表 ====================
// 支持多条件筛选 + 分页，返回时关联 Hook 名称
func GetTaskList(req TaskListReq) (*TaskListResp, error) {
	database := db.GetDB()

	// 构建查询条件
	query := database.Model(&model.Task{})

	// 状态筛选
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// Hook ID 筛选
	if req.HookID != "" {
		query = query.Where("hook_id = ?", req.HookID)
	}

	// 开始时间筛选
	if req.StartTime != "" {
		if t, err := time.Parse("2006-01-02", req.StartTime); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}

	// 结束时间筛选
	if req.EndTime != "" {
		if t, err := time.Parse("2006-01-02", req.EndTime); err == nil {
			// 结束时间算到当天 23:59:59
			endTime := t.Add(24*time.Hour - time.Second)
			query = query.Where("created_at <= ?", endTime)
		}
	}

	// 查询总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("查询任务总数失败: %w", err)
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	var tasks []model.Task
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("查询任务列表失败: %w", err)
	}
	// 关联查询 Hook 名称
	list := make([]TaskWithHookName, 0, len(tasks))
	for _, t := range tasks {
		item := TaskWithHookName{Task: t}

		// 查询关联的 Hook 名称
		var hook model.Hook
		if err := database.Select("name").Where("id = ?", t.HookID).First(&hook).Error; err == nil {
			item.HookName = hook.Name
		} else {
			item.HookName = "未知Hook"
		}

		list = append(list, item)
	}

	return &TaskListResp{List: list, Total: total}, nil
}

// ==================== GetTaskDetail 查询任务详情 ====================

// 返回任务基本信息 + Hook 名称 + Action 日志 + Webhook 请求日志
func GetTaskDetail(taskID string) (*TaskDetailResp, error) {
	database := db.GetDB()
	// 1. 查询任务基本信息
	var task model.Task
	if err := database.Where("id = ?", taskID).First(&task).Error; err != nil {
		return nil, fmt.Errorf("任务不存在: %s", taskID)
	}

	// 2. 查询关联的 Hook 名称
	var hook model.Hook
	hookName := "未知Hook"
	if err := database.Select("name").Where("id = ?", task.HookID).First(&hook).Error; err == nil {
		hookName = hook.Name
	}

	// 3. 查询 Actio 执行日志
	var actionLogs []model.TaskActionLog
	database.Where("task_id = ?", taskID).Order("created_at ASC").Find(&actionLogs)

	if jsonBytes, err := json.MarshalIndent(actionLogs, "", "  "); err == nil {
		fmt.Printf("[DEBUG] actionLogs 查询结果:\n%s\n", string(jsonBytes))
	} else {
		fmt.Printf("[DEBUG] actionLogs 序列化失败: %v\n", err)
	}

	// 4. 查询关联的 Webhook 请求日志
	// 按 hook_id + 时间范围匹配最近一条
	var webhookLog model.WebhookLog
	webhookLogPtr := (*model.WebhookLog)(nil)
	if err := database.Where("hook_id = ? AND created_at <= ?", task.HookID, task.CreatedAt).
		Order("created_at DESC").First(&webhookLog).Error; err == nil {
		webhookLogPtr = &webhookLog
	}
	return &TaskDetailResp{
		Task:       task,
		HookName:   hookName,
		ActionLogs: actionLogs,
		WebhookLog: webhookLogPtr,
	}, nil
}

// ==================== GetTaskActionLog 查询任务的 Action 日志 ====================
func GetTaskActionLog(taskID string) ([]model.TaskActionLog, error) {
	database := db.GetDB()

	var logs []model.TaskActionLog
	if err := database.Where("task_id = ?", taskID).Order("created_at ASC").Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("查询Action日志失败: %w", err)
	}
	return logs, nil
}

// ==================== 统计数据 ====================

// TaskStats 任务统计
type TaskStats struct {
	TodayTotal   int64   `json:"today_total"`   // 今日任务总数
	TodaySuccess int64   `json:"today_success"` // 今日成功数
	TodayFailed  int64   `json:"today_failed"`  // 今日失败数
	SuccessRate  float64 `json:"success_rate"`  // 今日成功率(%)
}

// GetTaskStats 获取今日任务统计
func GetTaskStats() *TaskStats {
	database := db.GetDB()
	todayStart := time.Now().Truncate(24 * time.Hour)

	stats := &TaskStats{}

	database.Model(&model.Task{}).Where("created_at >= ?", todayStart).Count(&stats.TodayTotal)
	database.Model(&model.Task{}).Where("created_at >= ? AND status = ?", todayStart, "success").Count(&stats.TodaySuccess)
	database.Model(&model.Task{}).Where("created_at >= ? AND status = ?", todayStart, "failed").Count(&stats.TodayFailed)

	finished := stats.TodaySuccess + stats.TodayFailed
	if finished > 0 {
		stats.SuccessRate = float64(stats.TodaySuccess) / float64(finished) * 100
	}

	return stats
}
