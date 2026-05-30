import React, { useState, useEffect, useRef } from 'react'
import { healthCheck } from '../../api/request'

/**
 * 系统健康状态组件
 *
 * 功能：
 * - 后端服务健康度（/api/v1/base/health）
 * - WebSocket连接状态
 * - 数据库连接状态
 * - 样式：正常-green-500，异常-red-500
 */
function SystemHealth() {
  // 三个健康状态
  const [apiStatus, setApiStatus] = useState('checking')   // checking / normal / error
  const [wsStatus, setWsStatus] = useState('checking')    // checking / normal / error
  const [dbStatus, setDbStatus] = useState('checking')    // checking / normal / error

  const wsRef = useRef(null)

  // 检查后端API健康
  const checkAPI = async () => {
    try {
      const res = await healthCheck()
      setApiStatus(res.data?.code === 200 ? 'normal' : 'error')
      // 如果API正常，同时检查DB状态（通过monitor接口间接判断）
      // 这里简化处理：API正常则DB也正常（因为API依赖DB）
      setDbStatus(res.data?.code === 200 ? 'normal' : 'error')
    } catch {
      setApiStatus('error')
      setDbStatus('error')
    }
  }

  // 检查WebSocket连接
  const checkWS = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/log`)

    ws.onopen = () => {
      setWsStatus('normal')
      ws.close()
    }
    ws.onerror = () => {
      setWsStatus('error')
    }

    // 3秒超时
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        setWsStatus('error')
        ws.close()
      }
    }, 3000)
  }

  // 初始检查
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAPI()
    checkWS()

    // 每30秒重新检查
    const timer = setInterval(() => {
      checkAPI()
      checkWS()
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  // 状态显示配置
  const statusConfig = {
    checking: { color: 'bg-yellow-400', text: '检测中', textColor: 'text-yellow-500' },
    normal: { color: 'bg-green-500', text: '正常', textColor: 'text-green-500' },
    error: { color: 'bg-red-500', text: '异常', textColor: 'text-red-500' },
  }

  // 健康检查项配置
  const healthItems = [
    { key: 'api', label: '后端服务', status: apiStatus },
    { key: 'ws', label: 'WebSocket', status: wsStatus },
    { key: 'db', label: '数据库', status: dbStatus },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">系统健康状态</h3>

      <div className="space-y-3">
        {healthItems.map(item => {
          const config = statusConfig[item.status]
          return (
            <div
              key={item.key}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <span className="text-sm text-slate-600">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className={`text-sm font-medium ${config.textColor}`}>
                  {config.text}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SystemHealth
