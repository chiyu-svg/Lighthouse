package action

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// 创建
type APIAction struct{}

// 执行 API 请求
func (a *APIAction) Execute(ctx context.Context, config map[string]interface{}) error {
	// ======= 1. 读取配置
	url := getConfigString(config, "url", "")
	if url == "" {
		return fmt.Errorf("APIAction: 缺少必填配置 url")
	}

	// method 可选，默认GET
	method := getConfigString(config, "method", "GET")
	method = strings.ToUpper(method)

	// timeout 可选，默认5000 毫秒
	timeoutMs := getConfigInt(config, "timeout", 5000)

	// header 可选，自定义请求头
	headers := getConfigStringMap(config, "headers")

	// body 可选, 请求体
	body := getConfigString(config, "body", "")

	// ======== 2. 创建HTTP 请求

	// 创建请求体Reader
	var bodyReader io.Reader
	if body != "" {
		bodyReader = bytes.NewBufferString(body)
	}

	// 创建HTTP Request，携带Context用于超时控制
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("APIAction: 创建请求失败: %w", err)
	}

	// 设置自定义 Headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// 如果有body 但没设置Content-Type, 默认设为application/json
	if body != "" && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	// ======= 3.发送请求
	// 创建HTTP Client，设置超时

	client := &http.Client{
		Timeout: time.Duration(timeoutMs) * time.Millisecond,
	}

	log.Printf("[APIAction] 发送请求: %s %s, timeout=%dms", method, url, timeoutMs)

	resp, err := client.Do(req)

	if err != nil {
		return fmt.Errorf("APIAction: 请求失败: %w", err)
	}

	defer resp.Body.Close()

	// ===== 4.检查状态码
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// 读取响应体用于错误信息
		respBody := ""
		if bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024)); err == nil {
			respBody = string(bodyBytes)
		}
		return fmt.Errorf("APIAction: 请求返回非2xx状态码: %d, body: %s", resp.StatusCode, respBody)
	}
	log.Printf("[APIAction] 请求成功: %s %s, status=%d", method, url, resp.StatusCode)
	return nil
}
