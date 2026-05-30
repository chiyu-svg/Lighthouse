import React, { useState, useEffect, useRef } from 'react'
import { listHook } from '../../api/request'

/**
 * 实时统计组件
 *
 * 数据来源：
 * - 活跃Hook数：来自API（/api/v1/hook/list）
 * - 每秒请求数(QPS)：从WebSocket日志中的task_start事件计算（最近60秒平均值）
 * - 正在执行的任务数：从WebSocket日志中的task_start/task_success/task_failed事件追踪
 * - 成功率：从WebSocket日志中的task_success/task_failed事件计算
 *
 * 注意：组件独立连接WebSocket，不与LogStream页面共享连接
 */
function RealtimeStats() {
  const [stats, setStats] = useState({
    activeHooks: 0, // 活跃Hook数
    qps: '0.00', // 每秒请求数
    runningTasks: 0, // 正在执行的任务数
    successRate: 0, // 成功率(%)
    successTasks: 0, // 成功任务数
    failedTasks: 0, // 失败任务数
  })

  const wsRef = useRef(null)
  const heartbeatRef = useRef(null)
  const taskStartTimesRef = useRef([]) // 任务启动时间戳（用于计算QPS）
  const runningTaskIdsRef = useRef(new Set()) // 正在执行的任务ID集合

  // ========== 获取活跃Hook数 ==========
  useEffect(() => {
    listHook(1, 100)
      .then((res) => {
        const hooks = res.data?.data?.list || []
        // status === 1 表示启用
        const activeCount = hooks.filter((h) => h.status === 1).length
        setStats((prev) => ({ ...prev, activeHooks: activeCount }))
      })
      .catch(() => {})
  }, [])

  // ========== 连接WebSocket追踪实时任务 ==========
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/log`)
    wsRef.current = ws

    ws.onopen = () => {
      // 启动心跳
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'log') return

        const taskId = data.task_id
        if (!taskId) return

        setStats((prev) => {
          const running = new Set(runningTaskIdsRef.current)

          // 任务开始 → 加入运行集合 + 记录时间戳
          if (data.sub_type === 'task_start') {
            running.add(taskId)
            runningTaskIdsRef.current = running
            taskStartTimesRef.current.push(Date.now())
            return { ...prev, runningTasks: running.size }
          }

          // 任务成功
          if (data.sub_type === 'task_success') {
            running.delete(taskId)
            runningTaskIdsRef.current = running
            const successCount = prev.successTasks + 1
            const finished = successCount + prev.failedTasks
            return {
              ...prev,
              runningTasks: running.size,
              successTasks: successCount,
              successRate:
                finished > 0
                  ? Math.round((successCount / finished) * 100)
                  : 0,
            }
          }

          // 任务失败
          if (data.sub_type === 'task_failed') {
            running.delete(taskId)
            runningTaskIdsRef.current = running
            const failCount = prev.failedTasks + 1
            const finished = prev.successTasks + failCount
            return {
              ...prev,
              runningTasks: running.size,
              failedTasks: failCount,
              successRate:
                finished > 0
                  ? Math.round((prev.successTasks / finished) * 100)
                  : 0,
            }
          }

          return prev
        })
      } catch (e) {
        // 忽略非JSON消息
      }
    }

    ws.onclose = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (ws.readyState === WebSocket.OPEN) ws.close()
    }
  }, [])

  // ========== 每秒计算QPS（最近60秒内的平均每秒任务数） ==========
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      // 过滤掉60秒前的时间戳
      taskStartTimesRef.current = taskStartTimesRef.current.filter(
        (t) => t > oneMinuteAgo
      )
      // QPS = 最近60秒的任务数 / 60
      const qps = (taskStartTimesRef.current.length / 60).toFixed(2)
      setStats((prev) => ({ ...prev, qps }))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 活跃Hook数 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-slate-500 text-sm">活跃Hook数</p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">
          {stats.activeHooks}
        </p>
      </div>

      {/* 每秒请求数 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-slate-500 text-sm">每秒请求数</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.qps}</p>
      </div>

      {/* 正在执行 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-slate-500 text-sm">正在执行</p>
        <p className="text-2xl font-bold text-green-600 mt-1">
          {stats.runningTasks}
        </p>
      </div>

      {/* 成功率 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-slate-500 text-sm">成功率</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold text-indigo-600">
            {stats.successRate}%
          </p>
          <span className="text-sm text-slate-400">
            {stats.successTasks}/{stats.successTasks + stats.failedTasks}
          </span>
        </div>
      </div>
    </div>
  )
}

export default RealtimeStats
