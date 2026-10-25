# Packaging Visual Direction｜产品包装视觉方向 Skill v1.0.0

> 专做：**包装版式、配色、视觉风格**。从外箱延伸到内包装、说明书；支持参考图分析；输出方向提案而非印厂施工图。

## 使用方法（不用代码）

将整个 `packaging-visual-direction` 文件夹放到 AI Agent 的 Skills 目录，让其读取 `SKILL.md`。也可以直接将 `SKILL.md` 发给支持自定义指令的助手，作为本次设计规则使用；附加 `references/` 能获取更完整的版式样式库。

然后发一句话即可：

> 我在设计一个桌面香氛器，包装包括外箱、一个内盒和一份说明书。给我 3 套不同的视觉方向，重点讲排版、配色和画面气质。每套给 HEX、不同盒面信息放哪、说明书怎么继承包装风格。这里有两张我喜欢的参考图（上传图片）。先只要方向，不需要刀模。

若已确定颜色、LOGO或盒形，请直接说“这些不可更改”。

## 可选：本地可视化预览

装有 Python 3 时，在该文件夹里运行：

```bash
python scripts/preview.py examples/demo-directions.json -o visual-directions.html
```

双击 `visual-directions.html`，可打开离线视觉提案板。默认附带演示数据；实际项目需要把 `examples/demo-directions.json` 换为自己的方案数据，格式见 `references/board-format.md`。预览仅用于沟通排版、色卡与气质，不是印刷稿、刀模或真实品牌资产。

## 内含什么

- `SKILL.md`：唯一主入口与完整输出约束。
- `references/`：拆解参考图、版式草图、配色/风格发想、视觉生成提示词、网页数据格式。
- `scripts/preview.py`：零第三方依赖，生成纯 HTML 概念方向板。
- `examples/demo-directions.json`：3 条方案的演示案例。
- `tests/test_preview.py`：渲染与错误输入的自动化检验。

## 设计边界

这是产品视觉策划工具，不替代商标授权、产品功效审查、合规说明、成品包装结构工程、实物色彩打样和印前检查。图片参考只抽象设计规律，不复制对方作品。
