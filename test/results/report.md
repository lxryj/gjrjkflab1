# 自动化测试结果

执行时间：2026-10-21 18:17:35 +08:00 至 2026-10-21 18:17:35 +08:00。

环境：Node.js v24.16.0；TypeScript 7.0.2；win32/x64。

构建：pass；场景总数：49；通过：40；失败：9。

本报告由 `npm test` 生成；失败场景正常计入失败，不跳过、不标记为预期通过。详细输入、输出、断言及源码 SHA-256 见 `report.json`。

| 编号 | 场景 | 需求依据 | 结果 | 问题 |
|---|---|---|---|---|
| D01 | 未初始化文档时拒绝操作并给出引导 | 2 通用约定；3 文档类 | PASS | - |
| D02 | 默认画布与自定义浮点尺寸 | 3 init/canvas | PASS | - |
| D03 | 空行、注释、含空格及中文文本 | 2 REPL 与带空格参数 | PASS | - |
| D04 | 命令帮助及未知命令反馈 | 3 help；交互提示 | PASS | - |
| S01 | rect 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S02 | circle 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S03 | ellipse 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S04 | line 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S05 | text 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S06 | g 的创建、属性、移动与缩放 | 4.1 create；3 move/scale | PASS | - |
| S07 | 所有类型支持 in 并显示正确父容器 | 4.1 in 子句 | PASS | - |
| S08 | 省略颜色时沿用 SVG 默认样式 | 4.1 fill/stroke 省略语义 | PASS | - |
| S09 | id 区分大小写且重复 id 失败不入历史 | 2 id 约定；4.2 重复 id | PASS | - |
| S10 | 修改几何白名单、样式及文本内容 | 4.1 set 白名单 | PASS | - |
| S11 | 不存在 id、非法属性、无效数字等失败不改文档 | 2 失败无状态变更；4.2 错误约定 | PASS | - |
| S12 | 创建时必须提供非空 id | 2 create/group 显式 id | FAIL | Q9 |
| G01 | 嵌套容器递归移动、缩放所有后代 | 2.1 Composite；3 move/scale | PASS | - |
| G02 | 分组按原同级顺序且整体 undo/redo | 3 group；4.3 一个 undo 单元 | PASS | - |
| G03 | group 拒绝同时收编祖先及后代 | 4.2 group 环检查 | PASS | - |
| G04 | 非根级 ungroup 保留子节点位置及索引 | 3 ungroup | PASS | - |
| G05 | 拒绝根级 ungroup 且维持历史 | 4.2 根级容器禁止解组 | PASS | - |
| G06 | addto 在无祖先关系的容器间迁移图形 | 3 addto | PASS | - |
| G07 | front/back 仅改变同级绘制顺序 | 3 front/back | PASS | - |
| G08 | 删除整个子树后 undo 恢复父子关系 | 3 delete；4.3 undo | PASS | - |
| G09 | 跨父容器 group 支持收编并可整体撤销 | 3 group 从各自原父容器摘出 | FAIL | Q1 |
| G10 | addto 必须拒绝把祖先放入其后代 | 2 树形结构；3 addto | FAIL | Q2 |
| G11 | addto 到当前父容器时将节点排到末尾 | 3 addto 作为最后一个子节点 | FAIL | Q3 |
| H01 | 显示命令不进入撤销栈 | 3 显示类跳过历史 | PASS | - |
| H02 | undo 后新编辑清空 redo | 3 redo 栈清空 | PASS | - |
| H03 | 失败编辑不清除已有 redo | 2 失败不改变任何状态 | PASS | - |
| H04 | 文档操作后 undo/redo 锁定且下次成功编辑解锁 | 4.3 文档类历史边界 | PASS | - |
| H05 | 多次 undo/redo 后快照不与当前图形共享状态 | Command 快照恢复 | PASS | - |
| E01 | canvas 第二参数非法时尺寸与历史都不改变 | 2 命令失败不改变状态 | FAIL | Q4 |
| E02 | 文件读写失败保留文档与 undo 历史 | 4.2 IO 错误；2 状态原子性 | PASS | - |
| E03 | 参数缺失与超量时返回用法且保留状态 | 3 命令语法；2 错误约定 | PASS | - |
| F01 | 保存生成有效 SVG 且特殊字符正确转义 | 0 SVG 文本；3 save | PASS | - |
| F02 | 基础 save/read 保留几何、文本和层级 | 3 read/save；0.1 SVG 格式 | PASS | - |
| F03 | 无参数 save 复用路径且支持含空格路径 | 3 save [file.svg]；2 带空格参数 | PASS | - |
| F04 | 缺失 id 自动补全、警告并避免显式 id 冲突 | 2 自动补 id | PASS | - |
| F05 | 读取重复 id 拒绝替换当前文档 | 2 id 全文档唯一 | PASS | - |
| F06 | 原说明 other.svg 的元素数量和嵌套属性 | 6 典型会话外部 SVG | PASS | - |
| F07 | 导入后移动、保存应保持 XML 有效且坐标不回退 | 3 read/move/save 往返 | FAIL | Q5 |
| F08 | 导入保留交错类型同级及嵌套绘制顺序 | 0 SVG 树；3 read/front/back | FAIL | Q6 |
| F09 | 格式损坏的 XML 拒绝导入且保留文档 | 3 read；2 失败不改变状态 | FAIL | Q8 |
| V01 | tree 子树过滤与 show 的父节点和属性 | 5.1 tree [id]；5.2 show | PASS | - |
| V02 | tree 必须内联关键 fill 样式 | 5.1 tree 内联关键属性示例 | FAIL | Q7 |
| I01 | 实际 REPL 回放双节点流程图并保留 SVG | 6.1 版本 A；REPL 逐行输入 | PASS | - |
| I02 | 实际 REPL 错误脚本继续执行且失败不入历史 | 2 错误约定；4.2 错误会话 | PASS | - |
| A01 | 生产源码依赖方向符合 README 模块规则 | 架构方案 3 依赖方向规则 | PASS | - |

## 失败原因

### S12 创建时必须提供非空 id

```text
空字符串不能作为有效 id
```

### G09 跨父容器 group 支持收编并可整体撤销

```text
Expected command success: group pair r c
error: group targets must have the same parent
```

### G10 addto 必须拒绝把祖先放入其后代

```text
祖先迁入后代必须被拒绝
```

### G11 addto 到当前父容器时将节点排到末尾

```text
Expected command success: addto parent a
error: cannot move container into its own descendant: parent
```

### E01 canvas 第二参数非法时尺寸与历史都不改变

```text
Expected values to be strictly equal:
+ actual - expected

+ 'canvas 100x600'
- 'canvas 800x600'
          ^

```

### F07 导入后移动、保存应保持 XML 有效且坐标不回退

```text
导入后保存不得输出重复几何属性
+ actual - expected

+ {
+   err: {
+     code: 'InvalidAttr',
+     col: 57,
+     line: 3,
+     msg: "Attribute 'x' is repeated."
+   }
+ }
- true

```

### F08 导入保留交错类型同级及嵌套绘制顺序

```text
Expected values to be strictly deep-equal:
+ actual - expected

  [
    'first',
+   'last',
    'middle',
-   'last',
    'nested'
  ]

```

### F09 格式损坏的 XML 拒绝导入且保留文档

```text
The input did not match the regular expression /^error:/. Input:

'read C:\\Users\\25049\\gjrjkf\\test\\fixtures\\invalid.svg (2 elements)'

```

### V02 tree 必须内联关键 fill 样式

```text
The input did not match the regular expression /rect#r.*fill=red/. Input:

'svg (800x600)\n└── rect#r  x=1 y=2 w=3 h=4'

```

## 验证边界

本报告验证列出的场景，不等同于穷尽所有输入。未进行浏览器渲染截图验收、大文档压力测试、完整 SVG 规范兼容验证或代码覆盖率测量。
