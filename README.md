一键将当前网页保存为 Markdown 的 Chrome 扩展=

  内容

  - save-to-md-extension/manifest.json: MV3 清单，声明权限与入口。
  - save-to-md-extension/background.js: 点击扩展图标时注入脚本，并接收 Markdown 后触发下载。
  - save-to-md-extension/content.js: 抽取页面主体并用简易规则将常见 HTML 元素转换为 Markdown（标题、段落、链接、图片、列表、代码块、引用、表格等），然后发送给后台。
  - save-to-md-extension/README.md: 中文安装与使用说明。

  如何安装与使用（Chrome）

  - 打开 chrome://extensions/，开启“开发者模式”。
  - 点击“加载已解压的扩展程序”，选择 save-to-md-extension 文件夹。
  - 打开任意网页，点击工具栏中的扩展图标“Save as Markdown”，选择保存位置，即可得到 YYYYMMDD-HHMM-标题.md 文件。
