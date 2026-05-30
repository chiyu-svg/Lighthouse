package middleware

import "github.com/gin-gonic/gin"

// Cors 跨域中间件
// 允许所有来源访问，处理 OPTIONS 预检请求
//
// 使用示例：
//
//	r := gin.New()
//	r.Use(middleware.Cors())
func Cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 允许所有来源访问
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		// 允许的请求方法
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
		// 允许的请求头
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Signature, X-Timestamp")
		// 允许携带凭证
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		// 预检请求缓存时间（秒）
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// 处理 OPTIONS 预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		// 继续处理请求
		c.Next()
	}
}
