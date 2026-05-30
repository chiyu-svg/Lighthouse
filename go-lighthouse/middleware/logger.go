package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录开始时间
		startTime := time.Now()
		// 获取请求方法和路径
		method := c.Request.Method
		path := c.Request.URL.Path

		// 继续处理后续中间件和路由
		c.Next()

		// 请求处理完成后，计算耗时
		costTime := time.Since(startTime)
		statusCode := c.Writer.Status()

		// 输出日志
		log.Printf("[%s] %s %s %d %v",
			startTime.Format("2006-01-02 15:04:05"),
			method,
			path,
			statusCode,
			costTime,
		)

	}
}
