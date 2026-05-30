import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { message, Modal } from "antd";
import { PlusOutlined, CopyOutlined } from "@ant-design/icons";
import HookStatus from "../../components/HookStatus";
import HookCreate from "./HookCreate";
import HookEdit from "./HookEdit";
import { listHook, deleteHook, toggleHookStatus } from "../../api/request";

/**
 * Hook列表管理页面
 *
 * 功能：
 * - 表格展示Hook列表（名称、接收地址、状态、创建时间）
 * - 创建新Hook（弹窗表单）
 * - 编辑Hook（弹窗表单，仅可修改名称和描述）
 * - 启用/禁用Hook（点击状态标签切换）
 * - 删除Hook（二次确认）
 * - 复制接收地址
 * - 跳转触发逻辑配置
 */
function Hooks() {
  const navigate = useNavigate();

  // Hook列表数据
  const [hookList, setHookList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 弹窗控制
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [currentHook, setCurrentHook] = useState(null);
  
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await listHook(page, pageSize);
      if (res.data.code === 200) {
        setHookList(res.data.data.list || []);
        setTotal(res.data.data.total);
      }
    } catch (err) {
      message.error("加载Hook列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [page]);
  // 加载Hook列表

  // 切换启用/禁用状态
  const handleToggle = async (id) => {
    try {
      const res = await toggleHookStatus(id);
      if (res.data.code === 200) {
        message.success("状态切换成功");
        fetchList();
      } else {
        message.error(res.data.msg);
      }
    } catch {
      message.error("状态切换失败");
    }
  };

  // 删除Hook（二次确认）
  const handleDelete = (id, name) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除Hook「${name}」吗？关联的触发器和任务数据也将被删除。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await deleteHook(id);
          if (res.data.code === 200) {
            message.success("删除成功");
            fetchList();
          } else {
            message.error(res.data.msg);
          }
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  // 复制接收地址到剪贴板
  const handleCopyURL = (url) => {
    const fullURL = window.location.origin + url;
    navigator.clipboard
      .writeText(fullURL)
      .then(() => {
        message.success("接收地址已复制");
      })
      .catch(() => {
        message.error("复制失败，请手动复制");
      });
  };

  // 编辑按钮
  const handleEdit = (hook) => {
    setCurrentHook(hook);
    setEditVisible(true);
  };

  // 创建成功回调
  const handleCreateSuccess = () => {
    setCreateVisible(false);
    fetchList();
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    setEditVisible(false);
    setCurrentHook(null);
    fetchList();
  };

  return (
    <div>
      {/* 页面标题 + 创建按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Hook管理</h1>
        <button
          onClick={() => setCreateVisible(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md
                     hover:bg-indigo-700 transition-colors duration-200 text-sm"
        >
          <PlusOutlined />
          创建Hook
        </button>
      </div>

      {/* Hook列表表格 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          {/* 表头 */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">
                名称
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">
                接收地址
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">
                触发类型
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">
                状态
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">
                创建时间
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">
                操作
              </th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">
                  加载中...
                </td>
              </tr>
            ) : hookList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">
                  暂无Hook，点击上方「创建Hook」按钮添加
                </td>
              </tr>
            ) : (
              hookList.map((hook) => (
                <tr
                  key={hook.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
                >
                  {/* 名称 */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">
                      {hook.name}
                    </span>
                    {hook.description && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hook.description}
                      </p>
                    )}
                  </td>

                  {/* 接收地址（可复制） */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {hook.receive_url}
                      </code>
                      <button
                        onClick={() => handleCopyURL(hook.receive_url)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="复制地址"
                      >
                        <CopyOutlined className="text-sm" />
                      </button>
                    </div>
                  </td>

                  {/* 触发类型 */}
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {hook.trigger_type}
                    </span>
                  </td>

                  {/* 状态（可点击切换） */}
                  <td className="px-6 py-4">
                    <HookStatus
                      status={hook.status}
                      onToggle={() => handleToggle(hook.id)}
                    />
                  </td>

                  {/* 创建时间 */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">
                      {new Date(hook.created_at).toLocaleString()}
                    </span>
                  </td>

                  {/* 操作按钮 */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(hook)}
                        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() =>
                          navigate("/triggers", { state: { hookId: hook.id } })
                        }
                        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1"
                      >
                        配置触发
                      </button>
                      <button
                        onClick={() => handleDelete(hook.id, hook.name)}
                        className="text-sm text-slate-500 hover:text-red-500 transition-colors px-2 py-1"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 简易分页 */}
        {total > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3 border-t border-slate-200 gap-2">
            <span className="text-sm text-slate-500">共 {total} 条</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-sm border border-slate-200 rounded
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-slate-50 transition-colors"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">{page}</span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-sm border border-slate-200 rounded
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-slate-50 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建Hook弹窗 */}
      {createVisible && (
        <HookCreate
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* 编辑Hook弹窗 */}
      {editVisible && currentHook && (
        <HookEdit
          visible={editVisible}
          hook={currentHook}
          onClose={() => {
            setEditVisible(false);
            setCurrentHook(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

export default Hooks;
