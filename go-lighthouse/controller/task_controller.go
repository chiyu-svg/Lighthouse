package controller

import (
	"go-lighthouse/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ListTask 分页查询任务列表
// GET /api/v1/task/list
//
// 查询参数：
//   - page: 页码（默认1）
//   - pageSize: 每页条数（默认10）
//   - status: 状态筛选（pending/processing/success/failed）
//   - hook_id: Hook ID 筛选
//   - start_time: 开始时间（格式：2024-01-01）
//   - end_time: 结束时间（格式：2024-12-31）
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/task/list?page=1&pageSize=10&status=success
//	curl http://localhost:8080/api/v1/task/list?hook_id=xxx&start_time=2024-01-01
func ListTask(c *gin.Context) {
	// 1. 解析查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	if page < 1 {
		page = 1
	}

	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	req := service.TaskListReq{
		Page:      page,
		PageSize:  pageSize,
		Status:    c.Query("status"),
		HookID:    c.Query("hook_id"),
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
	}

	// 2. 调用服务层查询
	resp, err := service.GetTaskList(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "查询任务列表失败: " + err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": resp,
	})
}

// GetTaskDetail 查询任务详情（包含 Action 日志和 Webhook 请求）
// GET /api/v1/task/detail/:id
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/task/detail/task-uuid-xxx
func GetTaskDetail(c *gin.Context) {
	taskID := c.Param("id")

	detail, err := service.GetTaskDetail(taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": detail,
	})
}

// GetTaskActionLog 查询任务的 Action 执行日志
// GET /api/v1/task/action-log/:id
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/task/action-log/task-uuid-xxx
func GetTaskActionLog(c *gin.Context) {
	taskID := c.Param("id")
	logs, err := service.GetTaskActionLog(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "查询Action日志失败: " + err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": logs,
	})
}
