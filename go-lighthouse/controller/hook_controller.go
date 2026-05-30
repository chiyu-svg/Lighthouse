package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"go-lighthouse/core"
	"go-lighthouse/db"
	"go-lighthouse/model"
	"go-lighthouse/service"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateHook 创建Hook 接口
//
//	curl -X POST http://localhost:8080/api/v1/hook/create \
//		  -H "Content-Type: application/json" \
//		  -d '{"name":"支付回调","trigger_type":"api"}'
func CreateHook(c *gin.Context) {
	// 1. 参数绑定与校验
	var req service.CreateHookReq
	if err := c.ShouldBindBodyWithJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数校验失败: " + err.Error(),
			"data": nil,
		})
		return
	}

	// 2. 调用服务层创建Hook
	hook, receiveURL, err := service.CreateHook(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建Hook失败：" + err.Error(),
			"data": nil,
		})
		return
	}

	// 3. 返回结果
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": gin.H{
			"hook":        hook,
			"receive_url": receiveURL,
		},
	})
}

// 分页查询 Hook 列表
// curl http://localhost:8080/api/v1/hook/list?page=1&pageSize=10
func ListHook(c *gin.Context) {
	// 1. 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	if page < 1 {
		page = 1
	}

	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 2. 调用服务层查询
	resp, err := service.ListHook(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "查询Hook列表失败: " + err.Error(),
			"data": nil,
		})
		return
	}

	// 3. 为每个Hook 补充接收地址
	type HookWithURL struct {
		model.Hook
		ReceiveURL string `json:"receive_url"`
	}

	var listWithURL []HookWithURL
	for _, h := range resp.List {
		listWithURL = append(listWithURL, HookWithURL{
			Hook:       h,
			ReceiveURL: fmt.Sprintf("/api/v1/hook/receive/%s", h.ID),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "查询成功",
		"data": gin.H{
			"list":  listWithURL,
			"total": resp.Total,
		},
	})

}

// 查询Hook详情
// curl http://localhost:8080/api/v1/hook/detail/uuid-xxx
func GetHookDetail(c *gin.Context) {
	id := c.Param("id")
	hook, err := service.GetHookDetail(id)
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
		"data": hook,
	})
}

// UpdateHook 更新Hook信息
// POST /api/v1/hook/update/:id
// 使用示例：
//
//	curl -X POST http://localhost:8080/api/v1/hook/update/uuid-xxx \
//	  -H "Content-Type: application/json" \
//	  -d '{"name":"新名称"}'
func UpdateHook(c *gin.Context) {
	id := c.Param("id")
	var req service.UpdateHookReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "参数校验失败：" + err.Error(),
			"data": nil,
		})
		return
	}

	if err := service.UpdateHook(id, req); err != nil {
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

// DeleteHook 删除Hook
// POST /api/v1/hook/delete/:id
//
//	curl -X POST http://localhost:8080/api/v1/hook/delete/uuid-xxx
func DeleteHook(c *gin.Context) {
	id := c.Param("id")

	if err := service.DeleteHook(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
		"data": nil,
	})

}

// ToggleHookStatus 切换Hook启用/禁用状态
// POST /api/v1/hook/toggle/:id
//
//	curl -X POST http://localhost:8080/api/v1/hook/toggle/uuid-xxx
func ToggleHookStatus(c *gin.Context) {
	id := c.Param("id")
	if err := service.ToggleHookStatus(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  err.Error(),
			"data": nil,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "状态切换成功",
		"data": nil,
	})
}

// TriggerHook 接收Webhook请求（核心接口）
// POST /api/v1/hook/receive/:id
// 外部平台将Webhook数据POST到此地址，系统接收并处理

// 处理流程：
// 1. 从路径参数获取Hook ID
// 2. 验证Hook存在且已启用
// 3. 可选验证签名（请求头X-Signature + X-Timestamp，使用HMAC-SHA256）
// 4. 记录请求日志到webhook_log表
// 5. 立即返回响应（不阻塞等待任务执行）
// 6. 后续阶段：将任务提交到任务队列
//
// 使用示例：
//
//	curl -X POST http://localhost:8080/api/v1/hook/receive/uuid-xxx \
//	  -H "Content-Type: application/json" \
//	  -H "X-Signature: hmac-sha256-signature" \
//	  -H "X-Timestamp: 1710000000" \
//	  -d '{"event":"payment.success","amount":100}'
func TriggerHook(c *gin.Context) {
	id := c.Param("id")
	//1. 查询Hook是否存在
	hook, err := service.GetHookDetail(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  "Hook不存在",
			"data": nil,
		})
		return
	}

	// 2. 验证Hook 是否启用
	if hook.Status != 1 {
		c.JSON(http.StatusForbidden, gin.H{
			"code": 403,
			"msg":  "Hook已禁用，无法接收请求",
			"data": nil,
		})
		return
	}

	// 3. 读取请求体
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "读取请求体失败",
			"data": nil,
		})
		return
	}
	requestBody := string(bodyBytes)
	// 4.可选: 验证签名(仅在Hook 配置了 trigger_config 中的 sercret 验证)
	signature := c.GetHeader("X-Signature")
	if hook.TriggerConfig != nil && *hook.TriggerConfig != "" {
		// 从trigger_config中解析secret
		// trigger_config格式：{"secret":"xxx"}
		// 如果配置了secret，则必须验证签名
		timestamp := c.GetHeader("X-Timestamp")
		secret := parseSecretFromConfig(*hook.TriggerConfig)
		if !verifySignature(secret, requestBody, timestamp, signature) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code": 401,
				"msg":  "签名验证失败",
				"data": nil,
			})
			return
		}
	}
	// 5. 记录请求日志到 webhook_log 表
	webhookLog := model.WebhookLog{
		ID:          uuid.New().String(),
		HookID:      id,
		RequestBody: requestBody,
		Signature:   signature,
	}
	db.GetDB().Create(&webhookLog)

	// 5.5
	trigger, triggerErr := service.GetTriggerByHookID(id)
	if triggerErr != nil {
		log.Printf("[TriggerHook] Hook %s 未配置Trigger: %v", id, triggerErr)
	} else {
		task := core.NewTask(id, trigger.ID, trigger.ActionConfigs)
		if submitErr := core.GetTaskQueue().SubmitTask(task); submitErr != nil {
			log.Printf("[TriggerHook] 提交任务失败: %v", submitErr)
		}
	}

	// 6 立即返回响应
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "请求已接收",
		"data": gin.H{
			"hook_id": id,
			"log_id":  webhookLog.ID,
		},
	})

}

// verifySignature 验证HMAC-SHA256签名
// secretKey：签名密钥
// body：请求体内容
// timestamp：请求时间戳
// signature：请求头中的签名
//
// 签名算法：HMAC-SHA256(secretKey, timestamp + body)
// 生成方式：将timestamp和body拼接后，使用secretKey进行HMAC-SHA256签名
func verifySignature(secretKey, body, timestamp, signature string) bool {
	if secretKey == "" || signature == "" {
		return false
	}
	// 拼接待签名字符串：timestamp + body
	message := timestamp + body

	// 使用HMAC-SHA256生成签名
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(message))
	expectedSig := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSig))
}

// parseSecretFromConfig 从 trigger_config JSON 中解析 secret 字段
// trigger_config 格式：{"secret":"xxx"}
// 如果解析失败或 secret 为空，返回空字符串
func parseSecretFromConfig(triggerConfig string) string {
	var cfg struct {
		Secret string `json:"secret"`
	}
	if err := json.Unmarshal([]byte(triggerConfig), &cfg); err != nil {
		log.Printf("[Hook] 解析trigger_config失败: %v", err)
		return ""
	}
	return cfg.Secret
}
