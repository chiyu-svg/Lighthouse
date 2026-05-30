/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // 颜色方案已在 Tailwind 内置的 slate/indigo 中定义，无需额外扩展
      },
    },
    plugins: [],
  }
  