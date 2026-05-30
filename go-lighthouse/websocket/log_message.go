package websocket

import (
	"encoding/json"
	"time"
)

// LogLevel 日志级别
type LogLevel string

const (
	LogLevelInfo    LogLevel = "info"    // 信息日志（任务开始，动作开始）
	LogLevelSuccess LogLevel = "success" // 成功日志（任务完成、动作成功）
	LogLevelError   LogLevel = "error"   // 错误日志（任务失败、动作失败）
	LogLevelWarn    LogLevel = "warn"    // 警告日志
)

// LogMessage WebSocket推送的日志消息结构
//
// 消息类型（type）:
//   - "log": 任务执行日志
//   - "heartbeat": 心跳响应
//
// 子类型（sub_type）:
//   - "task_start":      任务开始执行
//   - "task_success":    任务执行成功
//   - "task_failed":     任务执行失败
//   - "action_start":    动作开始执行
//   - "action_success":  动作执行成功
//   - "action_failed":   动作执行失败
//
// 日志格式示例:
//
//	{"type":"log","timestamp":"2024-...","level":"info","sub_type":"task_start","content":"任务开始执行","task_id":"uuid","hook_id":"uuid"}
//	{"type":"log","timestamp":"2024-...","level":"success","sub_type":"action_success","content":"动作执行成功","task_id":"uuid","hook_id":"uuid","action_type":"api","action_index":0}
type LogMessage struct {
	Type        string   `json:"type"`                   // 消息类型: log / heartbeat
	Timestamp   string   `json:"timestamp"`              // 时间戳 (RFC3339格式)
	Level       LogLevel `json:"level"`                  // 日志级别: info / success / error / warn
	SubType     string   `json:"sub_type,omitempty"`     // 子类型: task_start / task_success / task_failed / action_start / action_success / action_failed
	Content     string   `json:"content"`                // 日志内容
	TaskID      string   `json:"task_id,omitempty"`      // 关联的任务ID
	HookID      string   `json:"hook_id,omitempty"`      // 关联的HookID
	ActionType  string   `json:"action_type,omitempty"`  // 动作类型(api/email/mysql)
	ActionIndex *int     `json:"action_index,omitempty"` // 动作序号(0-based)，指针类型：nil时JSON中省略，0时正常输出
}

// ToJSON 将LogMessage编码为JSON字节数组
func (m *LogMessage) ToJSON() ([]byte, error) {
	return json.Marshal(m)
}

// BroadcastLog 广播任务级日志（全局便捷函数）
// level: 日志级别
// subType: 子类型（task_start / task_success / task_failed）
// content: 日志内容
// taskID: 任务ID
// hookID: HookID
func BroadcastLog(level LogLevel, subType, content, taskID, hookID string) {
	broadcastMessage(&LogMessage{
		Type:      "log",
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level,
		SubType:   subType,
		Content:   content,
		TaskID:    taskID,
		HookID:    hookID,
	})
}

// ==================== 监控数据推送（新增） ====================

// MonitorMessage WebSocket推送的监控数据消息结构
//
// 消息类型：type = "monitor"
// 每30秒由后台Goroutine推送一次，前端Dashboard监听此消息实时更新指标
//
// 格式示例：
//
//	{
//	  "type": "monitor",
//	  "timestamp": "2024-...",
//	  "goroutine_count": 16,
//	  "running_tasks": 3,
//	  "today_total": 100,
//	  "today_success": 95,
//	  "today_failed": 5,
//	  "success_rate": 95.0
//	}
type MonitorMessage struct {
	Type           string  `json:"type"`            // 消息类型: monitor
	Timestamp      string  `json:"timestamp"`       // 时间戳
	GoroutineCount int     `json:"goroutine_count"` // 当前Goroutine数量
	RunningTasks   int64   `json:"running_tasks"`   // 正在执行的任务数
	TodayTotal     int64   `json:"today_total"`     // 今日任务总数
	TodaySuccess   int64   `json:"today_success"`   // 今日成功数
	TodayFailed    int64   `json:"today_failed"`    // 今日失败数
	SuccessRate    float64 `json:"success_rate"`    // 今日成功率(%)
}

// BroadcastMonitor 广播监控数据（全局便捷函数）
// 由 main.go 中的后台Goroutine每30秒调用一次
func BroadcastMonitor(data *MonitorMessage) {
	if globalHub == nil {
		return
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return
	}
	// 非阻塞发送到广播通道
	select {
	case globalHub.broadcast <- &broadcastMsg{TaskID: "", HookID: "", Data: jsonData}:
	default:
		// 通道满时丢弃
	}
}
