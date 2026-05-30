import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 配置
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010, // 前端开发服务器端口
    open: true, // 启动后自动打开浏览器
    // 代理配置：将 /api 和 /ws 开头的请求转发到后端 Gin 服务
    proxy: {
      "/api": {
        target: "http://localhost:8080", // 后端服务地址
        changeOrigin: true, // 允许跨域
      },
      // WebSocket 代理配置
      // ws: true 启用WebSocket代理，支持协议升级（HTTP → WS）
      "/ws": {
        target: "ws://localhost:8080", // 后端WebSocket地址
        ws: true, // 启用WebSocket代理
        changeOrigin: true,
      },
    },
  },
});
