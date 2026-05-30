package service

import (
	"go-lighthouse/db"
	"go-lighthouse/model"
	"runtime"
	"sync"
	"time"
)

// ==================== Goroutine 快照存储 ====================

// GoroutineSnapshot Goroutine数量快照
type GoroutineSnapshot struct {
	Time  string `json:"time"`  // 时间（格式：15:04:05）
	Count int    `json:"count"` // Goroutine数量
}

// 全局快照存储（内存中保留最近2小时的数据）
var (
	goroutineSnapshots []GoroutineSnapshot
	snapshotMu         sync.Mutex
	maxSnapshotAge     = 2 * time.Hour // 最大保留时长
)

// RecordGoroutineSnapshot 记录当前Goroutine数量快照
// 由后台Goroutine每30秒调用一次
func RecordGoroutineSnapshot() {
	snapshotMu.Lock()
	defer snapshotMu.Unlock()

	snapshot := GoroutineSnapshot{
		Time:  time.Now().Format("15:04:05"),
		Count: runtime.NumGoroutine(),
	}

	goroutineSnapshots = append(goroutineSnapshots, snapshot)

	// 清理超过2小时的旧数据
	cutoff := time.Now().Add(-maxSnapshotAge)
	newSnapshots := make([]GoroutineSnapshot, 0, len(goroutineSnapshots))

	for _, s := range goroutineSnapshots {
		t, err := time.Parse("15:04:05", s.Time)
		if err != nil {
			continue
		}
		// 用今天的日期补全
		now := time.Now()
		fullTime := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), t.Second(), 0, now.Location())
		if fullTime.After(cutoff) {
			newSnapshots = append(newSnapshots, s)
		}
	}
	goroutineSnapshots = newSnapshots
}

// ==================== 监控概览数据 ====================

// MonitorData 监控概览数据结构
type MonitorData struct {
	GoroutineCount int     `json:"goroutine_count"` // 当前Goroutine数量
	RunningTasks   int64   `json:"running_tasks"`   // 正在执行的任务数
	TodayTotal     int64   `json:"today_total"`     // 今日任务总数
	TodaySuccess   int64   `json:"today_success"`   // 今日成功任务数
	TodayFailed    int64   `json:"today_failed"`    // 今日失败任务数
	SuccessRate    float64 `json:"success_rate"`    // 今日成功率(%)
}

// GetMonitorData 获取监控概览数据
// 数据来源：runtime.NumGoroutine() + 数据库task表统计
func GetMonitorData() (*MonitorData, error) {
	database := db.GetDB()
	data := &MonitorData{
		GoroutineCount: runtime.NumGoroutine(),
	}

	// 今日零点
	todayStart := time.Now().Truncate(24 * time.Hour)

	// 查询正在执行的任务数（status=processing）
	database.Model(&model.Task{}).Where("status = ?", "processing").Count(&data.RunningTasks)

	// 查询今日任务总数
	database.Model(&model.Task{}).Where("created_at >= ?", todayStart).Count(&data.TodayTotal)

	// 查询今日成功任务数
	database.Model(&model.Task{}).Where("created_at >= ? AND status = ?", todayStart, "success").Count(&data.TodaySuccess)

	// 查询今日失败任务数
	database.Model(&model.Task{}).Where("created_at >= ? AND status = ?", todayStart, "failed").Count(&data.TodayFailed)

	// 计算成功率
	finished := data.TodaySuccess + data.TodayFailed
	if finished > 0 {
		data.SuccessRate = float64(data.TodaySuccess) / float64(finished) * 100
	}
	return data, nil
}

// ==================== Goroutine 趋势 ====================

// GetGoroutineTrend 获取Goroutine趋势数据
// rangeType: "today"(今日), "yesterday"(昨日), "week"(近7天)
// 今日：返回内存中的快照数据
// 昨日/近7天：从数据库task表按时间分组估算
func GetGoroutineTrend(rangeType string) []GoroutineSnapshot {
	snapshotMu.Lock()
	defer snapshotMu.Unlock()

	if rangeType == "today" {
		// 今日：直接返回内存快照
		result := make([]GoroutineSnapshot, len(goroutineSnapshots))
		copy(result, goroutineSnapshots)
		return result
	}

	// 昨日或近7天：从数据查询task 创建频率作为估算
	database := db.GetDB()
	var startTime time.Time
	now := time.Now()

	if rangeType == "yesterday" {
		startTime = now.Add(-24 * time.Hour).Truncate(24 * time.Hour)
	} else {
		// week
		startTime = now.Add(-7 * 24 * time.Hour).Truncate(24 * time.Hour)
	}

	// 按小时分组统计任务数
	type HourCount struct {
		Hour  string
		Count int64
	}

	var hourCounts []HourCount

	database.Model(&model.Task{}).
		Select("DATE_FORMAT(created_at, '%H:00') as hour, count(*) as count").
		Where("created_at >= ?", startTime).
		Group("hour").
		Order("hour").
		Find(&hourCounts)

	// 用任务数估算Goroutine数：基础数 + 任务数 * 系数
	baseCount := runtime.NumGoroutine() - len(hourCounts) // 去掉估算部分的基础值
	if baseCount < 8 {
		baseCount = 8 // 最少等于Worker数量
	}

	result := make([]GoroutineSnapshot, 0, len(hourCounts))
	for _, hc := range hourCounts {
		estimated := baseCount + int(float64(hc.Count)*1.5)
		result = append(result, GoroutineSnapshot{
			Time:  hc.Hour,
			Count: estimated,
		})
	}
	return result
}

// ==================== 成功率趋势 ====================

// SuccessRateItem 成功率趋势数据项
type SuccessRateItem struct {
	Time         string  `json:"time"`          // 时间（小时）
	SuccessRate  float64 `json:"success_rate"`  // 成功率(%)
	TaskCount    int64   `json:"task_count"`    // 任务总数
	SuccessCount int64   `json:"success_count"` // 成功数
	FailedCount  int64   `json:"failed_count"`  // 失败数
}

// GetSuccessRateTrend 获取今日成功率趋势（按小时分组）
func GetSuccessRateTrend() []SuccessRateItem {
	database := db.GetDB()
	todayStart := time.Now().Truncate(24 * time.Hour)

	// 按小时分组统计
	type HourStats struct {
		Hour   string
		Status string
		Count  int64
	}

	var stats []HourStats

	database.Model(&model.Task{}).
		Select("DATE_FORMAT(created_at, '%H:00') as hour, status, count(*) as count").
		Where("created_at >= ? AND status IN ?", todayStart, []string{"success", "failed"}).
		Group("hour, status").
		Order("hour").
		Find(&stats)

	// 按小时聚合
	hourMap := make(map[string]*SuccessRateItem)
	for _, s := range stats {
		if _, ok := hourMap[s.Hour]; !ok {
			hourMap[s.Hour] = &SuccessRateItem{Time: s.Hour}
		}
		item := hourMap[s.Hour]
		item.TaskCount += s.Count
		if s.Status == "success" {
			item.SuccessCount = s.Count
		} else {
			item.FailedCount = s.Count
		}
	}

	// 计算成功率
	result := make([]SuccessRateItem, 0, len(hourMap))
	for _, item := range hourMap {
		if item.TaskCount > 0 {
			item.SuccessRate = float64(item.SuccessCount) / float64(item.TaskCount) * 100
		}
		result = append(result, *item)
	}
	return result
}

// ==================== 耗时TOP5 ====================

// GetTaskCostTop5 获取今日耗时最长的5个任务
func GetTaskCostTop5() []model.Task {
	database := db.GetDB()
	todayStart := time.Now().Truncate(24 * time.Hour)

	var tasks []model.Task
	database.Where("created_at >= ? AND cost_time > 0", todayStart).
		Order("cost_time DESC").
		Limit(5).
		Find(&tasks)
	return tasks
}

// ==================== 数据库健康检查 ====================

// CheckDBHealth 检查数据库连接是否正常
func CheckDBHealth() bool {
	database := db.GetDB()
	sqlDB, err := database.DB()
	if err != nil {
		return false
	}
	return sqlDB.Ping() == nil

}
