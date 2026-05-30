import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import { updateHook } from '../../api/request'

/**
 * 编辑Hook弹窗组件
 *
 * @param {boolean} visible - 是否显示弹窗
 * @param {Object} hook - 当前编辑的Hook对象
 * @param {function} onClose - 关闭弹窗回调
 * @param {function} onSuccess - 编辑成功回调
 *
 * 可编辑字段：仅名称和描述
 * 不可编辑：接收地址、Hook ID、触发类型
 */
function HookEdit({ visible, hook, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 弹窗打开时，填充当前Hook数据
  useEffect(() => {
    if (hook) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(hook.name || '')
      setDescription(hook.description || '')
    }
  }, [hook])

  // 提交更新
  const handleSubmit = async () => {
    if (!name.trim()) {
      message.warning('请输入Hook名称')
      return
    }

    setSubmitting(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
      }

      const res = await updateHook(hook.id, data)
      if (res.data.code === 200) {
        message.success('更新成功')
        onSuccess()
      } else {
        message.error(res.data.msg)
      }
    } catch {
      message.error('更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible || !hook) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">编辑Hook</h2>
        </div>

        {/* 表单区域 */}
        <div className="px-6 py-4 space-y-4">
          {/* Hook名称（可编辑） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hook名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                         focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* 描述（可编辑） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              描述
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                         focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* 接收地址（只读） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              接收地址（不可修改）
            </label>
            <input
              type="text"
              value={hook.receive_url || ''}
              readOnly
              className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm
                         text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* Hook ID（只读） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hook ID（不可修改）
            </label>
            <input
              type="text"
              value={hook.id || ''}
              readOnly
              className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm
                         text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm
                       hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm
                       hover:bg-indigo-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HookEdit
