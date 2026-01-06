# Save Page as Markdown (Chrome 扩展)

一键把当前网页保存为 Markdown（.md）文件。基于 Manifest V3，点击扩展图标即可下载。

## 安装（加载已解压的扩展）
- 打开 Chrome，访问 `chrome://extensions/`
- 右上角开启“开发者模式”
- 点击“加载已解压的扩展程序”
- 选择本项目文件夹：`save-to-md-extension`

## 使用
- 打开任意网页
- 点击浏览器工具栏中的“Save as Markdown”扩展图标
- 将弹出保存对话框，选择保存位置，得到 `YYYYMMDD-HHMM-标题.md`

## 工作原理
- 后台 `background.js` 在点击时注入 `content.js`
- `content.js`：
  - 选取页面主体（`article/main` 优先，否则使用 `body`）
  - 简单规则把 HTML 转成 Markdown（标题、段落、链接、图片、列表、代码块、引用、表格等常见元素）
  - 通过 `chrome.runtime.sendMessage` 把 Markdown 文本交回后台
- 后台使用 `chrome.downloads.download` 生成 `data:` URL 触发下载

## 权限说明
- `activeTab`：注入脚本到当前活动页
- `scripting`：MV3 注入 `content.js`
- `downloads`：发起 `.md` 文件下载

## 备注
- 这是一个“够用版”的转换器，能覆盖常见元素；极复杂页面的排版可能与原网页不同
- 代码块会尝试从元素类名里猜测语言（如 `language-js`）
- 若你需要更高质量的 Markdown，可将转换逻辑替换为 Turndown 等库（需本地打包进扩展，MV3 禁止远程代码）

