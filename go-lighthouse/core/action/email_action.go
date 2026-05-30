package action

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strconv"
	"strings"
)

type EmailAction struct{}

func (a *EmailAction) Execute(ctx context.Context, config map[string]interface{}) error {
	// ==================== 1. 读取配置 ====================
	smtpServer := getConfigString(config, "smtp_server", "")
	if smtpServer == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 smtp_server")
	}

	smtpPort := getConfigInt(config, "smtp_port", 25)
	username := getConfigString(config, "username", "")
	if username == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 username")
	}

	password := getConfigString(config, "password", "")
	if password == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 password")
	}

	recipient := getConfigString(config, "recipient", "")
	if recipient == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 recipient")
	}

	subject := getConfigString(config, "subject", "")
	if subject == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 subject")
	}

	content := getConfigString(config, "content", "")
	if content == "" {
		return fmt.Errorf("EmailAction: 缺少必填配置 content")
	}

	// ==================== 2. 构建邮件内容 ====================
	// RFC 2822 格式的邮件内容

	from := username
	to := recipient

	// 构建邮件头部 + 正文
	msg := strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"", // 头部与正文之间的空行
		content,
	}, "\r\n")

	// ==================== 3. 使用Goroutine + select发送邮件 ====================
	addr := smtpServer + ":" + strconv.Itoa(smtpPort)
	auth := smtp.PlainAuth("", username, password, smtpServer)

	// 使用带缓冲的channel, 防止Goroutine泄漏
	done := make(chan error, 1)

	go func() {
		err := smtp.SendMail(addr, auth, from, []string{to}, []byte(msg))
		done <- err
	}()

	// 等待发送的完成或Context超时
	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("EmailAction: 邮件发送失败: %w", err)
		}
		log.Printf("[EmailAction] 邮件发送成功: to=%s, subject=%s", to, subject)
		return nil
	case <-ctx.Done():
		return fmt.Errorf("EmailAction: 邮件发送超时或被取消: %w", ctx.Err())
	}
}
