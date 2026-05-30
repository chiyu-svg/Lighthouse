import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
  listHook,
  createTrigger,
  getTriggerByHookId,
  updateTrigger,
} from "../../api/request";

/**
 * 触发逻辑配置页面
 *
 * 功能：
 * - 左右分栏布局：左侧表单（60%），右侧流程图预览（40%）
 * - 步骤条引导：Hook选择 → 触发表达式 → 动作配置
 * - 底部操作区：重置、预览、取消、保存
 *
 * @param {string} initialHookId - 从 HookList 传入的初始 Hook ID（可选）
 */
function TriggerConfig({ initialHookId = "" }) {
  const navigate = useNavigate();

  // ========== 状态管理 ==========
  const [currentStep, setCurrentStep] = useState(1); // 当前步骤：1/2/3
  const [selectedHookId, setSelectedHookId] = useState(initialHookId); // 选中的 Hook ID
  const [hookList, setHookList] = useState([]); // Hook 列表数据
  const [expression, setExpression] = useState("true"); // Go 触发表达式
  const [actions, setActions] = useState([]); // 动作配置数组 [{type, config}]
  const [previewVisible, setPreviewVisible] = useState(false); // 预览弹窗可见性
  const [saving, setSaving] = useState(false); // 保存中状态
  const [existingTrigger, setExistingTrigger] = useState(null); // 已有的 Trigger（编辑模式）
  const [hoverNode, setHoverNode] = useState(null); // 流程图 hover 节点

  // ========== 加载 Hook 列表 ==========
  useEffect(() => {
    const fetchHooks = async () => {
      try {
        // 获取所有 Hook（取前100条足够配置使用）
        const res = await listHook(1, 100);
        if (res.data.code === 200) {
          setHookList(res.data.data.list || []);
        }
      } catch {
        message.error("加载Hook列表失败");
      }
    };
    fetchHooks();
  }, []);

  // ========== 如果有初始 hookId，自动选中并加载已有配置 ==========
  useEffect(() => {
      if(selectedHookId) {
        // eslint-disable-next-line react-hooks/immutability
        loadExisting();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHookId]);

  // 尝试加载该 Hook 已有的 Trigger 配置
  const loadExisting = async () => {
    try {
      const res = await getTriggerByHookId(selectedHookId);
      if (res.data.code === 200 && res.data.data) {
        const trigger = res.data.data;
        setExistingTrigger(trigger);
        setExpression(trigger.expression || "true");
        setActions(trigger.action_configs || []);
      }
    } catch {
      // 没有已有配置，使用默认值
    }
  };

  // ========== 获取选中的 Hook 对象 ==========
  const selectedHook = hookList.find((h) => h.id === selectedHookId);

  // ========== 步骤条配置 ==========
  const steps = [
    { key: 1, label: "Hook选择" },
    { key: 2, label: "触发表达式" },
    { key: 3, label: "动作配置" },
  ];

  // ========== Go 表达式示例 ==========
  const expressionExamples = [
    { expr: 'req.Body.status == "success"', desc: "支付回调成功" },
    { expr: 'req.Headers["type"] == "alarm"', desc: "监控告警" },
    {
      expr: 'strings.Contains(req.Body.message, "error")',
      desc: "包含错误信息",
    },
    { expr: "req.Body.amount > 100", desc: "金额大于100" },
    { expr: "true", desc: "无条件触发" },
  ];

  // ========== 动作类型配置 ==========
  const actionTypes = [
    { value: "api", label: "API请求" },
    { value: "email", label: "邮件发送" },
    { value: "mysql", label: "MySQL执行" },
  ];

  // ========== 创建空白动作配置 ==========
  const createEmptyAction = (type) => {
    const configMap = {
      api: { url: "", method: "GET", timeout: 1000, headers: "", body: "" },
      email: {
        smtp_server: "",
        smtp_port: 25,
        username: "",
        password: "",
        recipient: "",
        subject: "",
        content: "",
      },
      mysql: { sql: "", params: "" },
    };
    return { type, config: { ...configMap[type] } };
  };

  // ========== 添加动作 ==========
  const handleAddAction = (type) => {
    if (actions.length >= 5) {
      message.warning("最多添加5个动作");
      return;
    }
    setActions([...actions, createEmptyAction(type)]);
  };

  // ========== 删除动作 ==========
  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  // ========== 更新动作配置字段 ==========
  const handleActionChange = (index, field, value) => {
    const newActions = [...actions];
    newActions[index] = {
      ...newActions[index],
      config: { ...newActions[index].config, [field]: value },
    };
    setActions(newActions);
  };

  // ========== 复制表达式示例 ==========
  const handleCopyExample = (expr) => {
    setExpression(expr);
    message.success("已填入表达式");
  };

  // ========== 步骤前进/后退 ==========
  const canGoNext = () => {
    if (currentStep === 1) return !!selectedHookId;
    if (currentStep === 2) return !!expression.trim();
    return true;
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ========== 重置表单 ==========
  const handleReset = () => {
    setSelectedHookId("");
    setExpression("true");
    setActions([]);
    setCurrentStep(1);
    setExistingTrigger(null);
  };

  // ========== 预览 JSON 配置 ==========
  const handlePreview = () => {
    setPreviewVisible(true);
  };

  // ========== 取消（返回上一页） ==========
  const handleCancel = () => {
    navigate(-1);
  };

  // ========== 保存配置 ==========
  const handleSave = async () => {
    if (!selectedHookId) {
      message.warning("请选择Hook");
      return;
    }
    if (!expression.trim()) {
      message.warning("请输入触发表达式");
      return;
    }

    setSaving(true);
    try {
      const data = {
        hook_id: selectedHookId,
        expression: expression.trim(),
        action_configs: actions.map((action) => {
          const config = { ...action.config };
          if (action.type === "mysql" && typeof config.params === "string") {
            if (config.params.trim()) {
              try {
                if(config.params.includes('[')) {
                  config.params = JSON.parse(config.params);
                } else {
                  config.params = config.params.split(',')
                }
              } catch {
                config.params = [];
              }
            } else {
              config.params = [];
            }
          }
          return { ...action, config };
        })
      };

      if (existingTrigger) {
        // 编辑模式：调用更新接口
        await updateTrigger(existingTrigger.id, data);
        message.success("更新成功");
      } else {
        // 创建模式：调用创建接口
        await createTrigger(data);
        message.success("保存成功");
      }
      navigate(-1);
    } catch (err) {
      message.error(existingTrigger ? "更新失败" : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // ========== 生成预览 JSON ==========
  const getPreviewJSON = () => {
    return JSON.stringify(
      {
        hook_id: selectedHookId,
        hook_name: selectedHook?.name || "",
        expression: expression,
        action_configs: actions.map((action) => {
          const config = { ...action.config };
          if (action.type === "mysql" && typeof config.params === "string") {
            if (config.params.trim()) {
              try {
                if(config.params.includes('[')) {
                  config.params = JSON.parse(config.params);
                } else {
                  config.params = config.params.split(',')
                }
              } catch {
                config.params = [];
              }
            } else {
              config.params = [];
            }
          }
          return { ...action, config };
        }),
      },
      null,
      2
    );
  };

  // ========== 渲染步骤1：Hook选择 ==========
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          选择Hook <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedHookId}
          onChange={(e) => {
            setSelectedHookId(e.target.value);
            // 切换 Hook 时重置表达式和动作
            setExpression("true");
            setActions([]);
            setExistingTrigger(null);
          }}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                     focus:border-indigo-500 focus:outline-none"
        >
          <option value="">请选择Hook</option>
          {hookList.map((hook) => (
            <option key={hook.id} value={hook.id} disabled={hook.status !== 1}>
              {hook.name} {hook.status !== 1 ? "（已禁用）" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 显示选中的 Hook 基本信息 */}
      {selectedHook && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
          <p className="text-sm text-slate-700">
            <span className="font-medium">名称：</span>
            {selectedHook.name}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-medium">接收地址：</span>
            <code className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
              {selectedHook.receive_url}
            </code>
          </p>
        </div>
      )}
    </div>
  );

  // ========== 渲染步骤2：触发表达式 ==========
  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Go触发表达式 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder='输入Go表达式，例如：req.Body.status == "success"'
          rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                     focus:border-indigo-500 focus:outline-none font-mono"
        />
      </div>

      {/* 表达式示例 */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">
          表达式示例（点击填入）
        </p>
        <div className="space-y-2">
          {expressionExamples.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleCopyExample(item.expr)}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 border border-slate-200
                         rounded-md px-3 py-2 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200
                         transition-colors duration-200 gap-1 sm:gap-0"
            >
              <code className="text-sm text-indigo-700 font-mono break-all">
                {item.expr}
              </code>
              <span className="text-xs text-slate-400 sm:ml-2 whitespace-nowrap">
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ========== 渲染步骤3：动作配置 ==========
  const renderStep3 = () => (
    <div className="space-y-4">
      {/* 添加动作按钮组 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">添加动作</span>
        {actionTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => handleAddAction(t.value)}
            disabled={actions.length >= 5}
            className="px-3 py-1.5 text-sm border border-indigo-200 text-indigo-600 rounded-md
                       hover:bg-indigo-50 transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + {t.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {actions.length}/5
        </span>
      </div>

      {/* 动作列表 */}
      {actions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          暂未添加动作，请点击上方按钮添加
        </div>
      ) : (
        actions.map((action, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-md p-4"
          >
            {/* 动作头部：类型标签 + 删除按钮 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">
                动作 {index + 1}：
                {actionTypes.find((t) => t.value === action.type)?.label ||
                  action.type}
              </span>
              <button
                onClick={() => handleRemoveAction(index)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                删除
              </button>
            </div>

            {/* API 请求配置表单 */}
            {action.type === "api" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={action.config.url || ""}
                    onChange={(e) =>
                      handleActionChange(index, "url", e.target.value)
                    }
                    placeholder="https://example.com/api"
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-xs text-slate-600 mb-1">
                      请求方法
                    </label>
                    <select
                      value={action.config.method || "GET"}
                      onChange={(e) =>
                        handleActionChange(index, "method", e.target.value)
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-1/3">
                    <label className="block text-xs text-slate-600 mb-1">
                      超时时间(ms)
                    </label>
                    <input
                      type="number"
                      value={action.config.timeout || 1000}
                      onChange={(e) =>
                        handleActionChange(
                          index,
                          "timeout",
                          Number(e.target.value)
                        )
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    请求头（可选，JSON格式）
                  </label>
                  <input
                    type="text"
                    value={action.config.headers || ""}
                    onChange={(e) =>
                      handleActionChange(index, "headers", e.target.value)
                    }
                    placeholder='{"Content-Type":"application/json"}'
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    请求体（可选）
                  </label>
                  <textarea
                    value={action.config.body || ""}
                    onChange={(e) =>
                      handleActionChange(index, "body", e.target.value)
                    }
                    placeholder='{"key":"value"}'
                    rows={2}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {/* 邮件发送配置表单 */}
            {action.type === "email" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-600 mb-1">
                      SMTP服务器 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={action.config.smtp_server || ""}
                      onChange={(e) =>
                        handleActionChange(index, "smtp_server", e.target.value)
                      }
                      placeholder="smtp.example.com"
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-xs text-slate-600 mb-1">
                      端口
                    </label>
                    <input
                      type="number"
                      value={action.config.smtp_port || 25}
                      onChange={(e) =>
                        handleActionChange(
                          index,
                          "smtp_port",
                          Number(e.target.value)
                        )
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-600 mb-1">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={action.config.username || ""}
                      onChange={(e) =>
                        handleActionChange(index, "username", e.target.value)
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-600 mb-1">
                      申请码
                    </label>
                    <input
                      type="password"
                      value={action.config.password || ""}
                      onChange={(e) =>
                        handleActionChange(index, "password", e.target.value)
                      }
                      className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                                 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    收件人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={action.config.recipient || ""}
                    onChange={(e) =>
                      handleActionChange(index, "recipient", e.target.value)
                    }
                    placeholder="a@example.com"
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    主题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={action.config.subject || ""}
                    onChange={(e) =>
                      handleActionChange(index, "subject", e.target.value)
                    }
                    placeholder="告警通知"
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    内容
                  </label>
                  <textarea
                    value={action.config.content || ""}
                    onChange={(e) =>
                      handleActionChange(index, "content", e.target.value)
                    }
                    placeholder="邮件正文内容"
                    rows={2}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* MySQL 执行配置表单 */}
            {action.type === "mysql" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    SQL语句 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={action.config.sql || ""}
                    onChange={(e) =>
                      handleActionChange(index, "sql", e.target.value)
                    }
                    placeholder="INSERT INTO table_name (col1, col2) VALUES (?, ?)"
                    rows={3}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    参数（可选，JSON数组格式） 
                  </label>
                  <input
                    type="text"
                    value={action.config.params || ""}
                    onChange={(e) =>
                      handleActionChange(index, "params", e.target.value)
                    }
                    placeholder='["value1", "value2"]'
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm
                               focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ========== 渲染当前步骤内容 ==========
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  // ========== 渲染流程图预览（纯 SVG） ==========
  const renderFlowChart = () => {
    // 构建节点列表
    const nodes = [];

    // Hook 节点
    nodes.push({
      id: "hook",
      label: "Hook",
      detail: selectedHook
        ? `${selectedHook.name}\n${selectedHook.receive_url || ""}`
        : "未选择",
    });

    // 表达式节点
    nodes.push({
      id: "expression",
      label: "触发表达式",
      detail: expression || "未填写",
    });

    // 动作节点
    actions.forEach((action, idx) => {
      const typeLabel =
        actionTypes.find((t) => t.value === action.type)?.label || action.type;
      let detail = typeLabel;
      if (action.type === "api")
        detail += `\n${action.config.method || "GET"} ${
          action.config.url || ""
        }`;
      if (action.type === "email")
        detail += `\n→ ${action.config.recipient || ""}`;
      if (action.type === "mysql")
        detail += `\n${
          action.config.sql ? action.config.sql.substring(0, 30) + "..." : ""
        }`;
      nodes.push({
        id: `action-${idx}`,
        label: `动作${idx + 1}：${typeLabel}`,
        detail,
      });
    });

    // 完成节点
    nodes.push({
      id: "end",
      label: "完成",
      detail: "",
    });

    // SVG 布局参数
    const nodeWidth = 200;
    const nodeHeight = 40;
    const gapY = 24;
    const arrowHeight = 30;
    const svgWidth = 260;
    const startX = 30;
    const totalHeight = nodes.length * (nodeHeight + gapY + arrowHeight);

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-0">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          流程图预览
        </h3>
        <svg width={svgWidth} height={totalHeight} className="overflow-visible">
          {nodes.map((node, idx) => {
            const y = idx * (nodeHeight + gapY + arrowHeight);
            return (
              <g key={node.id}>
                {/* 节点矩形 */}
                <rect
                  x={startX}
                  y={y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={6}
                  className={`cursor-pointer transition-colors duration-200 ${
                    node.id === "end"
                      ? "bg-green-100 stroke-green-300"
                      : "fill-indigo-100 stroke-indigo-300"
                  }`}
                  fill={node.id === "end" ? "#dcfce7" : "#e0e7ff"}
                  stroke={node.id === "end" ? "#86efac" : "#a5b4fc"}
                  strokeWidth={1.5}
                  onMouseEnter={() => setHoverNode(node.id)}
                  onMouseLeave={() => setHoverNode(null)}
                />

                {/* 节点文字 */}
                <text
                  x={startX + nodeWidth / 2}
                  y={y + nodeHeight / 2 + 4}
                  textAnchor="middle"
                  className="text-xs fill-slate-700"
                  fontSize={12}
                >
                  {node.label.length > 14
                    ? node.label.substring(0, 14) + "..."
                    : node.label}
                </text>

                {/* Hover 提示 */}
                {hoverNode === node.id && node.detail && (
                  <g>
                    <rect
                      x={startX + nodeWidth + 8}
                      y={y - 8}
                      width={160}
                      height={Math.max(
                        node.detail.split("\n").length * 18 + 12,
                        36
                      )}
                      rx={4}
                      fill="#1e293b"
                      opacity={0.9}
                    />
                    {node.detail.split("\n").map((line, lineIdx) => (
                      <text
                        key={lineIdx}
                        x={startX + nodeWidth + 16}
                        y={y + 8 + lineIdx * 18}
                        fill="#e2e8f0"
                        fontSize={11}
                      >
                        {line.length > 18
                          ? line.substring(0, 18) + "..."
                          : line}
                      </text>
                    ))}
                  </g>
                )}

                {/* 连接箭头（非最后一个节点） */}
                {idx < nodes.length - 1 && (
                  <g>
                    <line
                      x1={startX + nodeWidth / 2}
                      y1={y + nodeHeight}
                      x2={startX + nodeWidth / 2}
                      y2={y + nodeHeight + arrowHeight}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                    />
                    <polygon
                      points={`${startX + nodeWidth / 2 - 4},${
                        y + nodeHeight + arrowHeight - 4
                      } ${startX + nodeWidth / 2 + 4},${
                        y + nodeHeight + arrowHeight - 4
                      } ${startX + nodeWidth / 2},${
                        y + nodeHeight + arrowHeight
                      }`}
                      fill="#94a3b8"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ========== 主渲染 ==========
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">触发逻辑配置</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ===== 左侧表单区 ===== */}
        <div className="w-full lg:w-3/5">
          <div className="bg-white border border-slate-200 rounded-lg">
            {/* 步骤条 */}
            <div className="flex items-center px-4 md:px-6 py-4 border-b border-slate-200 overflow-x-auto">
              {steps.map((step, idx) => (
                <div key={step.key} className="flex items-center shrink-0">
                  {/* 步骤圆圈 + 文字 */}
                  <div className="flex items-center">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium shrink-0
                        ${
                          currentStep >= step.key
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-400"
                        }`}
                    >
                      {step.key}
                    </span>
                    <span
                      className={`ml-2 text-sm whitespace-nowrap ${
                        currentStep >= step.key
                          ? "text-indigo-600 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {/* 步骤间连接线 */}
                  {idx < steps.length - 1 && (
                    <div className="w-6 md:w-12 h-px bg-slate-200 mx-2 md:mx-3 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* 步骤内容 */}
            <div className="px-4 md:px-6 py-5">{renderStepContent()}</div>

            {/* 底部操作区 */}
            <div className="px-4 md:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* 左侧：步骤导航 */}
              <div className="flex gap-2 w-full sm:w-auto">
                {currentStep > 1 && (
                  <button
                    onClick={handlePrev}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md
                               hover:bg-slate-50 transition-colors"
                  >
                    上一步
                  </button>
                )}
                {currentStep < 3 && (
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md
                               hover:bg-indigo-700 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一步
                  </button>
                )}
              </div>
              {/* 右侧：操作按钮 */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md
                             hover:bg-slate-50 transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-md
                             hover:bg-indigo-50 transition-colors"
                >
                  预览
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md
                             hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md
                             hover:bg-indigo-700 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 右侧流程图预览 ===== */}
        <div className="w-full lg:w-2/5">{renderFlowChart()}</div>
      </div>

      {/* ===== 预览 JSON 弹窗 ===== */}
      {previewVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPreviewVisible(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                JSON 配置预览
              </h2>
              <button
                onClick={() => setPreviewVisible(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                关闭
              </button>
            </div>
            <div className="px-6 py-4">
              <pre className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-700 overflow-auto max-h-96 font-mono">
                {getPreviewJSON()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TriggerConfig;
