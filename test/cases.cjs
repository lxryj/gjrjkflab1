const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { XMLValidator, XMLParser } = require('fast-xml-parser');

const cases = [];
function scenario(id, name, requirement, run, issue) {
  cases.push({ id, name, requirement, run, issue });
}
// 需求中的六类图形；预期坐标是人工按 move/scale 语义计算的固定值。
const shapes = [
  ['rect', 'rect r 1 2 10 20 red', 'r', 'x=1 y=2 w=10 h=20', 'x=6 y=0 w=20 h=40'],
  ['circle', 'circle c 3 4 5 blue', 'c', 'cx=3 cy=4 r=5', 'cx=10 cy=4 r=10'],
  ['ellipse', 'ellipse e 5 6 7 8 green', 'e', 'cx=5 cy=6 rx=7 ry=8', 'cx=14 cy=8 rx=14 ry=16'],
  ['line', 'line l 1 2 9 10 black', 'l', '(1,2) -> (9,10)', '(6,0) -> (22,16)'],
  ['text', 'text t 1.5 2.5 "开始 Hello"', 't', '(1.5,2.5) "开始 Hello"', '(7,1) "开始 Hello"'],
  ['g', 'g g1', 'g1', 'g#g1', 'g#g1']
];
function childOrder(doc) { return doc.root.children.map(shape => shape.id); }
function outputDoc(t, cli, name = 'export.svg') {
  const file = path.join(t.work, name);
  t.ok(cli, `save "${file}"`);
  const xml = fs.readFileSync(file, 'utf8');
  t.note(`file: ${name}`, xml);
  return xml;
}

scenario('D01', '未初始化文档时拒绝操作并给出引导', '2 通用约定；3 文档类', t => {
  const cli = t.cli();
  t.assert.match(t.run(cli, 'tree'), /^error: no document\./);
  t.assert.match(t.run(cli, 'create g root'), /^error: no document\./);
  t.assert.match(t.run(cli, 'help'), /init/);
});
scenario('D02', '默认画布与自定义浮点尺寸', '3 init/canvas', t => {
  const cli = t.init();
  t.assert.equal(t.ok(cli, 'canvas'), 'canvas 800x600');
  t.ok(cli, 'init 320.5 240.25');
  t.assert.equal(t.ok(cli, 'canvas'), 'canvas 320.5x240.25');
  t.ok(cli, 'canvas 1024 768');
  t.assert.equal(t.ok(cli, 'canvas'), 'canvas 1024x768');
});
scenario('D03', '空行、注释、含空格及中文文本', '2 REPL 与带空格参数', t => {
  const cli = t.init();
  t.assert.equal(t.run(cli, ''), '');
  t.assert.equal(t.run(cli, '   # comment'), '');
  t.ok(cli, 'create text title 10.5 -20.25 "开始 Hello SVG"');
  t.assert.match(t.ok(cli, 'show title'), /\(10\.5,-20\.25\) "开始 Hello SVG"/);
  t.ok(cli, 'set title text ""');
  t.assert.match(t.ok(cli, 'show title'), /""/);
});
scenario('D04', '命令帮助及未知命令反馈', '3 help；交互提示', t => {
  const cli = t.cli();
  for (const name of ['init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group',
    'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'undo', 'redo', 'help']) {
    t.assert.ok(t.ok(cli, `help ${name}`).includes(name));
  }
  t.assert.match(t.run(cli, 'unknown-command'), /^error: unknown command:/);
  t.assert.match(t.run(cli, 'help unknown-command'), /^error:/);
});
for (let i = 0; i < shapes.length; i++) {
  const [type, create, id, initial, transformed] = shapes[i];
  scenario(`S0${i + 1}`, `${type} 的创建、属性、移动与缩放`, '4.1 create；3 move/scale', t => {
    const cli = t.init();
    t.ok(cli, `create ${create}`);
    t.assert.ok(t.ok(cli, `show ${id}`).includes(initial));
    t.ok(cli, `move ${id} 2 -2`);
    t.ok(cli, `scale ${id} 2`);
    t.assert.ok(t.ok(cli, `show ${id}`).includes(transformed));
  });
}
scenario('S07', '所有类型支持 in 并显示正确父容器', '4.1 in 子句', t => {
  const cli = t.init(['create g parent']);
  for (const [, create, id] of shapes) {
    t.ok(cli, `create ${create} in parent`);
    t.assert.match(t.ok(cli, `show ${id}`), /parent=g#parent/);
  }
});
scenario('S08', '省略颜色时沿用 SVG 默认样式', '4.1 fill/stroke 省略语义', t => {
  const cli = t.init(['create rect r 0 0 10 20', 'create line l 0 0 10 20']);
  const xml = outputDoc(t, cli);
  t.assert.doesNotMatch(xml, /\s(fill|stroke)=/);
  t.assert.equal(XMLValidator.validate(xml), true);
});
scenario('S09', 'id 区分大小写且重复 id 失败不入历史', '2 id 约定；4.2 重复 id', t => {
  const cli = t.init(['create g Box', 'create g box']);
  const before = t.ok(cli, 'tree');
  t.assert.equal(t.run(cli, 'create g Box'), 'error: id already exists: Box');
  t.assert.equal(t.ok(cli, 'tree'), before);
  t.ok(cli, 'undo');
  t.assert.match(t.run(cli, 'show box'), /^error: no such shape:/);
  t.ok(cli, 'show Box');
});
scenario('S10', '修改几何白名单、样式及文本内容', '4.1 set 白名单', t => {
  const cli = t.init();
  for (const [, create] of shapes) t.ok(cli, `create ${create}`);
  for (const [id, fields] of [
    ['r', ['x', 'y', 'width', 'height']], ['c', ['cx', 'cy', 'r']],
    ['e', ['cx', 'cy', 'rx', 'ry']], ['l', ['x1', 'y1', 'x2', 'y2']], ['t', ['x', 'y']]
  ]) {
    for (const field of fields) t.ok(cli, `set ${id} ${field} 12.5`);
    const shown = t.ok(cli, `show ${id}`);
    t.assert.ok(shown.includes('12.5'));
    t.assert.doesNotMatch(shown, /NaN|undefined/);
  }
  t.assert.match(t.ok(cli, 'show r'), /x=12.5 y=12.5 w=12.5 h=12.5/);
  t.assert.match(t.ok(cli, 'show c'), /cx=12.5 cy=12.5 r=12.5/);
  t.assert.match(t.ok(cli, 'show e'), /cx=12.5 cy=12.5 rx=12.5 ry=12.5/);
  t.assert.match(t.ok(cli, 'show l'), /\(12.5,12.5\) -> \(12.5,12.5\)/);
  for (const [key, value] of [['fill', '#abcdef'], ['stroke', 'black'], ['stroke-width', '2.5']]) {
    t.ok(cli, `set r ${key} ${value}`);
    t.assert.ok(t.ok(cli, 'show r').includes(`${key}=${value}`));
    t.ok(cli, `set g1 ${key} ${value}`);
    t.assert.ok(t.ok(cli, 'show g1').includes(`${key}=${value}`));
  }
  t.assert.equal(t.ok(cli, 'set r x 001.50'), 'rect#r updated: x=1.5');
  t.ok(cli, 'set t text "新标题 v2"');
  t.assert.match(t.ok(cli, 'show t'), /新标题 v2/);
});
scenario('S11', '不存在 id、非法属性、无效数字等失败不改文档', '2 失败无状态变更；4.2 错误约定', t => {
  const cli = t.init(['create rect r 1 2 3 4 red']);
  const before = t.ok(cli, 'tree');
  for (const [command, message] of [
    ['delete absent', 'no such shape: absent'], ['move r NaN 0', 'invalid number: NaN'],
    ['scale r 0', 'scale factor must be positive'], ['scale r -1', 'scale factor must be positive'],
    ['set r font-size 10', 'unknown attribute: font-size'], ['set r x bad', 'invalid number: bad'],
    ['create g child in absent', 'no such container: absent'], ['create g child in r', 'not a container: r'],
    ['create box b 0 0 1 1 "box"', 'unknown shape type: box'],
    ['create text bad 0 0 "unfinished', 'unterminated quoted string']
  ]) {
    t.assert.ok(t.run(cli, command).startsWith(`error: ${message}`));
    t.assert.equal(t.ok(cli, 'tree'), before);
  }
});
scenario('S12', '创建时必须提供非空 id', '2 create/group 显式 id', t => {
  const cli = t.init(['create rect r 0 0 1 1', 'create circle c 0 0 1']);
  const before = t.ok(cli, 'tree');
  t.assert.match(t.run(cli, 'create g ""'), /^error:/, '空字符串不能作为有效 id');
  t.assert.match(t.run(cli, 'group "" r c'), /^error:/, '组名也必须是非空 id');
  t.assert.equal(t.ok(cli, 'tree'), before);
}, 'Q9');
scenario('G01', '嵌套容器递归移动、缩放所有后代', '2.1 Composite；3 move/scale', t => {
  const cli = t.init(['create g outer', 'create g inner in outer',
    'create rect r 1 2 3 4 in inner', 'create text t 5 6 "label" in outer']);
  t.ok(cli, 'move outer 10 -1');
  t.ok(cli, 'scale outer 2');
  t.assert.match(t.ok(cli, 'show r'), /x=22 y=2 w=6 h=8/);
  t.assert.match(t.ok(cli, 'show t'), /\(30,10\) "label"/);
  t.assert.match(t.ok(cli, 'show inner'), /parent=g#outer/);
});
scenario('G02', '分组按原同级顺序且整体 undo/redo', '3 group；4.3 一个 undo 单元', t => {
  const cli = t.init(['create rect a 0 0 1 1', 'create circle b 0 0 1', 'create text c 0 0 "c"']);
  const before = t.ok(cli, 'tree');
  t.ok(cli, 'group pair c a');
  const grouped = t.ok(cli, 'tree');
  t.assert.ok(grouped.indexOf('rect#a') < grouped.indexOf('text#c'));
  t.assert.match(t.ok(cli, 'show a'), /parent=g#pair/);
  t.assert.match(t.ok(cli, 'show b'), /parent=svg/);
  t.ok(cli, 'undo');
  t.assert.equal(t.ok(cli, 'tree'), before);
  t.ok(cli, 'redo');
  t.assert.equal(t.ok(cli, 'tree'), grouped);
});
scenario('G03', 'group 拒绝同时收编祖先及后代', '4.2 group 环检查', t => {
  const cli = t.init(['create g outer', 'create g inner in outer']);
  const before = t.ok(cli, 'tree');
  t.assert.match(t.run(cli, 'group bad outer inner'), /^error: cannot group a container into its own descendant: outer/);
  t.assert.equal(t.ok(cli, 'tree'), before);
});
scenario('G04', '非根级 ungroup 保留子节点位置及索引', '3 ungroup', t => {
  const cli = t.init(['create g outer', 'create rect first 0 0 1 1 in outer', 'create g inner in outer',
    'create rect a 1 2 3 4 in inner', 'create circle b 5 6 7 in inner', 'create text last 0 0 "last" in outer']);
  const before = t.ok(cli, 'tree');
  t.ok(cli, 'ungroup inner');
  const tree = t.ok(cli, 'tree');
  const ids = [...tree.matchAll(/(?:rect|circle|text)#([^ ]+)/g)].map(m => m[1]);
  t.assert.deepEqual(ids, ['first', 'a', 'b', 'last']);
  t.assert.match(t.ok(cli, 'show b'), /parent=g#outer/);
  t.assert.match(t.run(cli, 'show inner'), /^error: no such shape:/);
  t.ok(cli, 'undo');
  t.assert.equal(t.ok(cli, 'tree'), before);
});
scenario('G05', '拒绝根级 ungroup 且维持历史', '4.2 根级容器禁止解组', t => {
  const cli = t.init(['create g outer']);
  t.assert.equal(t.run(cli, 'ungroup outer'), 'error: cannot ungroup top-level container: outer');
  t.ok(cli, 'undo');
  t.assert.match(t.run(cli, 'show outer'), /^error: no such shape:/);
});
scenario('G06', 'addto 在无祖先关系的容器间迁移图形', '3 addto', t => {
  const cli = t.init(['create g a', 'create g b', 'create rect r 1 2 3 4 in a']);
  const before = t.ok(cli, 'tree');
  t.ok(cli, 'addto b r');
  t.assert.match(t.ok(cli, 'show r'), /parent=g#b/);
  t.assert.match(t.ok(cli, 'show r'), /x=1 y=2 w=3 h=4/);
  t.ok(cli, 'undo');
  t.assert.equal(t.ok(cli, 'tree'), before);
});
scenario('G07', 'front/back 仅改变同级绘制顺序', '3 front/back', t => {
  const cli = t.init(['create g parent', 'create g a in parent', 'create g b in parent', 'create g c in parent']);
  const order = () => [...t.ok(cli, 'tree parent').matchAll(/g#([abc])\b/g)].map(m => m[1]);
  t.ok(cli, 'front a'); t.assert.deepEqual(order(), ['b', 'c', 'a']);
  t.ok(cli, 'back c'); t.assert.deepEqual(order(), ['c', 'b', 'a']);
  t.ok(cli, 'undo'); t.assert.deepEqual(order(), ['b', 'c', 'a']);
});
scenario('G08', '删除整个子树后 undo 恢复父子关系', '3 delete；4.3 undo', t => {
  const cli = t.init(['create g parent', 'create g child in parent', 'create rect r 1 2 3 4 in child']);
  const before = t.ok(cli, 'tree');
  t.ok(cli, 'delete parent');
  for (const id of ['parent', 'child', 'r']) t.assert.match(t.run(cli, `show ${id}`), /^error: no such shape:/);
  t.ok(cli, 'undo');
  t.assert.equal(t.ok(cli, 'tree'), before);
  t.ok(cli, 'redo');
  t.assert.match(t.run(cli, 'show r'), /^error: no such shape:/);
});
scenario('G09', '跨父容器 group 支持收编并可整体撤销', '3 group 从各自原父容器摘出', t => {
  const cli = t.init(['create g a', 'create g b', 'create rect r 1 2 3 4 in a', 'create circle c 5 6 7 in b']);
  const before = t.ok(cli, 'tree');
  t.ok(cli, 'group pair r c');
  t.assert.match(t.ok(cli, 'show r'), /parent=g#pair/);
  t.assert.match(t.ok(cli, 'show c'), /parent=g#pair/);
  t.ok(cli, 'undo');
  t.assert.equal(t.ok(cli, 'tree'), before);
}, 'Q1');
scenario('G10', 'addto 必须拒绝把祖先放入其后代', '2 树形结构；3 addto', t => {
  const cli = t.init(['create g outer', 'create g inner in outer']);
  const before = t.ok(cli, 'tree');
  // 一旦守卫错误放行就立即失败，随后丢弃此实例，避免继续遍历可能有环的结构。
  t.assert.match(t.run(cli, 'addto inner outer'), /^error:/, '祖先迁入后代必须被拒绝');
  t.assert.equal(t.ok(cli, 'tree'), before);
}, 'Q2');
scenario('G11', 'addto 到当前父容器时将节点排到末尾', '3 addto 作为最后一个子节点', t => {
  const cli = t.init(['create g parent', 'create rect a 0 0 1 1 in parent', 'create circle b 0 0 1 in parent']);
  t.ok(cli, 'addto parent a');
  const tree = t.ok(cli, 'tree parent');
  t.assert.ok(tree.indexOf('circle#b') < tree.indexOf('rect#a'));
}, 'Q3');
scenario('H01', '显示命令不进入撤销栈', '3 显示类跳过历史', t => {
  const cli = t.init(['create rect r 0 0 1 1']);
  for (const cmd of ['tree', 'show r', 'canvas', 'help']) t.ok(cli, cmd);
  t.ok(cli, 'undo');
  t.assert.match(t.run(cli, 'show r'), /^error: no such shape:/);
});
scenario('H02', 'undo 后新编辑清空 redo', '3 redo 栈清空', t => {
  const cli = t.init(['create rect r 1 2 3 4', 'move r 10 20']);
  t.ok(cli, 'undo');
  t.ok(cli, 'set r fill red');
  t.assert.equal(t.run(cli, 'redo'), 'error: nothing to redo');
  t.assert.match(t.ok(cli, 'show r'), /x=1 y=2/);
});
scenario('H03', '失败编辑不清除已有 redo', '2 失败不改变任何状态', t => {
  const cli = t.init(['create rect r 1 2 3 4', 'move r 10 20']);
  t.ok(cli, 'undo');
  t.assert.match(t.run(cli, 'set r unsupported 1'), /^error:/);
  t.ok(cli, 'redo');
  t.assert.match(t.ok(cli, 'show r'), /x=11 y=22/);
});
scenario('H04', '文档操作后 undo/redo 锁定且下次成功编辑解锁', '4.3 文档类历史边界', t => {
  const file = path.join(t.work, 'history.svg');
  const cli = t.init();
  for (const command of ['init', 'canvas 300 200', `save "${file}"`, `read "${file}"`]) {
    t.ok(cli, command);
    for (const history of ['undo', 'redo']) t.assert.equal(t.run(cli, history), 'error: undo not allowed after io command');
    t.ok(cli, 'create g checkpoint');
    t.ok(cli, 'undo');
    t.assert.equal(t.run(cli, 'undo'), 'error: nothing to undo');
    t.ok(cli, 'redo');
    t.ok(cli, 'delete checkpoint');
  }
});
scenario('H05', '多次 undo/redo 后快照不与当前图形共享状态', 'Command 快照恢复', t => {
  const cli = t.init(['create rect r 1 2 3 4']);
  t.ok(cli, 'move r 10 0');
  t.ok(cli, 'move r 20 0');
  for (const x of [11, 1]) { t.ok(cli, 'undo'); t.assert.match(t.ok(cli, 'show r'), new RegExp(`x=${x} y=2`)); }
  for (const x of [11, 31]) { t.ok(cli, 'redo'); t.assert.match(t.ok(cli, 'show r'), new RegExp(`x=${x} y=2`)); }
});
scenario('E01', 'canvas 第二参数非法时尺寸与历史都不改变', '2 命令失败不改变状态', t => {
  const cli = t.init(['create g retained']);
  const before = t.ok(cli, 'canvas');
  t.assert.match(t.run(cli, 'canvas 100 bad'), /^error:/);
  t.assert.equal(t.ok(cli, 'canvas'), before);
  t.ok(cli, 'undo');
  t.assert.match(t.run(cli, 'show retained'), /^error:/);
}, 'Q4');
scenario('E02', '文件读写失败保留文档与 undo 历史', '4.2 IO 错误；2 状态原子性', t => {
  const cli = t.init(['create rect r 1 2 3 4', 'move r 10 20']);
  const before = t.ok(cli, 'tree');
  const missing = path.join(t.work, 'absent', 'file.svg');
  t.assert.match(t.run(cli, `read "${missing}"`), /^error: cannot read file:/);
  t.assert.match(t.run(cli, `save "${missing}"`), /^error: cannot write file:/);
  t.assert.equal(t.ok(cli, 'tree'), before);
  t.ok(cli, 'undo');
  t.assert.match(t.ok(cli, 'show r'), /x=1 y=2/);
});
scenario('E03', '参数缺失与超量时返回用法且保留状态', '3 命令语法；2 错误约定', t => {
  const cli = t.init(['create rect r 1 2 3 4']);
  const before = t.ok(cli, 'tree');
  for (const command of ['init 1 2 3', 'canvas 2', 'read', 'save a.svg b.svg', 'create rect',
    'delete', 'move r 2', 'scale r', 'set r x', 'group', 'ungroup', 'addto r', 'front', 'back', 'tree a b', 'show', 'help a b']) {
    t.assert.match(t.run(cli, command), /^error: usage:/);
    t.assert.equal(t.ok(cli, 'tree'), before);
  }
});
scenario('F01', '保存生成有效 SVG 且特殊字符正确转义', '0 SVG 文本；3 save', t => {
  const cli = t.init(['create text title 10 20 "A & B < C"', 'create rect r 0 0 1 1 red']);
  const xml = outputDoc(t, cli);
  t.assert.equal(XMLValidator.validate(xml), true);
  t.assert.ok(xml.includes('A &amp; B &lt; C'));
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  t.assert.equal(parsed.svg.text['#text'], 'A & B < C');
});
scenario('F02', '基础 save/read 保留几何、文本和层级', '3 read/save；0.1 SVG 格式', t => {
  const cli = t.init(['create g scene', 'create rect r 1 2 3 4 red in scene', 'create text t 5 6 "中文 & test" in scene']);
  const tree = t.ok(cli, 'tree');
  const file = path.join(t.work, 'basic.svg');
  t.ok(cli, `save "${file}"`);
  const imported = t.cli(); t.ok(imported, `read "${file}"`);
  t.assert.equal(t.ok(imported, 'tree'), tree);
  t.assert.match(t.ok(imported, 'show t'), /中文 & test/);
});
scenario('F03', '无参数 save 复用路径且支持含空格路径', '3 save [file.svg]；2 带空格参数', t => {
  const cli = t.init(['create rect r 1 2 3 4']);
  const file = path.join(t.work, 'a drawing.svg');
  t.ok(cli, `save "${file}"`);
  t.ok(cli, 'move r 10 20'); t.ok(cli, 'save');
  let xml = fs.readFileSync(file, 'utf8');
  t.assert.match(xml, /x="11" y="22"/);
  const imported = t.cli(); t.ok(imported, `read "${file}"`); t.ok(imported, 'set r fill red'); t.ok(imported, 'save');
  xml = fs.readFileSync(file, 'utf8');
  t.assert.match(xml, /fill="red"/);
  t.ok(imported, 'init');
  t.assert.match(t.run(imported, 'save'), /^error: usage: save/);
});
scenario('F04', '缺失 id 自动补全、警告并避免显式 id 冲突', '2 自动补 id', t => {
  const cli = t.cli();
  const read = t.ok(cli, `read "${t.fixture('missing-ids.svg')}"`);
  t.assert.equal((read.match(/warning: assigned id/g) || []).length, 3);
  t.assert.ok(!read.includes('assigned id rect1 '));
  t.ok(cli, 'show rect1');
  const doc = t.SvgDocument.fromSvg(t.sample('missing-ids.svg'));
  const ids = doc.all().map(s => s.id); t.note('allocated ids', ids);
  t.assert.equal(new Set(ids).size, 4);
  t.assert.ok(ids.every(id => id.length > 0));
});
scenario('F05', '读取重复 id 拒绝替换当前文档', '2 id 全文档唯一', t => {
  const cli = t.init(['create g retained']);
  const before = t.ok(cli, 'tree');
  t.assert.match(t.run(cli, `read "${t.fixture('duplicate-ids.svg')}"`), /^error:/);
  t.assert.equal(t.ok(cli, 'tree'), before);
  t.ok(cli, 'undo');
});
scenario('F06', '原说明 other.svg 的元素数量和嵌套属性', '6 典型会话外部 SVG', t => {
  const cli = t.cli();
  t.assert.match(t.ok(cli, `read "${t.fixture('other.svg')}"`), /\(7 elements\)/);
  t.assert.match(t.ok(cli, 'show r2'), /parent=g#g1/);
  t.assert.match(t.ok(cli, 'show e1'), /cx=1 cy=2 rx=3 ry=4/);
});
scenario('F07', '导入后移动、保存应保持 XML 有效且坐标不回退', '3 read/move/save 往返', t => {
  const cli = t.cli();
  t.ok(cli, `read "${t.fixture('other.svg')}"`);
  t.ok(cli, 'move r2 10 20');
  const xml = outputDoc(t, cli);
  const validation = XMLValidator.validate(xml);
  t.note('XML validator', validation);
  t.assert.equal(validation, true, '导入后保存不得输出重复几何属性');
  const doc = t.SvgDocument.fromSvg(xml);
  t.assert.equal(doc.require('r2').x, 10);
}, 'Q5');
scenario('F08', '导入保留交错类型同级及嵌套绘制顺序', '0 SVG 树；3 read/front/back', t => {
  const xml = t.sample('ordered.svg'); t.note('input ordered.svg', xml);
  const doc = t.SvgDocument.fromSvg(xml);
  t.note('actual root order', childOrder(doc));
  t.note('actual nested order', doc.require('nested').children.map(s => s.id));
  t.assert.deepEqual(childOrder(doc), ['first', 'middle', 'last', 'nested']);
  t.assert.deepEqual(doc.require('nested').children.map(s => s.id), ['inner-first', 'inner-middle', 'inner-last']);
}, 'Q6');
scenario('F09', '格式损坏的 XML 拒绝导入且保留文档', '3 read；2 失败不改变状态', t => {
  const xml = t.sample('invalid.svg');
  t.assert.notEqual(XMLValidator.validate(xml), true, '样例本身应为损坏 XML');
  const cli = t.init(['create g retained']); const before = t.ok(cli, 'tree');
  t.assert.match(t.run(cli, `read "${t.fixture('invalid.svg')}"`), /^error:/);
  t.assert.equal(t.ok(cli, 'tree'), before);
}, 'Q8');
scenario('F10', '自动 id 序号限定于单次 SVG 导入', '2 自动补 id 不跨文档共享状态', t => {
  const xml = '<svg xmlns="http://www.w3.org/2000/svg"><rect/><circle/></svg>';
  const first = t.SvgDocument.fromSvg(xml);
  const second = t.SvgDocument.fromSvg(xml);
  const ids = document => document.all().map(shape => shape.id);
  t.assert.deepEqual(ids(first), ['rect1', 'circle2']);
  t.assert.deepEqual(ids(second), ['rect1', 'circle2']);
});
scenario('V01', 'tree 子树过滤与 show 的父节点和属性', '5.1 tree [id]；5.2 show', t => {
  const cli = t.init(['create g scene', 'create circle c 10 20 30 red in scene', 'create g outside']);
  const tree = t.ok(cli, 'tree scene');
  t.assert.match(tree, /circle#c.*cx=10 cy=20 r=30/);
  t.assert.doesNotMatch(tree, /outside/);
  t.assert.match(t.ok(cli, 'show c'), /parent=g#scene/);
  t.assert.match(t.ok(cli, 'show c'), /fill=red/);
});
scenario('V02', 'tree 内联 fill、stroke 和 stroke-width', '5.1 tree 内联关键属性示例', t => {
  const cli = t.init(['create g panel', 'create rect r 1 2 3 4 red in panel',
    'create line edge 1 2 3 4 black in panel', 'set edge stroke-width 2.5', 'set panel fill white']);
  const tree = t.ok(cli, 'tree');
  t.assert.match(tree, /rect#r.*x=1 y=2 w=3 h=4.*fill=red/);
  t.assert.match(tree, /line#edge.*stroke=black.*stroke-width=2\.5/);
  t.assert.match(tree, /g#panel.*fill=white/);
});
scenario('I01', '实际 REPL 回放双节点流程图并保留 SVG', '6.1 版本 A；REPL 逐行输入', t => {
  const input = t.sample('flowchart.cli');
  const result = spawnSync(process.execPath, [path.join(t.root, 'dist/index.js')], {
    cwd: t.root, input, encoding: 'utf8', timeout: 10000, windowsHide: true
  });
  fs.writeFileSync(path.join(t.resultsDir, 'repl.log'), result.stdout + (result.stderr || ''), 'utf8');
  t.note('REPL stdin', input); t.note('REPL stdout', result.stdout); t.note('REPL stderr', result.stderr);
  t.assert.ifError(result.error); t.assert.equal(result.status, 0);
  t.assert.match(result.stdout, /svg>/);
  t.assert.match(result.stdout, /处理数据 v2/);
  t.assert.equal((result.stdout.match(/error:/g) || []).length, 1, '只允许样例中 save 后 undo 的预期错误');
  t.assert.match(result.stdout, /error: undo not allowed after io command/);
  t.assert.equal(XMLValidator.validate(fs.readFileSync(path.join(t.resultsDir, 'flowchart.svg'), 'utf8')), true);
});
scenario('I02', '实际 REPL 错误脚本继续执行且失败不入历史', '2 错误约定；4.2 错误会话', t => {
  const input = t.sample('errors.cli');
  const result = spawnSync(process.execPath, [path.join(t.root, 'dist/index.js')], {
    cwd: t.root, input, encoding: 'utf8', timeout: 10000, windowsHide: true
  });
  fs.writeFileSync(path.join(t.resultsDir, 'errors.log'), result.stdout + (result.stderr || ''), 'utf8');
  t.note('REPL stdin', input); t.note('REPL stdout', result.stdout);
  t.assert.ifError(result.error); t.assert.equal(result.status, 0);
  t.assert.equal((result.stdout.match(/error:/g) || []).length, 9);
  t.assert.match(result.stdout, /x=10 y=20 w=100 h=50/);
  t.assert.match(result.stdout, /empty canvas/);
});
scenario('A01', '生产源码依赖方向符合 README 模块规则', '架构方案 3 依赖方向规则', t => {
  const files = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full); else if (full.endsWith('.ts')) files.push(full);
    }
  }
  walk(path.join(t.root, 'src'));
  t.note('source files inspected', files.map(file => path.relative(t.root, file).replaceAll('\\', '/')));
  const edges = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = path.relative(t.root, file).replaceAll('\\', '/');
    const specs = [...source.matchAll(/(?:\bfrom\s*|\b(?:import|require)\s*\(\s*)["']([^"']+)["']/g)].map(m => m[1]);
    for (const spec of specs) {
      const target = spec.startsWith('.') ? path.relative(t.root, path.resolve(path.dirname(file), spec)).replaceAll('\\', '/') : spec;
      edges.push({ from: name, to: target });
      if (name.startsWith('src/model/')) t.assert.ok(target.startsWith('src/model/') || target === 'fast-xml-parser', `${name} -> ${target}`);
      else if (name.startsWith('src/commands/')) t.assert.ok(target.startsWith('src/commands/') || target.startsWith('src/model/') || target === 'src/Editor', `${name} -> ${target}`);
      else t.assert.ok(target.startsWith('src/commands/') || target.startsWith('src/model/') ||
        ['src/Cli', 'src/Editor', 'src/CommandLineTokenizer', 'src/ShapeTreeFormatter',
          'node:fs', 'node:path', 'node:readline'].includes(target), `${name} -> ${target}`);
    }
  }
  t.note('static imports including type imports', edges);
  t.assert.ok(files.length > 0, '依赖检查必须实际扫描到源码文件');
});

module.exports = cases;
