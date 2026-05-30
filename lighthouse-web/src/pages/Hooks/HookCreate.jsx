import React, { useState } from "react";
import { message } from "antd";
import { createHook } from "../../api/request";

/**
 * 创建Hook弹窗组件
 *
 * @param {boolean} visible - 是否显示弹窗
 * @param {function} onClose - 关闭弹窗回调
 * @param {function} onSuccess - 创建成功回调
 *
 * 表单字段：
 * - Hook名称（必填）
 * - 描述（可选）
 * - 触发类型（必填，默认api）
 * - 签名密钥（可选，可自动生成）
 *
 * 创建成功后显示接收地址，支持复制
 */
function HookCreate({ visible, onClose, onSuccess }) {
  // 表单数据
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("api");
  const [secret, setSecret] = useState("");

  // 提交状态
  const [submitting, setSubmitting] = useState(false);


  // 自动生成签名密钥（16位随机字符串）
  const generateSecret = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecret(key);
  };

  // 提交创建
  const handleSubmit = async () => {
    if (!name.trim()) {
      message.warning("请输入Hook名称");
      return;
    }

    setSubmitting(true);
    try {
      // 构造请求参数
      const data = {
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
      };

      // 如果有签名密钥，存入 trigger_config
      if (secret) {
        data.trigger_config = JSON.stringify({ secret });
      }

      const res = await createHook(data);
      if (res.data.code === 200) {
        message.success("Hook创建成功");
        onSuccess();
      } else {
        message.error(res.data.msg);
      }
    } catch {
      message.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };


  // 关闭并重置表单
  const handleClose = () => {
    setName("");
    setDescription("");
    setTriggerType("api");
    setSecret("");
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">创建Hook</h2>
        </div>

        {/* 表单区域 */}
        <div className="px-6 py-4 space-y-4">
          {/* Hook名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hook名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：支付回调、监控告警"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                             focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              描述
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选，简单描述Hook用途"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                             focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* 触发类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              触发类型
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm
                             focus:border-indigo-500 focus:outline-none"
            >
              <option value="api">接口触发（API）</option>
              <option value="manual">手动触发</option>
              <option value="timer">定时触发</option>
            </select>
          </div>

          {/* 签名密钥 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              签名密钥
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="可选，用于验证Webhook请求合法性"
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm
                               focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={generateSecret}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md text-sm
                               hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                自动生成
              </button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
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
            {submitting ? "创建中..." : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HookCreate;
