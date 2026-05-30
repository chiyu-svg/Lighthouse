package core

import (
	"context"
	"fmt"
	"go-lighthouse/core/action"
	"go-lighthouse/db"
	"go-lighthouse/model"
	"go-lighthouse/websocket"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// 定义常量，现在也不知道是做什么用
const (
	DefaultWorkerNum = 8   // 默认Worker Goroutine数量
	DefaultQueueSize = 100 // 默认任务队列缓冲大小
	DefaultTimeout   = 30  // 默认任务超时时间（秒）
)

// Task 结构体
type Task struct {
	ID        string               // 任务唯一ID（UUID）
	HookID    string               // 关联的HookID
	TriggerID string               // 关联的TriggerID
	Actions   []model.ActionConfig // 需要执行的动作列表
	Status    string               // 任务状态: pending / processing / success / failed
	Ctx       context.Context      // 单个任务的Context（支持超时取消）
	Cancel    context.CancelFunc   // 取消函数
}

// ==================== TaskQueue 结构体 ====================

// TaskQueue 任务队列
// 核心并发引擎，使用 Goroutine Pool + Channel 模式
//
// 并发安全说明：
//   - queue: 有缓冲Channel，自带并发安全
//   - wg: WaitGroup，用于等待所有Worker退出
//   - ctx/cancel: 只在Start和Stop时操作，无需额外锁
//   - workerNum: 创建后不变，无需锁
type TaskQueue struct {
	queue     chan *Task
	wg        sync.WaitGroup
	ctx       context.Context
	cancel    context.CancelFunc
	workerNum int
}

// 全局 TaskQueue 实例
var globalTaskQueue *TaskQueue

// ============== NewTaskQueue =============
// NewTaskQueue 创建任务队列
// workerNum: Worker Goroutine数量
// queueSize: 任务队列缓冲大小
func NewTaskQueue(workerNum, queueSize int) *TaskQueue {
	ctx, cancel := context.WithCancel(context.Background())
	return &TaskQueue{
		queue:     make(chan *Task, queueSize),
		ctx:       ctx,
		cancel:    cancel,
		workerNum: workerNum,
	}
}

// ============== start ==========
// Start 启动任务队列
func (tq *TaskQueue) Start() {
	for i := 0; i < tq.workerNum; i++ {
		tq.wg.Add(1)
		go tq.worker(i)
	}
	log.Printf("[TaskQueue] 启动完成, Worker数量: %d, 队列容量: %d", tq.workerNum, cap(tq.queue))
}

// ==================== worker ====================
// worker 工作Goroutine
// 循环从Channel获取任务并执行
//
// 退出条件（三选一）：
//  1. Channel被关闭且为空（ok=false） → 正常退出
//  2. 全局Context被取消（优雅关闭）    → 强制退出
//
// 注意：
//   - defer recover() 捕获panic，防止单个任务崩溃导致Worker退出
//   - defer wg.Done() 确保退出时通知WaitGroup
func (tq *TaskQueue) worker(id int) {
	defer tq.wg.Done()

	// 捕获Goroutine内的panic，防止整个程序崩溃
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Worker-%d] 捕获恐慌: %v", id, r)
		}
	}()

	log.Printf("[Worker-%d] 启动，等待任务...", id)
	for {
		select {
		case task, ok := <-tq.queue:
			if !ok {
				log.Printf("[Worker-%d] 队列已关闭，退出", id)
				return
			}
			tq.executeTask(task)
		case <-tq.ctx.Done():
			log.Printf("[Worker-%d] 收到关闭信号，退出", id)
			return
		}
	}
}

// executeTask 执行单个任务
// 使用WaitGroup并发执行任务中的所有Action
func (tq *TaskQueue) executeTask(task *Task) {
	//1. 设置任务状态为执行中
	task.Status = "processing"
	log.Printf("[Task] 开始执行: id=%s, hookID=%s, actionCount=%d",
		task.ID, task.HookID, len(task.Actions))

	database := db.GetDB()
	taskRecord := model.Task{
		ID:        task.ID,
		HookID:    task.HookID,
		TriggerID: task.TriggerID,
		Status:    "processing",
		CostTime:  0,
	}
	if err := database.Create(&taskRecord).Error; err != nil {
		log.Printf("[Task] 写入task记录失败: %v", err)
		// 写入失败不影响任务执行，继续
	}
	// 推送日志：任务开始
	websocket.BroadcastLog(
		websocket.LogLevelInfo,
		"task_start",
		fmt.Sprintf("任务开始执行: hookID=%s, 动作数=%d", task.HookID, len(task.Actions)),
		task.ID,
		task.HookID,
	)

	//2. 创建带超时的任务Context（默认10秒）
	// 使用全局Context作为父Context，这样Stop时也能取消正在执行的任务
	taskCtx, taskCancel := context.WithTimeout(tq.ctx, DefaultTimeout*time.Second)
	defer taskCancel()

	// 记录开始时间
	startTime := time.Now()

	// 3. 如果没有Action，直接标记成功
	if len(task.Actions) == 0 {
		task.Status = "success"
		log.Printf("[Task] 无动作配置，直接完成: id=%s", task.ID)

		// 更新 task 记录为成功
		now := time.Now()
		costMs := int(time.Since(startTime).Milliseconds())
		database.Model(&model.Task{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
			"status":    "success",
			"cost_time": costMs,
			"end_at":    &now,
		})

		// 推送日志：任务完成（无动作）
		websocket.BroadcastLog(
			websocket.LogLevelSuccess,
			"task_success",
			"任务执行成功（无动作配置）",
			task.ID,
			task.HookID,
		)
		return
	}

	// 4. 并发执行所有 Action
	var actionWg sync.WaitGroup
	var hasError bool
	var errorMu sync.Mutex

	for i, actConfig := range task.Actions {
		actionWg.Add(1)
		// 为每个 Action 启动一个 Goroutine 并发执行
		go func(index int, cfg model.ActionConfig) {
			defer actionWg.Done()
			actionStartTime := time.Now()
			// 捕获 Action 内的 panic
			defer func() {
				if r := recover(); r != nil {
					errorMu.Lock()
					hasError = true
					errorMu.Unlock()
					log.Printf("[Task] Action恐慌: taskID=%s, actionIndex=%d, error=%v",
						task.ID, index, r)
					// 推送日志：动作恐慌
					websocket.BroadcastActionLog(
						websocket.LogLevelError,
						"action_failed",
						fmt.Sprintf("动作执行恐慌: %v", r),
						task.ID,
						task.HookID,
						cfg.Type,
						index,
					)
				}
			}()
			// 推送日志：动作开始
			websocket.BroadcastActionLog(
				websocket.LogLevelInfo,
				"action_start",
				fmt.Sprintf("开始执行动作: type=%s", cfg.Type),
				task.ID,
				task.HookID,
				cfg.Type,
				index,
			)

			// 执行 Action
			if err := action.ExecuteAction(taskCtx, cfg); err != nil {
				errorMu.Lock()
				hasError = true
				errorMu.Unlock()
				log.Printf("[Task] Action执行失败: taskID=%s, actionIndex=%d, type=%s, error=%v",
					task.ID, index, cfg.Type, err)
				// 推送日志：动作失败
				websocket.BroadcastActionLog(
					websocket.LogLevelError,
					"action_failed",
					fmt.Sprintf("动作执行失败[type=%s]: %v", cfg.Type, err),
					task.ID,
					task.HookID,
					cfg.Type,
					index,
				)
				// 写入 Action 执行日志
				saveActionLog(task.ID, cfg, "failed", err.Error(), actionStartTime)
			} else {
				// 推送日志：动作成功
				websocket.BroadcastActionLog(
					websocket.LogLevelSuccess,
					"action_success",
					fmt.Sprintf("动作执行成功[type=%s]", cfg.Type),
					task.ID,
					task.HookID,
					cfg.Type,
					index,
				)
				// 写入 Action 执行日志
				saveActionLog(task.ID, cfg, "success", "", actionStartTime)
			}
		}(i, actConfig)
	}

	// 5 等待所有 Action 完成
	actionWg.Wait()
	// 6 判断任务最终状态
	costTime := time.Since(startTime).Microseconds()
	now := time.Now()

	if hasError {
		task.Status = "failed"
		log.Printf("[Task] 执行失败: id=%s, 耗时=%dms", task.ID, costTime)

		database.Model(&model.Task{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
			"status":    "failed",
			"cost_time": costTime,
			"end_at":    &now,
		})
		// 推送日志：任务失败
		websocket.BroadcastLog(
			websocket.LogLevelError,
			"task_failed",
			fmt.Sprintf("任务执行失败: 耗时=%dms", costTime),
			task.ID,
			task.HookID,
		)
	} else {
		task.Status = "success"
		log.Printf("[Task] 执行成功: id=%s, 耗时=%dms", task.ID, costTime)

		database.Model(&model.Task{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
			"status":    "success",
			"cost_time": costTime,
			"end_at":    &now,
		})

		// 推送日志：任务成功
		websocket.BroadcastLog(
			websocket.LogLevelSuccess,
			"task_success",
			fmt.Sprintf("任务执行成功: 耗时=%dms", costTime),
			task.ID,
			task.HookID,
		)
	}
}

// saveActionLog 保存 Action 执行日志到数据库
// 将 Action 的执行结果持久化到 task_action_log 表，供前端查询任务详情时展示
func saveActionLog(taskID string, cfg model.ActionConfig, status string, errMsg string, startTime time.Time) {
	costMs := int(time.Since(startTime).Microseconds())
	actionLog := model.TaskActionLog{
		ID:           uuid.New().String(),
		TaskID:       taskID,
		ActionType:   cfg.Type,
		ActionConfig: cfg.Config,
		Status:       status,
		ErrorMsg:     errMsg,
		CostTime:     costMs,
	}
	if err := db.GetDB().Create(&actionLog).Error; err != nil {
		log.Printf("[Task] 写入ActionLog失败: taskID=%s, actionType=%s, error=%v", taskID, cfg.Type, err)
	}
}

// SubmitTask 提交任务到队列（非阻塞）
func (tq *TaskQueue) SubmitTask(task *Task) error {
	select {
	case tq.queue <- task:
		log.Printf("[TaskQueue] 任务已提交: id=%s, hookID=%s", task.ID, task.HookID)
		return nil
	default:
		return fmt.Errorf("任务队列已满(容量=%d)，无法提交任务: id=%s", cap(tq.queue), task.ID)
	}
}

// Stop 优雅关闭任务会裂
func (tq *TaskQueue) Stop() {
	log.Println("[TaskQueue] 开始优雅关闭...")
	close(tq.queue)
	tq.wg.Wait()
	tq.cancel()
	log.Println("[TaskQueue] 已优雅关闭，所有Worker已退出")
}

// =============== 全局便携函数 ==================
func NewTask(hookID string, triggerID string, actions []model.ActionConfig) *Task {
	return &Task{
		ID:        uuid.New().String(),
		HookID:    hookID,
		TriggerID: triggerID,
		Actions:   actions,
		Status:    "pending",
	}
}

// InitTaskQueue 初始化并启动全局任务队列
func InitTaskQueue() {
	globalTaskQueue = NewTaskQueue(DefaultWorkerNum, DefaultQueueSize)
	globalTaskQueue.Start()
}

// GetTaskQueue 获取全局任务队列实例
func GetTaskQueue() *TaskQueue {
	return globalTaskQueue
}

// StopTaskQueue 关闭全局任务队列
// 在main.go的优雅关闭流程中调用
func StopTaskQueue() {
	if globalTaskQueue != nil {
		globalTaskQueue.Stop()
	}
}
