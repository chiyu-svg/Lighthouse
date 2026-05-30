import React, { useState, useEffect } from 'react'
import { getTaskCostTop5 } from '../../api/request'

/**
 * 任务耗时TOP5组件
 *
 * 功能：
 * - 表格展示：任务ID、HookID、执行耗时、执行状态
 * - 最长任务标红突出
 * - 点击查看任务详情（预留跳转）
 *
 * 数据来源：GET /api/v1/monitor/task-cost-top5
 */
function TaskCostTop5() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  // 加载TOP5数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getTaskCostTop5()
        if (res.data.code === 200) {
          setTasks(res.data.data || [])
        }
      } catch {
        // 请求失败时保持现有数据
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // 每60秒刷新一次
    const timer = setInterval(fetchData, 60000)
    return () => clearInterval(timer)
  }, [])

  // 格式化耗时显示
  const formatCost = (ms) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  // 状态颜色映射
  const statusColors = {
    success: 'text-green-600',
    failed: 'text-red-500',
    processing: 'text-blue-500',
    pending: 'text-slate-400',
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">任务耗时 TOP5</h3>

      {loading && tasks.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">暂无数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-500 font-medium">任务ID</th>
                <th className="text-left py-2 text-slate-500 font-medium">HookID</th>
                <th className="text-right py-2 text-slate-500 font-medium">耗时</th>
                <th className="text-center py-2 text-slate-500 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
            {tasks.map((task, idx) => (
              <tr
                key={task.id}
                className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                  idx === 0 ? 'bg-red-50' : ''
                }`}
              >
                {/* 任务ID（截取前8位） */}
                <td className="py-2">
                  <span className="font-mono text-xs text-slate-600">
                    {task.id.substring(0, 8)}...
                  </span>
                </td>
                {/* HookID（截取前8位） */}
                <td className="py-2">
                  <span className="font-mono text-xs text-slate-500">
                    {task.hook_id.substring(0, 8)}...
                  </span>
                </td>
                {/* 耗时（第一位标红） */}
                <td className={`py-2 text-right font-medium ${
                  idx === 0 ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {formatCost(task.cost_time)}
                </td>
                {/* 状态 */}
                <td className={`py-2 text-center ${statusColors[task.status] || 'text-slate-400'}`}>
                  {task.status === 'success' ? '成功' :
                   task.status === 'failed' ? '失败' :
                   task.status === 'processing' ? '执行中' : '待执行'}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TaskCostTop5
