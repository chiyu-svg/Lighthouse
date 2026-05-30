import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { listTask, listHook } from '../../api/request'
import TaskStatusBadge from '../../components/TaskStatusBadge'

/**
 * 任务列表页面
 *
 * 功能：
 * - 顶部筛选区：状态筛选 / Hook选择 / 时间范围
 * - 表格展示：任务ID、Hook名称、状态、执行耗时、创建时间、结束时间
 * - 分页组件
 * - 点击任务ID跳转详情页
 */
function TaskList() {
  const navigate = useNavigate()

  // ========== 筛选条件 ==========
  const [statusFilter, setStatusFilter] = useState('')     // 状态筛选
  const [hookFilter, setHookFilter] = useState('')         // Hook ID 筛选
  const [startTime, setStartTime] = useState('')           // 开始时间
  const [endTime, setEndTime] = useState('')               // 结束时间

  // ========== 分页 ==========
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // ========== 数据 ==========
  const [taskList, setTaskList] = useState([])
  const [hookList, setHookList] = useState([]) // Hook 下拉选项
  const [loading, setLoading] = useState(false)

  // ========== 加载 Hook 下拉选项 ==========
  useEffect(() => {
    const fetchHooks = async () => {
      try {
        const res = await listHook(1, 100)
        if (res.data.code === 200) {
          setHookList(res.data.data.list || [])
        }
      } catch {
        // 静默失败，不影响主流程
      }
    }
    fetchHooks()
  }, [])

  // ========== 加载任务列表 ==========
  const fetchTasks = async (currentPage = page) => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        pageSize,
      }
      // 只有非空才传
      if (statusFilter) params.status = statusFilter
      if (hookFilter) params.hook_id = hookFilter
      if (startTime) params.start_time = startTime
      if (endTime) params.end_time = endTime

      const res = await listTask(params)
      if (res.data.code === 200) {
        setTaskList(res.data.data.list || [])
        setTotal(res.data.data.total || 0)
      }
    } catch {
      message.error('加载任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载 & 筛选变化时重新加载
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, hookFilter, startTime, endTime])

  // ========== 事件处理 ==========

  // 页码变化
  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchTasks(newPage)
  }

  // 重置筛选
  const handleReset = () => {
    setStatusFilter('')
    setHookFilter('')
    setStartTime('')
    setEndTime('')
    setPage(1)
  }

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize)

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  // 格式化耗时
  const formatCostTime = (ms) => {
    if (!ms || ms === 0) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-4">
      {/* ===== 顶部筛选区 ===== */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-3 md:gap-4">
          {/* 状态筛选 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-700 font-medium">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部</option>
              <option value="pending">待执行</option>
              <option value="processing">执行中</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>

          {/* Hook 选择 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-700 font-medium">Hook源</label>
            <select
              value={hookFilter}
              onChange={(e) => { setHookFilter(e.target.value); setPage(1) }}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部</option>
              {hookList.map((hook) => (
                <option key={hook.id} value={hook.id}>{hook.name}</option>
              ))}
            </select>
          </div>

          {/* 开始时间 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-700 font-medium">开始时间</label>
            <input
              type="date"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setPage(1) }}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 结束时间 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-700 font-medium">结束时间</label>
            <input
              type="date"
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setPage(1) }}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 重置按钮 */}
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* ===== 任务列表表格 ===== */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
          {/* 表头 */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">任务ID</th>
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">Hook名称</th>
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">状态</th>
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">执行耗时</th>
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">创建时间</th>
              <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">结束时间</th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">加载中...</td>
              </tr>
            ) : taskList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">暂无任务记录</td>
              </tr>
            ) : (
              taskList.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  {/* 任务ID：可点击跳转详情 */}
                  <td className="px-4 py-3">
                    <span
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="text-indigo-600 hover:text-indigo-800 cursor-pointer text-sm font-mono underline decoration-indigo-300"
                    >
                      {task.id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{task.hook_name}</td>
                  <td className="px-4 py-3">
                    <TaskStatusBadge status={task.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatCostTime(task.cost_time)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatTime(task.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatTime(task.end_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ===== 分页 ===== */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            共 {total} 条记录，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            {/* 上一页 */}
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-slate-50 transition-colors"
            >
              上一页
            </button>
            {/* 页码按钮（最多显示5页） */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // 计算显示的页码范围
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1.5 text-sm border rounded-md transition-colors
                    ${page === pageNum
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {/* 下一页 */}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-slate-50 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskList
