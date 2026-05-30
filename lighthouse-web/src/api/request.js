import axios from 'axios'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000, // 请求超时时间：10秒
})

// 响应拦截器：统一处理后端返回的错误
request.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 网络错误或服务端返回非 2xx 状态码
    console.error('请求失败：', error.message)
    return Promise.reject(error)
  }
)

// ========== 基础接口 ==========

/** 健康检查 GET /api/v1/base/health */
export function healthCheck() {
  return request.get('/base/health')
}

// ========== Hook管理接口 ==========

/**
 * 创建Hook
 * POST /api/v1/hook/create
 * @param {Object} data - { name, description, trigger_type, trigger_config }
 *
 * 使用示例：
 *   createHook({ name: '支付回调', trigger_type: 'api' })
 */
export function createHook(data) {
  return request.post('/hook/create', data)
}


/**
 * 分页查询Hook列表
 * GET /api/v1/hook/list?page=1&pageSize=10
 * @param {number} page - 页码（默认1）
 * @param {number} pageSize - 每页条数（默认10）
 *
 * 使用示例：
 *   listHook(1, 10)
 */
export function listHook(page = 1, pageSize = 10) {
  return request.get('/hook/list', { params: { page, pageSize } })
}

/**
 * 查询Hook详情
 * GET /api/v1/hook/detail/:id
 * @param {string} id - Hook ID
 *
 * 使用示例：
 *   getHookDetail('uuid-xxx')
 */
export function getHookDetail(id) {
  return request.get(`/hook/detail/${id}`)
}

/**
 * 更新Hook
 * POST /api/v1/hook/update/:id
 * @param {string} id - Hook ID
 * @param {Object} data - { name, description }
 *
 * 使用示例：
 *   updateHook('uuid-xxx', { name: '新名称' })
 */
export function updateHook(id, data) {
  return request.post(`/hook/update/${id}`, data)
}

/**
 * 删除Hook
 * POST /api/v1/hook/delete/:id
 * @param {string} id - Hook ID
 *
 * 使用示例：
 *   deleteHook('uuid-xxx')
 */
export function deleteHook(id) {
  return request.post(`/hook/delete/${id}`)
}

/**
 * 切换Hook启用/禁用状态
 * POST /api/v1/hook/toggle/:id
 * @param {string} id - Hook ID
 *
 * 使用示例：
 *   toggleHookStatus('uuid-xxx')
 */
export function toggleHookStatus(id) {
  return request.post(`/hook/toggle/${id}`)
}

// ========== Trigger管理接口 ==========

/**
 * 创建Trigger
 * POST /api/v1/trigger/create
 * @param {Object} data - { hook_id, expression, action_configs }
 *
 * action_configs 格式：
 * [
 *   { type: "api", config: { url: "http://...", method: "POST", timeout: 1000 } },
 *   { type: "email", config: { smtp_server: "smtp.xxx.com", recipient: "a@b.com", ... } },
 *   { type: "mysql", config: { sql: "INSERT INTO ...", params: [] } }
 * ]
 *
 * 使用示例：
 *   createTrigger({ hook_id: 'uuid', expression: 'true', action_configs: [...] })
 */
export function createTrigger(data) {
  return request.post('/trigger/create', data)
}

/**
 * 更新Trigger
 * POST /api/v1/trigger/update/:id
 * @param {string} id - Trigger ID
 * @param {Object} data - { expression, action_configs }
 *
 * 使用示例：
 *   updateTrigger('trigger-uuid', { expression: 'true', action_configs: [...] })
 */
export function updateTrigger(id, data) {
  return request.post(`/trigger/update/${id}`, data)
}

/**
 * 根据HookID查询Trigger详情
 * GET /api/v1/trigger/detail/:hookId
 * @param {string} hookId - Hook ID
 *
 * 使用示例：
 *   getTriggerByHookId('hook-uuid')
 */
export function getTriggerByHookId(hookId) {
  return request.get(`/trigger/detail/${hookId}`)
}

// ========== Monitor监控接口（新增） ==========


/**
 * 获取监控概览数据
 * GET /api/v1/monitor/data
 *
 * 返回数据：
 * {
 *   goroutine_count: 16,
 *   running_tasks: 3,
 *   today_total: 100,
 *   today_success: 95,
 *   today_failed: 5,
 *   success_rate: 95.0
 * }
 */
export function getMonitorData() {
  return request.get('/monitor/data')
}

/**
 * 获取Goroutine趋势数据
 * GET /api/v1/monitor/goroutine?trend=today
 * @param {string} trend - 时间范围：today(今日) / yesterday(昨日) / week(近7天)
 */
export function getGoroutineTrend(trend = 'today') {
  return request.get('/monitor/goroutine', { params: { trend } })
}

/**
 * 获取成功率趋势数据
 * GET /api/v1/monitor/success-rate
 */
export function getSuccessRateTrend() {
  return request.get('/monitor/success-rate')
}

/**
 * 获取耗时TOP5任务
 * GET /api/v1/monitor/task-cost-top5
 */
export function getTaskCostTop5() {
  return request.get('/monitor/task-cost-top5')
}

// ========== Task任务记录接口 ==========

/**
 * 分页查询任务列表
 * GET /api/v1/task/list
 * @param {Object} params - 查询参数
 *   - page: 页码（默认1）
 *   - pageSize: 每页条数（默认10）
 *   - status: 状态筛选（pending/processing/success/failed）
 *   - hook_id: Hook ID 筛选
 *   - start_time: 开始时间（格式：2024-01-01）
 *   - end_time: 结束时间（格式：2024-12-31）
 *
 * 使用示例：
 *   listTask({ page: 1, pageSize: 10, status: 'success' })
 */
export function listTask(params = {}) {
  return request.get('/task/list', { params })
}

/**
 * 查询任务详情（包含Action日志和Webhook请求）
 * GET /api/v1/task/detail/:id
 * @param {string} id - 任务 ID
 *
 * 使用示例：
 *   getTaskDetail('task-uuid-xxx')
 */
export function getTaskDetail(id) {
  return request.get(`/task/detail/${id}`)
}

/**
 * 查询任务的Action执行日志
 * GET /api/v1/task/action-log/:id
 * @param {string} id - 任务 ID
 *
 * 使用示例：
 *   getTaskActionLog('task-uuid-xxx')
 */
export function getTaskActionLog(id) {
  return request.get(`/task/action-log/${id}`)
}

export default request
