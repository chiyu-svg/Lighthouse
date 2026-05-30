import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ComposedChart,
  Bar,
  Legend,
} from "recharts";
import {
  getMonitorData,
  getGoroutineTrend,
  getSuccessRateTrend,
  getTaskCostTop5,
  healthCheck,
} from "../../api/request";
import GoroutineTrend from "../../components/Monitor/GoroutineTrend";
import SuccessRateTrend from "../../components/Monitor/SuccessRateTrend";
import TaskCostTop5 from "../../components/Monitor/TaskCostTop5";
import SystemHealth from "../../components/Monitor/SystemHealth";

/**
 * 核心仪表盘页面
 *
 * 布局：
 * - 顶部指标概览区（1行3列）：Goroutine活跃数、当前任务执行数、今日任务成功率
 * - 核心监控图表区（1行2列）：Goroutine趋势图、任务成功率趋势图
 * - 辅助监控区（1行2列）：任务耗时TOP5、系统健康状态
 *
 * 数据更新：
 * - HTTP API 获取初始数据
 * - WebSocket 接收实时推送（每30秒更新一次监控数据）
 */
function Dashboard() {
  // ========== 概览指标状态 ==========
  const [monitorData, setMonitorData] = useState({
    goroutine_count: 0,
    running_tasks: 0,
    today_total: 0,
    today_success: 0,
    today_failed: 0,
    success_rate: 0,
  });
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);

  // ========== 加载初始数据 ==========
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getMonitorData();
        if (res.data.code === 200 && res.data.data) {
          setMonitorData(res.data.data);
        }
      } catch {
        // 初始加载失败，等待WebSocket推送
      }
    };
    fetchData();
  }, []);

  // ========== WebSocket 实时更新 ==========
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws/log`);
    wsRef.current = ws;

    ws.onopen = () => {
      // 启动心跳
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 只处理监控类型消息
        if (data.type === "monitor") {
          setMonitorData({
            goroutine_count: data.goroutine_count || 0,
            running_tasks: data.running_tasks || 0,
            today_total: data.today_total || 0,
            today_success: data.today_success || 0,
            today_failed: data.today_failed || 0,
            success_rate: data.success_rate || 0,
          });
        }
      } catch {
        // 忽略非JSON消息
      }
    };

    ws.onclose = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  // ========== 环形进度条参数 ==========
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(monitorData.success_rate, 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  // ========== 渲染 ==========
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">仪表盘</h1>

      {/* ===== 顶部指标概览区 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* 卡片1：Goroutine活跃数 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Goroutine活跃数</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {monitorData.goroutine_count}
              </p>
            </div>
          </div>
        </div>

        {/* 卡片2：当前任务执行数 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-sm">当前任务执行数</p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-green-600">
              {monitorData.running_tasks}
            </span>
            <span className="text-xs text-slate-400">执行中</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs text-green-600">
              成功 {monitorData.today_success}
            </span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-red-500">
              失败 {monitorData.today_failed}
            </span>
          </div>
        </div>

        {/* 卡片3：今日任务成功率 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center">
            {/* 左侧：数值 */}
            <div className="flex-1">
              <p className="text-slate-500 text-sm">今日任务成功率</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {monitorData.success_rate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                共 {monitorData.today_total} 个任务
              </p>
            </div>
            {/* 右侧：环形进度条 */}
            <div className="w-24 h-24 flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 80 80">
                {/* 背景圆环 */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="6"
                />
                {/* 进度圆环 */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 40 40)"
                  className="transition-all duration-500"
                />
                <text
                  x="40"
                  y="40"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#6366f1"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {monitorData.success_rate.toFixed(0)}%
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 核心监控图表区 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <GoroutineTrend />
        <SuccessRateTrend />
      </div>

      {/* ===== 辅助监控区 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskCostTop5 />
        <SystemHealth />
      </div>
    </div>
  );
}

export default Dashboard;
