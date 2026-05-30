import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceDot
} from 'recharts'
import { getGoroutineTrend } from '../../api/request'

/**
 * Goroutine趋势图组件
 *
 * 功能：
 * - 折线图展示Goroutine活跃数趋势
 * - 横轴：时间（精确到分钟）
 * - 纵轴：活跃数
 * - 标注峰值、谷值
 * - 支持时间范围切换（今日、昨日、近7天）
 *
 * 数据来源：GET /api/v1/monitor/goroutine?trend=xxx
 */
function GoroutineTrend() {
  const [trend, setTrend] = useState('today')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  // 加载趋势数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getGoroutineTrend(trend)
        if (res.data.code === 200) {
          setData(res.data.data || [])
        }
      } catch {
        // 请求失败时保持现有数据
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [trend])

  // 找出峰值和谷值
  let peakData = null
  let valleyData = null
  if (data.length > 0) {
    let maxVal = -Infinity, minVal = Infinity
    data.forEach(item => {
      if (item.count > maxVal) { maxVal = item.count; peakData = item }
      if (item.count < minVal) { minVal = item.count; valleyData = item }
    })
  }

  // 时间范围切换按钮配置
  const trendOptions = [
    { value: 'today', label: '今日' },
    { value: 'yesterday', label: '昨日' },
    { value: 'week', label: '近7天' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      {/* 标题 + 时间范围切换 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Goroutine趋势</h3>
        <div className="flex gap-1">
          {trendOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTrend(opt.value)}
              className={`px-3 py-1 text-xs rounded transition-colors duration-200 ${
                trend === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表区域 */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          加载中...
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          暂无数据
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                color: '#e2e8f0',
              }}
              formatter={(value) => [`${value} 个`, 'Goroutine']}
              labelFormatter={(label) => `时间: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
            {/* 标注峰值 */}
            {peakData && (
              <ReferenceDot
                x={peakData.time}
                y={peakData.count}
                r={4}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {/* 标注谷值 */}
            {valleyData && valleyData !== peakData && (
              <ReferenceDot
                x={valleyData.time}
                y={valleyData.count}
                r={4}
                fill="#22c55e"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* 峰谷值标注说明 */}
      {data.length > 0 && peakData && (
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            峰值: {peakData.count} ({peakData.time})
          </span>
          {valleyData && valleyData !== peakData && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              谷值: {valleyData.count} ({valleyData.time})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default GoroutineTrend
