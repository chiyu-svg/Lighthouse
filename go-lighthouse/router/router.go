package router

import (
	"go-lighthouse/controller"
	"go-lighthouse/middleware"
	"net/http"

	"github.com/gin-gonic/gin"
)

func InitRouter() *gin.Engine {
	r := gin.New()

	r.Use(middleware.Cors())    // 跨域中间件
	r.Use(middleware.Logger())  // 自定义日志中间件
	r.Use(middleware.Recover()) // 全局恐慌回复，

	// 基础路由
	baseGroup := r.Group("/api/v1/base")
	{
		baseGroup.GET("/health", controller.HealthCheck)
	}

	// Hook 模块路由
	hookGroup := r.Group("/api/v1/hook")
	{
		hookGroup.POST("/create", controller.CreateHook)           // 创建Hook
		hookGroup.GET("/list", controller.ListHook)                // 分页查询Hook 列表
		hookGroup.GET("/detail/:id", controller.GetHookDetail)     // 查询Hook 详情
		hookGroup.POST("/update/:id", controller.UpdateHook)       // 更新Hook
		hookGroup.POST("/delete/:id", controller.DeleteHook)       // 删除Hook
		hookGroup.POST("/toggle/:id", controller.ToggleHookStatus) // 切换启用/禁用
	}

	// Trigger 模块路由
	triggerGroup := r.Group("/api/v1/trigger")
	{
		triggerGroup.POST("/create", controller.CreateTrigger)             // 创建Trigger
		triggerGroup.POST("/update/:id", controller.UpdateTrigger)         // 更新Trigger
		triggerGroup.GET("/detail/:hookId", controller.GetTriggerByHookID) // 根据HookID查询Trigger
	}

	// Monitor 模块路由
	monitorGroup := r.Group("/api/v1/monitor")
	{
		monitorGroup.GET("/data", controller.GetMonitorData)              // 监控概览数据
		monitorGroup.GET("/goroutine", controller.GetGoroutineTrend)      // Goroutine趋势
		monitorGroup.GET("/success-rate", controller.GetSuccessRateTrend) // 成功率趋势
		monitorGroup.GET("/task-cost-top5", controller.GetTaskCostTop5)   // 耗时TOP5
	}

	// Task 模块路由（新增）
	taskGroup := r.Group("/api/v1/task")
	{
		taskGroup.GET("/list", controller.ListTask)                   // 分页查询任务列表
		taskGroup.GET("/detail/:id", controller.GetTaskDetail)        // 查询任务详情
		taskGroup.GET("/action-log/:id", controller.GetTaskActionLog) // 查询Action日志
	}

	// Webhook接收路由（供外部平台调用，路径包含Hook ID）
	// 外部平台POST数据到此地址，系统接收并触发任务
	r.POST("/api/v1/hook/receive/:id", controller.TriggerHook)

	// WebSocket 日志推送路由
	// 前端通过此路由建立WebSocket连接，实时接收任务执行日志
	// 参数：taskId(可选)、hookId(可选)，不传则接收所有日志
	r.GET("/ws/log", controller.WebSocketLog)

	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  "接口不存在",
			"data": nil,
		})
	})

	return r

}
