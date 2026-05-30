import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BasicLayout from './layouts/BasicLayout'
import Dashboard from './pages/Dashboard'
import Hooks from './pages/Hooks'
import Triggers from './pages/Triggers'
import Logs from './pages/Logs'
import TaskList from './pages/Tasks/TaskList'
import TaskDetail from './pages/Tasks/TaskDetail'

/**
 * 根组件：配置全局路由
 *
 * 路由结构：
 * - /          → 仪表盘
 * - /hooks     → Hook源管理
 * - /triggers  → 触发逻辑配置
 * - /logs      → 实时日志
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 所有页面共享 BasicLayout 布局 */}
        <Route path="/" element={<BasicLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="hooks" element={<Hooks />} />
          <Route path="triggers" element={<Triggers />} />
          <Route path="logs" element={<Logs />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
