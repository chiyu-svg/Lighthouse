import React from 'react'

/**
 * Hook状态标签组件
 *
 * @param {number} status - Hook状态：1-启用, 0-禁用
 * @param {function} onToggle - 点击切换状态的回调函数
 *
 * 使用示例：
 *   <HookStatus status={1} onToggle={() => handleToggle(id)} />
 */
function HookStatus({ status, onToggle }) {
  const isEnabled = status === 1

  return (
    <span
      onClick={onToggle}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
        cursor-pointer select-none transition-colors duration-200
        ${isEnabled
          ? 'bg-green-50 text-green-600 hover:bg-green-100'
          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
        }
      `}
    >
      {/* 状态圆点 */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isEnabled ? 'bg-green-500' : 'bg-slate-300'
        }`}
      />
      {isEnabled ? '启用' : '禁用'}
    </span>
  )
}

export default HookStatus
