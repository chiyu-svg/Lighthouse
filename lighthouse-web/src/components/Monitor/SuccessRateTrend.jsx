/* eslint-disable react-hooks/static-components */
import React, { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getSuccessRateTrend } from '../../api/request'

/**
 * 任务成功率趋势图组件
 *
 * 功能：
 * - 折线图展示成功率，柱状图展示任务数量
 * - 双纵轴：左侧成功率（%），右侧任务数量
 * - Hover显示：成功率、任务总数、成功数、失败数
 *
 * 数据来源：GET /api/v1/monitor/success-rate
 */
function SuccessRateTrend() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  // 加载成功率趋势数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getSuccessRateTrend()
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
  }, [])

  // 自定义Tooltip，显示详细信息
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    // 从原始数据中查找对应项
    const item = data.find(d => d.time === label)
    if (!item) return null

    return (
      <div className="bg-slate-800 text-slate-200 rounded-md px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 font-medium">{label}</p>
        <p>成功率：<span className="text-indigo-400">{item.success_rate.toFixed(1)}%</span></p>
        <p>任务总数：<span className="text-slate-300">{item.task_count}</span></p>
        <p>成功数：<span className="text-green-400">{item.success_count}</span></p>
        <p>失败数：<span className="text-red-400">{item.failed_count}</span></p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">任务成功率趋势</h3>

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
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            {/* 左侧Y轴：成功率 */}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="rate"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            {/* 右侧Y轴：任务数量 */}
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: '#64748b' }}
            />
            {/* 柱状图：任务数量 */}
            <Bar
              yAxisId="count"
              dataKey="task_count"
              name="任务数量"
              fill="#cbd5e1"
              radius={[2, 2, 0, 0]}
              barSize={20}
            />
            {/* 折线图：成功率 */}
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="success_rate"
              name="成功率"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#4f46e5' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default SuccessRateTrend
