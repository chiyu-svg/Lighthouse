package main

import (
	"context"
	"fmt"
	"go-lighthouse/core"
	"go-lighthouse/db"
	"go-lighthouse/router"
	"go-lighthouse/service"
	"go-lighthouse/websocket"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"
)

func main() {
	fmt.Printf("==============================\n")
	fmt.Printf("Go-Lighthouse 服务启动中...\n")
	fmt.Printf("Go版本: %s\n", runtime.Version())
	fmt.Printf("操作系统: %s\n", runtime.GOOS)
	fmt.Printf("CPU核心数: %d\n", runtime.NumCPU())
	fmt.Printf("========================================\n")

	// 初始化数据库, 并自动迁移表结构
	db.InitDB()
	// 初始化任务队列（8个Worker, 队列容量100）
	core.InitTaskQueue()

	// 初始化WebSocket Hub
	websocket.InitHub()

	// 初始化路由
	r := router.InitRouter()

	// 读取服务端口（支持环境变量覆盖，默认 8098）
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	// 使用 http.Server 支持优雅关闭
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	// 在Goroutine中启动HTTP服务
	go func() {
		log.Printf("[Server] HTTP服务启动，监听端口: %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[Server] HTTP服务启动失败: %v", err)
		}
	}()

	// ========== 启动监控数据定时推送 ==========
	// 每30秒：1) 记录Goroutine快照  2) 推送监控数据到所有WebSocket客户端
	monitorCtx, monitorCancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				// 1. 记录Goroutine快照（用于趋势图）
				service.RecordGoroutineSnapshot()

				// 2. 获取监控数据并推送到WebSocket
				data, err := service.GetMonitorData()
				if err != nil {
					log.Printf("[Monitor] 获取监控数据失败: %v", err)
					continue
				}
				websocket.BroadcastMonitor(&websocket.MonitorMessage{
					Type:           "monitor",
					Timestamp:      time.Now().Format(time.RFC3339),
					GoroutineCount: data.GoroutineCount,
					RunningTasks:   data.RunningTasks,
					TodayTotal:     data.TodayTotal,
					TodaySuccess:   data.TodaySuccess,
					TodayFailed:    data.TodayFailed,
					SuccessRate:    data.SuccessRate,
				})
			case <-monitorCtx.Done():
				log.Println("[Monitor] 监控推送Goroutine已退出")
				return
			}
		}
	}()
	// 启动时立即记录一次快照
	service.RecordGoroutineSnapshot()

	// 等待中断信号（阻塞主Goroutine）
	// 支持 SIGINT (Ctrl+C) 和 SIGTERM (kill命令)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("[Server] 收到信号: %v，开始优雅关闭...", sig)

	//  关闭监控推送
	monitorCancel()

	//  关闭 Http 服务
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[Server] HTTP服务关闭错误: %v", err)
	}
	log.Printf("[Server] HTTP服务已关闭")

	// 关闭任务对列
	core.StopTaskQueue()

	// 关闭WebSocket Hub
	websocket.StopHub()

	log.Printf("[Server] 服务已完全关闭")
}
