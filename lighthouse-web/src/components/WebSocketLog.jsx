import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * WebSocket实时日志组件
 *
 * 功能：
 * - WebSocket连接管理（连接/断开/重连）
 * - 心跳检测（每30秒发送"ping"）
 * - 自动重连（最大3次，间隔5s/10s/15s）
 * - 日志列表展示（终端风格 bg-slate-900）
 * - 自动滚动到最新日志
 * - 支持按HookID客户端过滤
 *
 * Props:
 * - taskId: 订阅特定任务的日志（服务端过滤，空=接收全部）
 * - hookId: 订阅特定Hook的日志（服务端过滤，空=接收全部）
 * - filterHookId: 客户端过滤的HookID（不触发重连，空=不过滤）
 * - maxLogs: 最大日志条数（默认200）
 *
 * 连接地址：
 * - ws://host/ws/log              → 接收所有日志
 * - ws://host/ws/log?taskId=xxx   → 仅接收指定任务的日志
 * - ws://host/ws/log?hookId=xxx   → 仅接收指定Hook的日志
 */
function WebSocketLog({
  taskId = "",
  hookId = "",
  filterHookId = "",
  maxLogs = 200,
}) {
  const [logs, setLogs] = useState([]);
  const [connectStatus, setConnectStatus] = useState("disconnected"); // disconnected / connecting / connected
  const wsRef = useRef(null);
  const logContainerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectCountRef = useRef(0);
  const maxReconnect = 3;
  const reconnectIntervals = [5000, 10000, 15000]; // 重连间隔：5s、10s、15s

  // 构建 WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    let url = `${protocol}//${host}/ws/log`;
    const params = [];
    if (taskId) params.push(`taskId=${taskId}`);
    if (hookId) params.push(`hookId=${hookId}`);
    if (params.length > 0) url += "?" + params.join("&");
    return url;
  }, [taskId, hookId]);

  // 添加日志
  const addLog = useCallback(
    (log) => {
      setLogs((prev) => {
        const newLogs = [...prev, log];
        // 超过最大条数时，保留最新的
        return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
      });
    },
    [maxLogs]
  );

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000); // 每30秒发送心跳
  }, []);

  // 停止心跳
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);
  // 连接 WebSocket
  const connect = useCallback(() => {
    // 清理旧连接
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectStatus("connecting");
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectStatus("connected");
      reconnectCountRef.current = 0; // 连接成功，重置重连计数
      startHeartbeat();
      addLog({
        type: "system",
        timestamp: new Date().toISOString(),
        level: "info",
        content: "WebSocket连接成功",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          addLog(data);
        }
        // 忽略 heartbeat 类型消息
      } catch (e) {
        // 非JSON消息（如服务端回复的 "pong" 文本）
        if (event.data === "pong") {
          // 心跳响应，不做处理
        }
      }
    };

    ws.onclose = () => {
      setConnectStatus("disconnected");
      stopHeartbeat();
      addLog({
        type: "system",
        timestamp: new Date().toISOString(),
        level: "warn",
        content: "WebSocket连接断开",
      });

      // 自动重连
      // eslint-disable-next-line react-hooks/immutability
      tryReconnect();
    };

    ws.onerror = () => {
      // onclose 会在 onerror 之后触发，重连逻辑在 onclose 中处理
    };
  }, [getWsUrl, addLog, startHeartbeat, stopHeartbeat]);

  // 尝试重连（递增间隔：5s → 10s → 15s，最多3次）
  const tryReconnect = useCallback(() => {
    if (reconnectCountRef.current >= maxReconnect) {
      addLog({
        type: "system",
        timestamp: new Date().toISOString(),
        level: "error",
        content: `重连失败，已达最大重试次数(${maxReconnect})，请刷新页面`,
      });
      return;
    }

    const delay = reconnectIntervals[reconnectCountRef.current];
    reconnectCountRef.current++;

    addLog({
      type: "system",
      timestamp: new Date().toISOString(),
      level: "warn",
      content: `${delay / 1000}秒后尝试第${reconnectCountRef.current}次重连...`,
    });

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, addLog]);

  // 自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 组件挂载时连接，卸载时断开
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();
    return () => {
      stopHeartbeat();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 客户端过滤 ==========
  // 根据 filterHookId 过滤显示的日志（不触发重连）
  const displayLogs = filterHookId
    ? logs.filter(
        (log) =>
          log.type === "system" || // 系统消息始终显示
          !log.hook_id || // 无hook_id的日志始终显示
          log.hook_id === filterHookId
      )
    : logs;

  // ========== 样式配置 ==========

  // 日志级别 → 终端文字颜色
  const levelColors = {
    info: "text-green-400",
    success: "text-cyan-400",
    error: "text-red-400",
    warn: "text-yellow-400",
  };

  // 连接状态 → 指示灯颜色和文字
  const statusConfig = {
    connected: {
      color: "bg-green-500",
      text: "已连接",
      textColor: "text-green-500",
    },
    connecting: {
      color: "bg-yellow-500",
      text: "连接中",
      textColor: "text-yellow-500",
    },
    disconnected: {
      color: "bg-red-500",
      text: "已断开",
      textColor: "text-red-500",
    },
  };

  const status = statusConfig[connectStatus];

  return (
    <div className="flex flex-col h-full">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className={`text-sm ${status.textColor}`}>{status.text}</span>
          {taskId && (
            <span className="text-slate-400 text-xs ml-2">
              任务: {taskId.substring(0, 8)}...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs">
            {displayLogs.length} 条日志
          </span>
          <button
            onClick={() => setLogs([])}
            className="text-slate-400 text-xs hover:text-white transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* 日志终端区域 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto bg-slate-900 p-4 font-mono text-sm"
        style={{ minHeight: "300px" }}
      >
        {displayLogs.length === 0 ? (
          <div className="text-slate-500">等待日志...</div>
        ) : (
          displayLogs.map((log, index) => (
            <div key={index} className="flex gap-2 leading-6">
              {/* [时间] */}
              <span className="text-slate-500 shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              {/* [级别] */}
              <span
                className={`shrink-0 w-20 ${
                  levelColors[log.level] || "text-slate-400"
                }`}
              >
                [{(log.level || "").toUpperCase().padEnd(7)}]
              </span>
              {/* 内容（错误日志整体标红） */}
              <span
                className={`break-words min-w-0 ${
                  log.level === "error"
                    ? "text-red-400"
                    : log.type === "system"
                    ? "text-slate-400"
                    : "text-green-400"
                }`}
              >
                {log.content}
                {/* 动作日志额外显示类型和序号 */}
                {log.action_type && (
                  <span className="text-slate-500 ml-1">
                    [{log.action_type}#{log.action_index}]
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WebSocketLog;
