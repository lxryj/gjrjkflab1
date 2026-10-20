import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Editor } from "./Editor";
import { CallbackCommand } from "./commands/CallbackCommand";
import { Circle } from "./model/Circle";
import { Ellipse } from "./model/Ellipse";
import { Group } from "./model/Group";
import { Line } from "./model/Line";
import { Rect } from "./model/Rect";
import { Shape } from "./model/Shape";
import { SvgDocument } from "./model/SvgDocument";
import { Text } from "./model/Text";

/** CLI 应用层：解释命令、校验参数，并连接历史管理、领域模型与文件 IO。 */
export class Cli {
  private readonly editor = new Editor();
  private readonly commands = new Map<string, (args: string[]) => string>();
  // 最近一次成功 read/save 的绝对路径，供无参数 save 复用；init 会清除。
  private filePath?: string;
  constructor() {
    // 仅编辑类命令经过 edit() 入历史栈；显示类和文档类各自处理。
    this.commands.set("init", a => this.init(a)); this.commands.set("read", a => this.read(a)); this.commands.set("save", a => this.save(a)); this.commands.set("canvas", a => this.canvas(a));
    this.commands.set("create", a => this.edit(() => this.create(a))); this.commands.set("delete", a => this.edit(() => this.delete(a))); this.commands.set("move", a => this.edit(() => this.move(a))); this.commands.set("scale", a => this.edit(() => this.scale(a))); this.commands.set("set", a => this.edit(() => this.set(a)));
    this.commands.set("group", a => this.edit(() => this.group(a))); this.commands.set("ungroup", a => this.edit(() => this.ungroup(a))); this.commands.set("addto", a => this.edit(() => this.addto(a))); this.commands.set("front", a => this.edit(() => this.zorder(a,true))); this.commands.set("back", a => this.edit(() => this.zorder(a,false)));
    this.commands.set("tree", a => this.tree(a)); this.commands.set("show", a => this.show(a)); this.commands.set("help", a => this.help(a));
    this.commands.set("undo", () => this.editor.history.undo()); this.commands.set("redo", () => this.editor.history.redo());
  }
  // 统一捕获异常，让命令失败后仍可继续会话；仅命令名转为小写，保留 id 大小写。
  runLine(line: string): string { const input = line.trim(); if (!input || input.startsWith("#")) return ""; try { const tokens = tokenize(input); const name = tokens.shift()!.toLowerCase(); const handler = this.commands.get(name); if (!handler) throw new Error(`unknown command: ${name}. Type 'help' to list available commands.`); return handler(tokens); } catch (e) { const message = e instanceof Error ? e.message : String(e); const hint = message.startsWith("no document.") ? "\n  Hint: start with 'init 800 600' or open a file with 'read <file.svg>'." : message.startsWith("usage:") ? "\n  Hint: type 'help <command>' to see command syntax and an example." : ""; return `error: ${message}${hint}`; } }
  /** 将一次编辑封装为一个历史单元，复用命令的撤销与回滚逻辑。 */
  private edit(action: () => string): string { const command = new CallbackCommand(this.editor, action); return this.editor.history.execute(command); }
  private init(a: string[]): string { const w = a.length ? positive(a[0], "width") : 800, h = a.length > 1 ? positive(a[1], "height") : 600; if (a.length > 2) throw new Error("usage: init [w] [h]"); this.editor.document = new SvgDocument(w,h); this.editor.history.documentOperation(); this.filePath = undefined; return `canvas ${w}x${h} created\n  Next: create a shape, inspect it with 'tree', then export with 'save drawing.svg'.`; }
  // 先在临时对象中完成读取、解析，成功后才替换当前文档。
  private read(a: string[]): string { if (a.length !== 1) throw new Error("usage: read <file.svg>"); const path = resolve(a[0]); let parsed: SvgDocument; try { parsed = SvgDocument.fromSvg(readFileSync(path,"utf8")); } catch { throw new Error(`cannot read file: ${a[0]}`); } this.editor.document = parsed; this.editor.history.documentOperation(); this.filePath = path; return [...parsed.warnings,`read ${a[0]} (${parsed.all().length} elements)`].join("\n"); }
  // 文件写入成功后才更新默认路径，并建立新的历史边界。
  private save(a: string[]): string { if (a.length > 1) throw new Error("usage: save [file.svg]"); const doc = this.editor.requireDocument(); const file = a[0] ? resolve(a[0]) : this.filePath; if (!file) throw new Error("usage: save <file.svg> (no previous read path)"); try { writeFileSync(file,doc.toSvg(),"utf8"); } catch { throw new Error(`cannot write file: ${a[0] ?? file}`); } this.editor.history.documentOperation(); this.filePath = file; return `saved to ${a[0] ?? file} (${doc.all().length} elements)`; }
  private canvas(a: string[]): string { const d = this.editor.requireDocument(); if (!a.length) return `canvas ${d.width}x${d.height}`; if (a.length !== 2) throw new Error("usage: canvas [w] [h]"); d.width = positive(a[0],"width"); d.height = positive(a[1],"height"); this.editor.history.documentOperation(); return `canvas set to ${d.width}x${d.height}`; }
  private create(a: string[]): string {
    if (a.length < 2) throw new Error("usage: create <type> <id> [params...] [in <containerId>]");
    // 只在尾部识别 in 子句，拆出父容器后再解析图形自身的参数。
    const type = a[0], id = a[1]; const inAt = a.length >= 2 && a[a.length-2] === "in" ? a.length-2 : -1; const parentId = inAt >= 0 ? a[inAt+1] : undefined; const p = inAt >= 0 ? a.slice(2,inAt) : a.slice(2);
    const d = this.editor.requireDocument(); if (d.find(id)) throw new Error(`id already exists: ${id}`);
    let shape: Shape;
    // 内置图形工厂的类型名分派点；插件阶段可替换为 provider 注册表。
    switch(type) {
      case "rect": if(p.length<4||p.length>5) throw new Error("usage: create rect <id> <x> <y> <w> <h> [fill]"); shape=new Rect(id,n(p[0]),n(p[1]),n(p[2]),n(p[3]),p[4]); break;
      case "circle": if(p.length<3||p.length>4) throw new Error("usage: create circle <id> <cx> <cy> <r> [fill]"); shape=new Circle(id,n(p[0]),n(p[1]),n(p[2]),p[3]); break;
      case "ellipse": if(p.length<4||p.length>5) throw new Error("usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]"); shape=new Ellipse(id,n(p[0]),n(p[1]),n(p[2]),n(p[3]),p[4]); break;
      case "line": if(p.length<4||p.length>5) throw new Error("usage: create line <id> <x1> <y1> <x2> <y2> [stroke]"); shape=new Line(id,n(p[0]),n(p[1]),n(p[2]),n(p[3]),p[4]); break;
      case "text": if(p.length!==3) throw new Error("usage: create text <id> <x> <y> \"content\""); shape=new Text(id,n(p[0]),n(p[1]),p[2]); break;
      case "g": if(p.length) throw new Error("usage: create g <id>"); shape=new Group(id); break;
      default: throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    // 目标容器校验通过后才挂入树，并由文档登记整个子树的 id。
    let parent: Group = d.root; if(parentId){ const target=d.find(parentId); if(!target) throw new Error(`no such container: ${parentId}`); if(!target.isContainer()) throw new Error(`not a container: ${parentId}`); parent=target; }
    d.attach(shape,parent); return `${type}#${id} created${parentId?` in g#${parentId}`:""}`;
  }
  // 删除同时维护父子关系和 id 索引；容器的全部后代也需要注销。
  private delete(a:string[]):string { if(a.length!==1) throw new Error("usage: delete <id>"); const d=this.editor.requireDocument(), s=d.require(a[0]); (s.parent as Group).remove(s); d.unregisterTree(s); return `${s.type}#${s.id} deleted`; }
  private move(a:string[]):string { if(a.length!==3) throw new Error("usage: move <id> <dx> <dy>"); const s=this.editor.requireDocument().require(a[0]),dx=n(a[1]),dy=n(a[2]); s.move(dx,dy); return `${s.type}#${s.id} moved by (${dx},${dy})`; }
  private scale(a:string[]):string { if(a.length!==2) throw new Error("usage: scale <id> <factor>"); const f=n(a[1]); if(f<=0) throw new Error("scale factor must be positive"); const s=this.editor.requireDocument().require(a[0]); s.scale(f); return `${s.type}#${s.id} scaled by ${f}`; }
  private set(a:string[]):string {
    if(a.length<3) throw new Error("usage: set <id> <attr> <value>"); const d=this.editor.requireDocument(),s=d.require(a[0]),key=a[1],value=a.slice(2).join(" ");
    // 几何白名单限制动态字段赋值范围；通用样式与文本内容分别处理。
    const geometry:Record<string,string[]>={rect:["x","y","width","height"],circle:["cx","cy","r"],ellipse:["cx","cy","rx","ry"],line:["x1","y1","x2","y2"],text:["x","y"]};
    if(key==="fill"||key==="stroke"||key==="stroke-width"){s.setAttribute(key,value);return `${s.type}#${s.id} updated: ${key}=${value}`;}
    if(s instanceof Text && key==="text"){s.content=value;return `text#${s.id} updated: text=${JSON.stringify(value)}`;}
    if(!geometry[s.type]?.includes(key)) throw new Error(`unknown attribute: ${key}`); const v=n(value); (s as any)[key]=v; return `${s.type}#${s.id} updated: ${key}=${v}`;
  }
  // 本版只支持同父节点分组：先排除祖先/后代冲突，再按原同级顺序收编。
  private group(a:string[]):string { if(a.length<3) throw new Error("usage: group <newGid> <id1> <id2>..."); const d=this.editor.requireDocument(); if(d.find(a[0])) throw new Error(`id already exists: ${a[0]}`); const shapes=a.slice(1).map(id=>d.require(id)); if(new Set(shapes).size!==shapes.length) throw new Error("duplicate group target"); for(const s of shapes) if(s.isContainer()&&shapes.some(x=>x!==s&&isDescendant(s,x))) throw new Error(`cannot group a container into its own descendant: ${s.id}`); const locations=shapes.map(s=>({s,parent:s.parent as Group,index:(s.parent as Group).children.indexOf(s)})); const parents=new Set(locations.map(x=>x.parent)); if(parents.size!==1) throw new Error("group targets must have the same parent"); const parent=locations[0].parent, at=Math.min(...locations.map(x=>x.index)); const g=new Group(a[0]); for(const x of locations.sort((u,v)=>u.index-v.index)) x.parent.remove(x.s); d.attach(g,parent,at); for(const x of locations) g.insert(x.s); return `g#${g.id} created with ${shapes.length} children`; }
  // 只注销容器本身，子节点保留 id；逐个插回容器原位置以保持绘制顺序。
  private ungroup(a:string[]):string { if(a.length!==1) throw new Error("usage: ungroup <gid>"); const d=this.editor.requireDocument(),g=d.require(a[0]); if(!g.isContainer()) throw new Error(`not a container: ${g.id}`); if(g.parent===d.root) throw new Error(`cannot ungroup top-level container: ${g.id}`); const parent=g.parent as Group; let at=parent.children.indexOf(g); parent.remove(g); d.unregister(g); for(const child of [...g.children]) { g.remove(child); parent.insert(child,at++); } return `g#${g.id} ungrouped`; }
  // 当前守卫拒绝以自身或自身祖先为目标；通过后先摘除旧归属，再追加到目标末尾。
  private addto(a:string[]):string { if(a.length!==2) throw new Error("usage: addto <gid> <id>"); const d=this.editor.requireDocument(),target=d.require(a[0]),s=d.require(a[1]); if(!target.isContainer()) throw new Error(`not a container: ${target.id}`); if(target===s||isDescendant(target,s)) throw new Error(`cannot move container into its own descendant: ${target.id}`); (s.parent as Group).remove(s); target.insert(s); return `${s.type}#${s.id} moved into g#${target.id}`; }
  // SVG 中后出现的同级元素绘制在前面，因此 front 对应数组末尾。
  private zorder(a:string[],front:boolean):string { if(a.length!==1) throw new Error(`usage: ${front?"front":"back"} <id>`); const s=this.editor.requireDocument().require(a[0]),p=s.parent as Group; p.remove(s); p.insert(s,front?p.children.length:0); return `${s.type}#${s.id} moved to ${front?"front":"back"}`; }
  private tree(a:string[]):string { const d=this.editor.requireDocument(); if(a.length>1) throw new Error("usage: tree [id]"); if(!a.length)return [`svg (${d.width}x${d.height})`,...(d.root.children.length ? d.root.children.map((s,i)=>draw(s,"",i===d.root.children.length-1)) : ["(empty canvas; try 'create rect r1 20 20 120 60 steelblue')"])].join("\n"); return draw(d.require(a[0]),"",true); }
  private show(a:string[]):string { if(a.length!==1) throw new Error("usage: show <id>"); const s=this.editor.requireDocument().require(a[0]); const parent=s.parent?.id==="__svg_root__"?"svg":`${s.parent?.type}#${s.parent?.id}`; return [`${s.type}#${s.id}  parent=${parent}`,`  ${s.geometry()}`,...Object.entries(s.attributes).map(([k,v])=>`  ${k}=${v}`)].join("\n"); }
  /** 汇总帮助，或显示某条命令的语法和可直接回放的示例。 */
  private help(a: string[]): string { if (a.length > 1) throw new Error("usage: help [command]"); if (!a.length) return HELP; const detail = HELP_DETAILS[a[0].toLowerCase()]; if (!detail) throw new Error(`unknown command: ${a[0]}. Type 'help' to list available commands.`); return detail; }
}
function n(s:string):number { const x=Number(s); if(!Number.isFinite(x)) throw new Error(`invalid number: ${s}`); return x; }
function positive(s:string,label:string):number { const x=n(s); if(x<=0) throw new Error(`${label} must be positive`); return x; }
// 沿 candidate 的父链检查 parent；从父节点起步，因此不把自身视为后代。
function isDescendant(parent:Shape,candidate:Shape):boolean { for(let p=candidate.parent;p;p=p.parent)if(p===parent)return true;return false; }
// prefix 保留祖先层级的连接线；last 决定当前分支及后续缩进的样式。
function draw(s:Shape,prefix:string,last:boolean):string { const line=`${prefix}${last?"└── ":"├── "}${s.type}#${s.id}${s.geometry()?`  ${s.geometry()}`:""}${s instanceof Group&&s.attributes["data-kind"]?` (${s.attributes["data-kind"]})`:""}`; return s.isContainer()? [line,...s.children.map((c,i)=>draw(c,prefix+(last?"    ":"│   "),i===s.children.length-1))].join("\n"):line; }
// 双引号中的空格属于同一个参数；active 用于保留空字符串参数（如 ""）。
function tokenize(line:string):string[] { const out:string[]=[]; let token="",quoted=false,active=false; for(let i=0;i<line.length;i++){ const c=line[i]; if(c==='"'){quoted=!quoted;active=true;} else if(/\s/.test(c)&&!quoted){if(active){out.push(token);token="";active=false;}} else {token+=c;active=true;} } if(quoted)throw new Error("unterminated quoted string");if(active)out.push(token);return out; }
const HELP=`SVG 编辑器命令指南

快速开始：
  init                         新建默认 800x600 画布
  create rect r1 20 20 120 60 steelblue
  tree                         查看图形结构
  save drawing.svg             保存 SVG，可用浏览器打开预览

常用命令：
  文档：init [w] [h] | read <file.svg> | save [file.svg] | canvas [w] [h]
  创建：create rect|circle|ellipse|line|text|g <id> ... [in <containerId>]
  编辑：move <id> <dx> <dy> | scale <id> <factor> | set <id> <attr> <value> | delete <id>
  组合：group <newGid> <id1> <id2>... | ungroup <gid> | addto <gid> <id> | front/back <id>
  查看：tree [id] | show <id> | help [command]
  历史：undo | redo

文字内容请用双引号包裹；命令行也支持 # 开头的注释行。
输入 'help <command>' 查看该命令的参数和示例。`;

const HELP_DETAILS: Record<string, string> = {
  init: "init [w] [h]\n新建画布；默认尺寸为 800x600。\n示例：init 800 600",
  read: "read <file.svg>\n读取 SVG 为当前文档；没有 id 的图形会自动补 id 并提示。\n示例：read drawing.svg",
  save: "save [file.svg]\n保存当前文档；省略路径时沿用上次 read/save 的路径。\n示例：save drawing.svg",
  canvas: "canvas [w] [h]\n查看尺寸，或修改画布尺寸。\n示例：canvas 1024 768",
  create: "create <type> <id> [parameters...] [in <containerId>]\n类型：rect x y w h [fill] | circle cx cy r [fill] | ellipse cx cy rx ry [fill] | line x1 y1 x2 y2 [stroke] | text x y \"content\" | g\n示例：create rect card 20 30 160 60 orange in panel",
  delete: "delete <id>\n删除图形；删除容器会连同其后代一起删除。\n示例：delete card",
  move: "move <id> <dx> <dy>\n按增量移动图形或整个容器。\n示例：move card 20 -5",
  scale: "scale <id> <factor>\n按画布原点缩放位置与尺寸，factor 必须大于 0。\n示例：scale card 1.5",
  set: "set <id> <attr> <value>\n设置样式、几何白名单属性或 text 的 text 内容。\n示例：set card fill tomato\n示例：set title text \"Hello SVG\"",
  group: "group <newGid> <id1> <id2>...\n把同一父容器下已有图形按原顺序收编。\n示例：group cluster card title",
  ungroup: "ungroup <gid>\n解散非根级容器，并将子图形提升到原位置。\n示例：ungroup cluster",
  addto: "addto <gid> <id>\n把已有图形移入容器。\n示例：addto panel card",
  front: "front <id>\n将图形放到同级绘制顺序的最前面。\n示例：front card",
  back: "back <id>\n将图形放到同级绘制顺序的最后面。\n示例：back card",
  tree: "tree [id]\n显示文档结构和关键几何属性；可传 id 查看子树。\n示例：tree panel",
  show: "show <id>\n显示图形的父容器、几何信息和样式属性。\n示例：show card",
  undo: "undo\n撤销最近一次编辑；init/read/save/canvas 后历史会锁定，直到下一次编辑。",
  redo: "redo\n重做最近撤销的编辑；撤销后执行新编辑会清空 redo 历史。",
  help: "help [command]\n显示命令总览或指定命令的语法示例。\n示例：help create"
};
