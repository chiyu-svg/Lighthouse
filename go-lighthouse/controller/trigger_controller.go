package controller

import (
	"go-lighthouse/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CreateTrigger 创建 Trigger 接口
// POST /api/v1/trigger/create
//
// 请求体：
//
//	{
//	  "hook_id": "uuid-xxx",
//	  "expression": "req.Body.status == \"success\"",
//	  "action_configs": [
//	    {"type": "api", "config": {"url": "http://example.com", "method": "POST"}},
//	    {"type": "email", "config": {"smtp_server": "smtp.example.com", "recipient": "a@b.com"}}
//	  ]
//	}
//
// 使用示例：
//
//	curl -X POST http://localhost:8080/api/v1/trigger/create \
//	  -H "Content-Type: application/json" \
//	  -d '{"hook_id":"uuid-xxx","expression":"true","action_configs":[{"type":"api","config":{"url":"http://example.com"}}]}'
func CreateTrigger(c *gin.Context) {
	//1. 参数绑定与校验
	var req service.CreateTriggerReq
	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数校验失败: " + err.Error(),
			"data": nil,
		})
		return
	}

	//2. 调用服务层创建 Trigger
	trigger, err := service.CreateTrigger(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建Trigger失败：" + err.Error(),
			"data": nil,
		})
		return
	}

	// 3. 返回创建结果
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": trigger,
	})

}

// UpdateTrigger 更新 Trigger 接口
// POST /api/v1/trigger/update/:id
//
// 请求体：
//
//	{
//	  "expression": "req.Body.amount > 100",
//	  "action_configs": [...]
//	}
//
// 使用示例：
//
//	curl -X POST http://localhost:8080/api/v1/trigger/update/trigger-uuid \
//	  -H "Content-Type: application/json" \
//	  -d '{"expression":"true","action_configs":[{"type":"api","config":{"url":"http://example.com"}}]}'
func UpdateTrigger(c *gin.Context) {
	id := c.Param("id")

	//1. 参数绑定
	var req service.UpdateTriggerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数校验失败：" + err.Error(),
			"data": nil,
		})
		return
	}

	// 2. 调用服务层更新
	if err := service.UpdateTrigger(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
			"data": nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "更新成功",
		"data": nil,
	})

}

// GetTriggerByHookID 根据 HookID 查询 Trigger 详情
// GET /api/v1/trigger/detail/:hookId
//
// 使用示例：
//
//	curl http://localhost:8080/api/v1/trigger/detail/hook-uuid-xxx
func GetTriggerByHookID(c *gin.Context) {
	hookID := c.Param("hookId")

	// 调用服务层查询
	trigger, err := service.GetTriggerByHookID(hookID)
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
		"data": trigger,
	})
}
