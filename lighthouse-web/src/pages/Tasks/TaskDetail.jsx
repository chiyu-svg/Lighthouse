import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { getTaskDetail } from '../../api/request'
import TaskStatusBadge from '../../components/TaskStatusBadge'

/**
 * 任务详情页面
 *
 * 功能：
 * - 展示任务基本信息（ID、Hook名称、触发时间、结束时间、耗时、状态）
 * - 展示 Action 执行日志（卡片式布局）
 * - 展示关联的 Webhook 请求信息
 * - 操作按钮：关闭、返回列表
 */
function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // ========== 状态 ==========
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requestBodyExpanded, setRequestBodyExpanded] = useState(false) // 请求体折叠状态

  // ========== 加载详情 ==========
  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await getTaskDetail(id)
        if (res.data.code === 200) {
          setDetail(res.data.data)
        } else {
          message.error(res.data.msg || '查询详情失败')
        }
      } catch {
        message.error('加载任务详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  // ========== 格式化工具 ==========

  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const formatCostTime = (ms) => {
    if (!ms || ms === 0) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // 格式化 JSON 显示
  const formatJSON = (obj) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  // 格式化请求体（可能是 JSON 字符串）
  const formatRequestBody = (body) => {
    if (!body) return '-'
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return body
    }
  }

  // Action 类型中文映射
  const actionTypeMap = {
    api: 'API请求',
    email: '邮件发送',
    mysql: 'MySQL执行',
  }

  // ========== 加载中 ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-slate-400">加载中...</span>
      </div>
    )
  }

  // ========== 无数据 ==========
  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-slate-400">任务不存在</span>
        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50"
        >
          返回列表
        </button>
      </div>
    )
  }

  const { task, hook_name, action_logs, webhook_log } = detail

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ===== 顶部标题 + 操作按钮 ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">任务详情</h2>
          <TaskStatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>

      {/* ===== 任务基本信息 ===== */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <div>
            <span className="text-xs text-slate-400">任务ID</span>
            <p className="text-sm text-slate-700 font-mono mt-0.5">{task.id}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Hook名称</span>
            <p className="text-sm text-slate-700 mt-0.5">{hook_name}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">触发时间</span>
            <p className="text-sm text-slate-700 mt-0.5">{formatTime(task.created_at)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">结束时间</span>
            <p className="text-sm text-slate-700 mt-0.5">{formatTime(task.end_at)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">执行耗时</span>
            <p className="text-sm text-slate-700 mt-0.5">{formatCostTime(task.cost_time)}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">最终状态</span>
            <div className="mt-0.5">
              <TaskStatusBadge status={task.status} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Action 执行日志 ===== */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Action 执行日志
          <span className="text-xs text-slate-400 font-normal ml-2">
            共 {action_logs?.length || 0} 条
          </span>
        </h3>

        {!action_logs || action_logs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">暂无 Action 日志</p>
        ) : (
          <div className="space-y-3">
            {action_logs.map((log, index) => (
              <div
                key={log.id}
                className={`
                  border rounded-lg p-4
                  ${log.status === 'failed'
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                  }
                `}
              >
                {/* 卡片头部：类型 + 状态 + 耗时 */}
                <div className="flex flex-wrap items-center justify-between mb-2 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      #{index + 1} {actionTypeMap[log.action_type] || log.action_type}
                    </span>
                    <TaskStatusBadge status={log.status} size="sm" />
                  </div>
                  <span className="text-xs text-slate-400">
                    耗时 {formatCostTime(log.cost_time)}
                  </span>
                </div>

                {/* 执行时间 */}
                <div className="text-xs text-slate-400 mb-2">
                  执行时间：{formatTime(log.created_at)}
                </div>

                {/* 成功：显示动作配置摘要 */}
                {log.status === 'success' && (
                  <div className="text-xs text-slate-500 bg-white rounded p-2 border border-slate-100 break-all">
                    <span className="font-medium">配置：</span>
                    {log.action_type === 'api' && (
                      <span>{log.action_config?.method || 'GET'} {log.action_config?.url || '-'}</span>
                    )}
                    {log.action_type === 'email' && (
                      <span>发送至 {log.action_config?.recipient || '-'}</span>
                    )}
                    {log.action_type === 'mysql' && (
                      <span>{log.action_config?.sql?.slice(0, 60) || '-'}{log.action_config?.sql?.length > 60 ? '...' : ''}</span>
                    )}
                  </div>
                )}

                {/* 失败：显示错误信息（标红） */}
                {log.status === 'failed' && log.error_msg && (
                  <div className="text-xs text-red-500 bg-red-50 rounded p-2 border border-red-100 mt-1 break-all">
                    <span className="font-medium">错误：</span>
                    {log.error_msg}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Webhook 请求信息 ===== */}
      {webhook_log && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Webhook 请求信息</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400">请求时间</span>
              <p className="text-sm text-slate-700 mt-0.5">{formatTime(webhook_log.created_at)}</p>
            </div>

            {/* 请求体（可折叠） */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">请求体</span>
                <button
                  onClick={() => setRequestBodyExpanded(!requestBodyExpanded)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {requestBodyExpanded ? '收起' : '展开'}
                </button>
              </div>
              {requestBodyExpanded ? (
                <pre className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto max-h-60 overflow-y-auto">
                  {formatRequestBody(webhook_log.request_body)}
                </pre>
              ) : (
                <p className="mt-1 text-sm text-slate-500 truncate">
                  {webhook_log.request_body?.slice(0, 100)}
                  {webhook_log.request_body?.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDetail
