import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { healthCheck } from '../api/request'

function BasicLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 后端服务健康状态：normal（正常）/ error（异常）
  const [serverStatus, setServerStatus] = useState('normal')
  // 移动端侧边栏展开状态
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 页面加载时，调用健康检查接口验证后端连通性
  useEffect(() => {
    healthCheck().catch(() => {
      setServerStatus('error')
    })
  }, [])

  // 路由变化时自动关闭移动端侧边栏
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false)
  }, [location.pathname])

  // 侧边导航菜单配置
  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/hooks', icon: <ApiOutlined />, label: 'Hook管理' },
    { key: '/triggers', icon: <ThunderboltOutlined />, label: '触发配置' },
    { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务记录' },
    { key: '/logs', icon: <FileTextOutlined />, label: '实时日志' },
  ]

  // 当前激活的菜单项（支持子路径匹配，如 /tasks/:id 也高亮 /tasks）
  const activeKey = menuItems.find(
    (item) => item.key === location.pathname || location.pathname.startsWith(item.key + '/')
  )?.key || '/'

  return (
    <div className="flex h-screen">
      {/* ===== 移动端遮罩层 ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== 侧边导航栏 ===== */}
      <aside
        className={`
          bg-slate-800 flex flex-col
          fixed md:static inset-y-0 left-0 z-50
          w-52 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <span className="text-white text-lg font-bold tracking-wide">
            监控系统
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 sidebar-scroll overflow-y-auto">
          {menuItems.map((item) => (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`
                flex items-center gap-3 px-6 py-3 cursor-pointer
                transition-colors duration-200
                ${
                  activeKey === item.key
                    ? 'bg-indigo-600 text-white border-r-4 border-indigo-400'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* ===== 右侧主区域 ===== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 顶部状态栏 */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* 移动端汉堡菜单按钮 */}
            <button
              className="md:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuOutlined className="text-lg" />
            </button>
            <span className="text-slate-700 font-semibold text-sm md:text-base">
              任务调度与监控平台
            </span>
          </div>
          {/* 后端服务状态指示 */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                serverStatus === 'normal' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span
              className={`text-sm ${
                serverStatus === 'normal' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {serverStatus === 'normal' ? '服务正常' : '服务异常'}
            </span>
          </div>
        </header>

        {/* 主内容区：渲染子路由对应的页面组件 */}
        <main className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default BasicLayout
