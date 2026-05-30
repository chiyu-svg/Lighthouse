import React from 'react'
import { useLocation } from 'react-router-dom'
import TriggerConfig from './TriggerConfig'

/**
 * 触发配置页面入口
 *
 * 从路由 state 中获取 hookId 参数（可选）：
 * - 如果从 HookList 点击"配置触发"进入，会携带 hookId
 * - 如果直接访问 /triggers，hookId 为空，需手动选择
 *
 * 使用示例（从其他页面跳转）：
 *   navigate('/triggers', { state: { hookId: 'uuid-xxx' } })
 */
function Triggers() {
  const location = useLocation()
  const initialHookId = location.state?.hookId || ''

  return <TriggerConfig initialHookId={initialHookId} />
}

export default Triggers
