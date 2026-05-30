package controller

import (
	"go-lighthouse/websocket"

	"github.com/gin-gonic/gin"
)

// WebSocketLog 处理WebSocket日志连接
// GET /ws/log?taskId=xxx&hookId=xxx
//
// 参数：
//   - taskId: 可选，订阅特定任务的日志
//   - hookId: 可选，订阅特定Hook的日志
//   - 都不传：接收所有日志
//
// 使用示例：
//
//	浏览器连接: ws://localhost:8080/ws/log
//	浏览器连接: ws://localhost:8080/ws/log?taskId=uuid-xxx
//	浏览器连接: ws://localhost:8080/ws/log?hookId=uuid-xxx
func WebSocketLog(c *gin.Context) {
	taskID := c.Query("taskId")
	hookID := c.Query("hookId")
	websocket.ServeWS(c.Writer, c.Request, taskID, hookID)
}
