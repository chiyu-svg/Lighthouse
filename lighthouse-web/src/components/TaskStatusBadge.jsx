import React from 'react'

/**
 * 任务状态标签组件
 *
 * @param {string} status - 任务状态：pending/processing/success/failed
 * @param {string} size - 尺寸：sm（小号，用于表格内）/ md（中号，默认）
 *
 * 使用示例：
 *   <TaskStatusBadge status="success" />
 *   <TaskStatusBadge status="failed" size="sm" />
 */
function TaskStatusBadge({ status, size = 'md' }) {
  // 状态配置：颜色 + 文字
  const statusMap = {
    pending: {
      label: '待执行',
      bg: 'bg-slate-100',
      text: 'text-slate-400',
      dot: 'bg-slate-300',
    },
    processing: {
      label: '执行中',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      dot: 'bg-blue-500',
    },
    success: {
      label: '成功',
      bg: 'bg-green-50',
      text: 'text-green-600',
      dot: 'bg-green-500',
    },
    failed: {
      label: '失败',
      bg: 'bg-red-50',
      text: 'text-red-500',
      dot: 'bg-red-500',
    },
  }

  const config = statusMap[status] || statusMap.pending

  // 尺寸配置
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClass} ${config.bg} ${config.text}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export default TaskStatusBadge
