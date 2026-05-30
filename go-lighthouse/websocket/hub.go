package websocket

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	sendBufSize    = 256                 // 客户端发送缓冲区大小
	maxMessageSize = 512                 // 单条消息最大字节数
	pongWait       = 60 * time.Second    // Pong超时时间
	pingPeriod     = (pongWait * 9) / 10 // Ping发送间隔（必须小于pongWait）
)

// upgrader WebSocket升级器
// 将HTTP连接升级为WebSocket连接
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// 允许所有来源（开发环境，生产环境应限制）
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ==================== Hub ====================

// Hub WebSocket连接管理中心
//
// 使用 Channel 实现"单线程事件循环"模式：
//   - clients map 只在 Run() 中被读写（单Goroutine），无需加锁
//   - broadcast/register/unregister 是 Channel，天生并发安全
//   - 外部通过 Channel 向 Hub 发送指令，Hub 在事件循环中串行处理
//
// 这就像一个"邮局"：
//   - register: 有人来办订阅
//   - unregister: 有人来退订
//   - broadcast: 有新报纸要分发给所有订阅者
type Hub struct {
	clients    map[*Client]bool   // 所有已连接的客户端（true = 在线）
	broadcast  chan *broadcastMsg // 广播消息通道
	register   chan *Client       // 注册通道
	unregister chan *Client       // 注销通道
	done       chan struct{}      // 关闭信号通道
}

// broadcastMsg 广播消息（包内私有）
// TaskID/HookID: 用于过滤，空字符串表示不过滤
type broadcastMsg struct {
	TaskID string // 目标任务ID，空=全量广播
	HookID string // 目标HookID，空=全量广播
	Data   []byte // 消息内容（JSON格式）
}

// Client WebSocket客户端连接
//
// 每个Client占2个Goroutine：
//   - readPump: 从连接读取消息（心跳、断开检测）
//   - writePump: 从send通道读取消息并写入连接（日志推送、Ping）
type Client struct {
	hub    *Hub            // 所属Hub
	conn   *websocket.Conn // WebSocket底层连接
	send   chan []byte     // 发送消息缓冲通道（Hub → Client → 浏览器）
	taskID string          // 订阅的任务ID（空=接收所有日志）
	hookID string          // 订阅的HookID（空=接收所有Hook的日志）
}

// ==================== Hub 方法 ====================

// newHub 创建Hub实例
func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *broadcastMsg, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		done:       make(chan struct{}),
	}
}

// Run 启动Hub的事件循环（应在单独的Goroutine中运行）
//
// 事件循环模型（单Goroutine，无需加锁）：
//
//	select 监听四个Channel：
//	1. done     → 收到关闭信号，退出循环
//	2. register → 新客户端连接，加入 clients map
//	3. unregister → 客户端断开，从 clients map 移除，关闭 send channel
//	4. broadcast  → 收到日志消息，按 TaskID/HookID 过滤后分发给匹配的客户端
func (h *Hub) Run() {
	log.Println("[Hub] 事件循环启动")
	for {
		select {
		case <-h.done:
			log.Println("[Hub] 事件循环退出")
			return
		case client := <-h.register:
			// 新客户端注册
			h.clients[client] = true
			log.Printf("[Hub] 客户端注册: taskID=%s, hookID=%s, 在线数=%d",
				client.taskID, client.hookID, len(h.clients))
		case client := <-h.unregister:
			// 客户端注销
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send) // 关闭send通道，通知WritePump退出
				log.Printf("[Hub] 客户端注销: taskID=%s, hookID=%s, 在线数=%d",
					client.taskID, client.hookID, len(h.clients))
			}
		case msg := <-h.broadcast:
			// 广播消息给匹配的客户端
			for client := range h.clients {
				// 过滤逻辑（三重过滤，空值=不过滤）：
				// 1. 客户端taskID为空 或 消息taskID为空 或 两者匹配 → 通过
				// 2. 客户端hookID为空 或 消息hookID为空 或 两者匹配 → 通过
				taskMatch := client.taskID == "" || msg.TaskID == "" || client.taskID == msg.TaskID
				hookMatch := client.hookID == "" || msg.HookID == "" || client.hookID == msg.HookID

				if taskMatch && hookMatch {
					select {
					case client.send <- msg.Data:
						// 消息发送成功
					default:
						// 发送缓冲已满，断开此客户端（防止慢客户端拖垮服务端）
						close(client.send)
						delete(h.clients, client)
						log.Printf("[Hub] 客户端发送缓冲满，强制断开: taskID=%s", client.taskID)
					}
				}
			}
		}
	}
}

// ==================== Client 方法 ====================

// readPump 从WebSocket连接读取消息（处理心跳和断开检测）
//
// 工作流程：
// 1. 设置Pong超时（60秒内必须收到Pong，否则认为连接已断开）
// 2. 循环读取消息
// 3. 收到Pong时重置超时计时器
// 4. 收到文本"ping"时回复"pong"（前端心跳机制）
// 5. 读取失败或连接关闭时，触发注销
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	// 设置读取限制和超时
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	// Pong处理器：收到Pong时重置超时
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			// 连接关闭或读取错误
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[Hub] 读取异常: %v", err)
			}
			break
		}

		// 处理前端发来的文本心跳
		if string(message) == "ping" {
			if err := c.conn.WriteMessage(websocket.TextMessage, []byte("pong")); err != nil {
				break
			}
		}
	}

}

// writePump 从send通道读取消息并写入WebSocket连接
//
// 工作流程：
// 1. 启动定时Ping（每54秒发一次，保持连接活跃）
// 2. 监听send通道，有消息就写入连接
// 3. send通道关闭时（Hub注销了此客户端），发送Close帧并退出
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod) // Ping定时器
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// send通道被关闭（Hub注销了此客户端）
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// 写入消息到WebSocket连接
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			// 定时发送Ping保持连接（浏览器会自动回复Pong）
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ==================== 全局 Hub 实例 ====================

var globalHub *Hub

// InitHub 初始化并启动全局Hub
func InitHub() {
	globalHub = newHub()
	go globalHub.Run()
	log.Println("[Hub] 初始化完成，WebSocket服务已就绪")
}

// GetHub 获取全局Hub实例
func GetHub() *Hub {
	return globalHub
}

// StopHub 停止全局Hub（关闭所有连接）
func StopHub() {
	if globalHub != nil {
		// 1. 关闭事件循环
		close(globalHub.done)
		// 2. 关闭所有客户端的send通道（触发WritePump退出）
		for client := range globalHub.clients {
			close(client.send)
		}
		log.Println("[Hub] 已关闭，所有客户端连接已断开")
	}
}

// ==================== 广播便捷函数 ====================

// broadcastMessage 内部广播函数（包内私有）
// 将LogMessage序列化后发送到Hub的broadcast通道
func broadcastMessage(msg *LogMessage) {
	if globalHub == nil {
		return
	}
	data, err := msg.ToJSON()
	if err != nil {
		log.Printf("[Hub] 日志序列化失败: %v", err)
		return
	}
	// 非阻塞发送（广播通道满时丢弃，不阻塞调用者）
	select {
	case globalHub.broadcast <- &broadcastMsg{TaskID: msg.TaskID, HookID: msg.HookID, Data: data}:
	default:
		log.Printf("[Hub] 广播通道已满，丢弃日志: %s", msg.Content)
	}
}

// BroadcastActionLog 广播Action执行日志（全局便捷函数）
// level: 日志级别
// subType: 子类型（action_start / action_success / action_failed）
// content: 日志内容
// taskID: 任务ID
// hookID: HookID
// actionType: 动作类型（api/email/mysql）
// actionIndex: 动作序号（0-based）
func BroadcastActionLog(level LogLevel, subType, content, taskID, hookID, actionType string, actionIndex int) {
	broadcastMessage(&LogMessage{
		Type:        "log",
		Timestamp:   time.Now().Format(time.RFC3339),
		Level:       level,
		SubType:     subType,
		Content:     content,
		TaskID:      taskID,
		HookID:      hookID,
		ActionType:  actionType,
		ActionIndex: &actionIndex, // 指针：0也能正常序列化，nil时JSON中省略
	})
}

// ServeWS 处理WebSocket连接升级（在Controller中调用）
// w: HTTP响应写入器
// r: HTTP请求
// taskID: 订阅的任务ID（空=接收所有日志）
// hookID: 订阅的HookID（空=接收所有Hook的日志）
func ServeWS(w http.ResponseWriter, r *http.Request, taskID, hookID string) {
	// 1. 将HTTP连接升级为WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Hub] WebSocket升级失败: %v", err)
		return
	}

	// 2. 创建Client
	client := &Client{
		hub:    globalHub,
		conn:   conn,
		send:   make(chan []byte, sendBufSize),
		taskID: taskID,
		hookID: hookID,
	}

	// 3. 注册到Hub（通过Channel，线程安全）
	client.hub.register <- client

	// 4. 启动读写Goroutine
	// 每个Client占2个Goroutine：
	// - readPump: 读浏览器消息 + 检测断开
	// - writePump: 写消息到浏览器 + 发Ping
	go client.readPump()
	go client.writePump()
}
