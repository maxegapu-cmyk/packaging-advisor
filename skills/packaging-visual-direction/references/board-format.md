# 离线视觉方案板：数据格式与运行

这个辅助工具是为了**把三条视觉方向直接看出来**。可以不用，它不是 Skill 必要依赖，也不自动采集网络参考图。

运行：

```bash
python scripts/preview.py examples/demo-directions.json -o visual-directions.html
```

生成后用浏览器打开 HTML，能直接看到三张概念样板，每张有外箱主面、内包装、说明书的色彩与排版联动，以及色卡和文案。布局本身是三类可用的方向草图（`offset` / `stripe` / `split`），不是任意刀模。

## 结构

```json
{
  "meta": {"product": "桌面香氛器", "brand": "SORA", "note": "概念示意 / 非印刷稿"},
  "directions": [
    {
      "id": "A", "name": "静谧陈列", "tagline": "像家居杂志的一页",
      "layout": "offset",
      "palette": [
        {"name": "纸白", "role": "底色", "hex": "#EEE9DC", "share": "65%"},
        {"name": "深墨", "role": "文字", "hex": "#252D30", "share": "25%"},
        {"name": "灰绿", "role": "识别色", "hex": "#607E77", "share": "8%"},
        {"name": "暖金", "role": "点缀", "hex": "#C18B54", "share": "2%"}
      ],
      "headline": "SORA", "detail": "桌面香氛器", "inner_label": "01 / UNIT",
      "manual_title": "使用指南", "manual_step": "01 认识产品",
      "typography": "宽松主标题 + 极简说明字", "anchor": "不对称绿带",
      "outer": "文字靠左，主视觉在右下", "inner": "只保留绿带和序号", "manual": "绿带变页眉，步骤清晰",
      "suitable": "家居生活/中高端礼赠", "risk": "太空会看不出品类"
    }
  ]
}
```

### 字段语义

- `directions`：1–3 条；建议 3 条。`id`、`name`、`tagline`、`layout`、`palette`、`headline`、`detail`、`inner_label`、`manual_title`、`manual_step` 为必填。
- `palette`：按顺序为**背景色、文字色、主识别色、点缀色**，至少 3 色、最多 5 色，均用 6 位 HEX；`share` 只是近似视觉面积。
- `layout`：`offset` 不对称海报，`stripe` 竖向索引色带，`split` 左右分栏图像。
- `outer` / `inner` / `manual`：四十字以内的具体布局说明。
- `typography` / `anchor` / `suitable` / `risk`：供决策阅读的摘要。

可把用户真实品牌/产品名写入数据，但不凭空发明产品功效、规格或认证。所有可见图形是抽象占位。**参考图不会自动出现在网页里**；如需真实产品图或渲染图，请使用具备图像能力的工具另行制作。

若报告有对比度警告，不代表方案完全不可用，而是提醒大段小字最好改成更高对比的配色。打印配色/印刷品合规仍需实物核验。
