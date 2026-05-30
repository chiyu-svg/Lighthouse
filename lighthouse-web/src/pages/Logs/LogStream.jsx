import React, { useState, useEffect } from 'react'
import WebSocketLog from '../../components/WebSocketLog'
import { listHook } from '../../api/request'

/**
 * 实时日志页面
 *
 * 功能：
 * - 全屏终端风格日志展示（bg-slate-900 text-green-400）
 * - 支持按Hook源筛选日志（客户端过滤，无需重连）
 * - 支持按任务ID筛选日志（客户端过滤）
 * - 日志格式：[时间] [级别] 内容
 * - 错误日志标红显示（text-red-400）
 */
function LogStream() {
  const [hooks, setHooks] = useState([])
  const [selectedHookId, setSelectedHookId] = useState('')

  // 加载Hook列表（用于筛选下拉框）
  useEffect(() => {
    listHook(1, 100)
      .then((res) => {
        if (res.data?.data?.list) {
          setHooks(res.data.data.list)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 + 筛选 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold text-slate-800">实时日志</h1>
        <div className="flex items-center gap-3">
          {/* Hook筛选下拉框（客户端过滤） */}
          <select
            value={selectedHookId}
            onChange={(e) => setSelectedHookId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">全部Hook</option>
            {hooks.map((hook) => (
              <option key={hook.id} value={hook.id}>
                {hook.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 日志终端区域 */}
      <div className="flex-1 border border-slate-700 rounded-lg overflow-hidden">
        <WebSocketLog filterHookId={selectedHookId} maxLogs={500} />
      </div>
    </div>
  )
}

export default LogStream
