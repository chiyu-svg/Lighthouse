package controller

import (
	"go-lighthouse/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMonitorData 获取监控概览数据
// GET /api/v1/monitor/data
//
// 返回数据：
//
//	{
//	  "goroutine_count": 16,
//	  "running_tasks": 3,
//	  "today_total": 100,
//	  "today_success": 95,
//	  "today_failed": 5,
//	  "success_rate": 95.0
//	}
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/monitor/data
func GetMonitorData(c *gin.Context) {
	data, err := service.GetMonitorData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取监控数据失败：" + err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": data,
	})
}

// GetGoroutineTrend 获取Goroutine趋势数据
// GET /api/v1/monitor/goroutine?trend=today
//
// 参数 trend: today(今日) / yesterday(昨日) / week(近7天)
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/monitor/goroutine?trend=today
//	curl http://localhost:8080/api/v1/monitor/goroutine?trend=week
func GetGoroutineTrend(c *gin.Context) {
	trend := c.DefaultQuery("trend", "today")
	data := service.GetGoroutineTrend(trend)
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": data,
	})
}

// GetSuccessRateTrend 获取成功率趋势数据
// GET /api/v1/monitor/success-rate
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/monitor/success-rate
func GetSuccessRateTrend(c *gin.Context) {
	data := service.GetSuccessRateTrend()
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": data,
	})
}

// GetTaskCostTop5 获取耗时TOP5任务
// GET /api/v1/monitor/task-cost-top5
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/monitor/task-cost-top5
func GetTaskCostTop5(c *gin.Context) {
	data := service.GetTaskCostTop5()
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": data,
	})
}
