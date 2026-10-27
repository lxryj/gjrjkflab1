import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Editor } from "./Editor";
import { CallbackCommand } from "./commands/CallbackCommand";
import { Group } from "./model/Group";
import { ShapeFactory } from "./model/ShapeFactory";
import { SvgDocument } from "./model/SvgDocument";
import { SvgNumber } from "./model/SvgNumber";
import { CommandLineTokenizer } from "./CommandLineTokenizer";
import { ShapeTreeFormatter } from "./ShapeTreeFormatter";

interface CliCommand {
  readonly execute: (args: string[]) => string;
  readonly description: string;
}

/** CLI 应用层：解释命令、校验参数，并连接历史管理、领域模型与文件 IO。 */
export class Cli {
  private readonly editor = new Editor();
  private readonly commands = new Map<string, CliCommand>();
  private readonly shapeFactory = new ShapeFactory();
  // 最近一次成功 read/save 的绝对路径，供无参数 save 复用；init 会清除。
  private filePath?: string;
  constructor() {
    // 仅编辑类命令经过 edit() 入历史栈；显示类和文档类各自处理。
    this.registerCommand("init", a => this.init(a), "init [w] [h]\n新建画布；默认尺寸为 800x600。\n示例：init 800 600");
    this.registerCommand("read", a => this.read(a), "read <file.svg>\n读取 SVG 为当前文档；没有 id 的图形会自动补 id 并提示。\n示例：read drawing.svg");
    this.registerCommand("save", a => this.save(a), "save [file.svg]\n保存当前文档；省略路径时沿用上次 read/save 的路径。\n示例：save drawing.svg");
    this.registerCommand("canvas", a => this.canvas(a), "canvas [w] [h]\n查看尺寸，或修改画布尺寸。\n示例：canvas 1024 768");
    this.registerCommand("create", a => this.edit(() => this.create(a)), "create <type> <id> [parameters...] [in <containerId>]\n类型：rect x y w h [fill] | circle cx cy r [fill] | ellipse cx cy rx ry [fill] | line x1 y1 x2 y2 [stroke] | text x y \"content\" | g\n示例：create rect card 20 30 160 60 orange in panel");
    this.registerCommand("delete", a => this.edit(() => this.delete(a)), "delete <id>\n删除图形；删除容器会连同其后代一起删除。\n示例：delete card");
    this.registerCommand("move", a => this.edit(() => this.move(a)), "move <id> <dx> <dy>\n按增量移动图形或整个容器。\n示例：move card 20 -5");
    this.registerCommand("scale", a => this.edit(() => this.scale(a)), "scale <id> <factor>\n按画布原点缩放位置与尺寸，factor 必须大于 0。\n示例：scale card 1.5");
    this.registerCommand("set", a => this.edit(() => this.set(a)), "set <id> <attr> <value>\n设置样式、几何白名单属性或 text 的 text 内容。\n示例：set card fill tomato\n示例：set title text \"Hello SVG\"");
    this.registerCommand("group", a => this.edit(() => this.group(a)), "group <newGid> <id1> <id2>...\n把图形按原顺序收编到新容器。\n示例：group cluster card title");
    this.registerCommand("ungroup", a => this.edit(() => this.ungroup(a)), "ungroup <gid>\n解散非根级容器，并将子图形提升到原位置。\n示例：ungroup cluster");
    this.registerCommand("addto", a => this.edit(() => this.addto(a)), "addto <gid> <id>\n把已有图形移入容器。\n示例：addto panel card");
    this.registerCommand("front", a => this.edit(() => this.zorder(a,true)), "front <id>\n将图形放到同级绘制顺序的最前面。\n示例：front card");
    this.registerCommand("back", a => this.edit(() => this.zorder(a,false)), "back <id>\n将图形放到同级绘制顺序的最后面。\n示例：back card");
    this.registerCommand("tree", a => this.tree(a), "tree [id]\n显示文档结构和关键几何属性；可传 id 查看子树。\n示例：tree panel");
    this.registerCommand("show", a => this.show(a), "show <id>\n显示图形的父容器、几何信息和样式属性。\n示例：show card");
    this.registerCommand("undo", () => this.editor.history.undo(), "undo\n撤销最近一次编辑；init/read/save/canvas 后历史会锁定，直到下一次编辑。");
    this.registerCommand("redo", () => this.editor.history.redo(), "redo\n重做最近撤销的编辑；撤销后执行新编辑会清空 redo 历史。");
    this.registerCommand("help", a => this.help(a), "help [command]\n显示命令总览或指定命令的语法示例。\n示例：help create");
  }
  private registerCommand(name: string, execute: CliCommand["execute"], description: string): void {
    this.commands.set(name, { execute, description });
  }
  // 统一捕获异常，让命令失败后仍可继续会话；仅命令名转为小写，保留 id 大小写。
  runLine(line: string): string { const input = line.trim(); if (!input || input.startsWith("#")) return ""; try { const tokens = CommandLineTokenizer.tokenize(input); const name = tokens.shift()!.toLowerCase(); const handler = this.commands.get(name); if (!handler) throw new Error(`unknown command: ${name}. Type 'help' to list available commands.`); return handler.execute(tokens); } catch (e) { const message = e instanceof Error ? e.message : String(e); const hint = message.startsWith("no document.") ? "\n  Hint: start with 'init 800 600' or open a file with 'read <file.svg>'." : message.startsWith("usage:") ? "\n  Hint: type 'help <command>' to see command syntax and an example." : ""; return `error: ${message}${hint}`; } }
  /** 将一次编辑封装为一个历史单元，复用命令的撤销与回滚逻辑。 */
  private edit(action: () => string): string { const command = new CallbackCommand(this.editor, action); return this.editor.history.execute(command); }
  private init(a: string[]): string { if (a.length > 2) throw new Error("usage: init [w] [h]"); const w = a.length ? SvgNumber.positive(a[0], "width") : 800, h = a.length > 1 ? SvgNumber.positive(a[1], "height") : 600; this.editor.setDocument(new SvgDocument(w,h)); this.editor.history.documentOperation(); this.filePath = undefined; return `canvas ${w}x${h} created\n  Next: create a shape, inspect it with 'tree', then export with 'save drawing.svg'.`; }
  // 先在临时对象中完成读取、解析，成功后才替换当前文档。
  private read(a: string[]): string { if (a.length !== 1) throw new Error("usage: read <file.svg>"); const path = resolve(a[0]); let parsed: SvgDocument; try { parsed = SvgDocument.fromSvg(readFileSync(path,"utf8")); } catch { throw new Error(`cannot read file: ${a[0]}`); } this.editor.setDocument(parsed); this.editor.history.documentOperation(); this.filePath = path; return [...parsed.warnings,`read ${a[0]} (${parsed.all().length} elements)`].join("\n"); }
  // 文件写入成功后才更新默认路径，并建立新的历史边界。
  private save(a: string[]): string { if (a.length > 1) throw new Error("usage: save [file.svg]"); const doc = this.editor.requireDocument(); const file = a[0] ? resolve(a[0]) : this.filePath; if (!file) throw new Error("usage: save <file.svg> (no previous read path)"); try { writeFileSync(file,doc.toSvg(),"utf8"); } catch { throw new Error(`cannot write file: ${a[0] ?? file}`); } this.editor.history.documentOperation(); this.filePath = file; return `saved to ${a[0] ?? file} (${doc.all().length} elements)`; }
  private canvas(a: string[]): string { const d = this.editor.requireDocument(); if (!a.length) return `canvas ${d.width}x${d.height}`; if (a.length !== 2) throw new Error("usage: canvas [w] [h]"); const width = SvgNumber.positive(a[0],"width"), height = SvgNumber.positive(a[1],"height"); d.resize(width, height); this.editor.history.documentOperation(); return `canvas set to ${d.width}x${d.height}`; }
  private create(a: string[]): string {
    if (a.length < 2) throw new Error("usage: create <type> <id> [params...] [in <containerId>]");
    // 只在尾部识别 in 子句，拆出父容器后再解析图形自身的参数。
    const type = a[0], id = a[1]; const inAt = a.length >= 2 && a[a.length-2] === "in" ? a.length-2 : -1; const parentId = inAt >= 0 ? a[inAt+1] : undefined; const p = inAt >= 0 ? a.slice(2,inAt) : a.slice(2);
    const d = this.editor.requireDocument(); if (d.find(id)) throw new Error(`id already exists: ${id}`);
    const shape = this.shapeFactory.createFromCommand(type, id, p);
    // 目标容器校验通过后才挂入树，并由文档登记整个子树的 id。
    let parent: Group = d.root; if(parentId){ const target=d.find(parentId); if(!target) throw new Error(`no such container: ${parentId}`); if(!target.isContainer()) throw new Error(`not a container: ${parentId}`); parent=target; }
    d.attach(shape,parent); return `${type}#${id} created${parentId?` in g#${parentId}`:""}`;
  }
  // 删除同时维护父子关系和 id 索引；容器的全部后代也需要注销。
  private delete(a:string[]):string { if(a.length!==1) throw new Error("usage: delete <id>"); const d=this.editor.requireDocument(), s=d.require(a[0]); d.delete(s); return `${s.type}#${s.id} deleted`; }
  private move(a:string[]):string { if(a.length!==3) throw new Error("usage: move <id> <dx> <dy>"); const s=this.editor.requireDocument().require(a[0]),dx=SvgNumber.fromCommand(a[1]),dy=SvgNumber.fromCommand(a[2]); s.move(dx,dy); return `${s.type}#${s.id} moved by (${dx},${dy})`; }
  private scale(a:string[]):string { if(a.length!==2) throw new Error("usage: scale <id> <factor>"); const f=SvgNumber.fromCommand(a[1]); if(f<=0) throw new Error("scale factor must be positive"); const s=this.editor.requireDocument().require(a[0]); s.scale(f); return `${s.type}#${s.id} scaled by ${f}`; }
  private set(a:string[]):string {
    if(a.length<3) throw new Error("usage: set <id> <attr> <value>"); const d=this.editor.requireDocument(),s=d.require(a[0]),key=a[1],value=a.slice(2).join(" ");
    const storedValue=s.setAttribute(key, value);
    const displayValue=key==="text"?JSON.stringify(storedValue):storedValue;
    return `${s.type}#${s.id} updated: ${key}=${displayValue}`;
  }
  // 排除祖先和后代同时收编的环风险，并按同级原顺序或用户参数顺序创建组合。
  private group(a:string[]):string {
    if(a.length<3) throw new Error("usage: group <newGid> <id1> <id2>...");
    const d=this.editor.requireDocument();
    if(d.find(a[0])) throw new Error(`id already exists: ${a[0]}`);
    const shapes=a.slice(1).map(id=>d.require(id));
    if(new Set(shapes).size!==shapes.length) throw new Error("duplicate group target");
    for(const shape of shapes) {
      if(shape.isContainer() && shapes.some(candidate=>candidate!==shape&&candidate.isDescendantOf(shape))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const locations=shapes.map(shape=>{
      const parent=shape.parent;
      if(!parent?.isContainer()) throw new Error(`shape is not attached: ${shape.id}`);
      return {shape,parent,index:parent.children.indexOf(shape)};
    });
    const sameParent=locations.every(location=>location.parent===locations[0].parent);
    const orderedLocations=sameParent?[...locations].sort((first,second)=>first.index-second.index):locations;
    const insertionParent=locations[0].parent;
    const insertionIndex=Math.min(...locations.filter(location=>location.parent===insertionParent).map(location=>location.index));
    const group=new Group(a[0]);
    for(const location of locations) location.parent.remove(location.shape);
    d.attach(group,insertionParent,insertionIndex);
    for(const location of orderedLocations) group.insert(location.shape);
    return `g#${group.id} created with ${shapes.length} children`;
  }
  // 只注销容器本身，子节点保留 id；逐个插回容器原位置以保持绘制顺序。
  private ungroup(a:string[]):string { if(a.length!==1) throw new Error("usage: ungroup <gid>"); const d=this.editor.requireDocument(),g=d.require(a[0]); if(!g.isContainer()) throw new Error(`not a container: ${g.id}`); if(g.parent===d.root) throw new Error(`cannot ungroup top-level container: ${g.id}`); const parent=g.parent as Group; let at=parent.children.indexOf(g); parent.remove(g); d.unregister(g); for(const child of [...g.children]) { g.remove(child); parent.insert(child,at++); } return `g#${g.id} ungrouped`; }
  // 当前守卫拒绝以自身或自身祖先为目标；通过后先摘除旧归属，再追加到目标末尾。
  private addto(a:string[]):string { if(a.length!==2) throw new Error("usage: addto <gid> <id>"); const d=this.editor.requireDocument(),target=d.require(a[0]),s=d.require(a[1]); if(!target.isContainer()) throw new Error(`not a container: ${target.id}`); if(target===s||target.isDescendantOf(s)) throw new Error(`cannot move container into its own descendant: ${target.id}`); if(!s.parent?.isContainer()) throw new Error(`shape is not attached: ${s.id}`); s.parent.remove(s); target.insert(s); return `${s.type}#${s.id} moved into g#${target.id}`; }
  // SVG 中后出现的同级元素绘制在前面，因此 front 对应数组末尾。
  private zorder(a:string[],front:boolean):string { if(a.length!==1) throw new Error(`usage: ${front?"front":"back"} <id>`); const s=this.editor.requireDocument().require(a[0]),p=s.parent as Group; p.remove(s); p.insert(s,front?p.children.length:0); return `${s.type}#${s.id} moved to ${front?"front":"back"}`; }
  private tree(a:string[]):string { const d=this.editor.requireDocument(); if(a.length>1) throw new Error("usage: tree [id]"); if(!a.length)return [`svg (${d.width}x${d.height})`,...(d.root.children.length ? ShapeTreeFormatter.formatChildren(d.root.children) : ["(empty canvas; try 'create rect r1 20 20 120 60 steelblue')"])].join("\n"); return ShapeTreeFormatter.format(d.require(a[0])); }
  private show(a:string[]):string { if(a.length!==1) throw new Error("usage: show <id>"); const s=this.editor.requireDocument().require(a[0]); const parent=s.parent?.id==="__svg_root__"?"svg":`${s.parent?.type}#${s.parent?.id}`; return [`${s.type}#${s.id}  parent=${parent}`,`  ${s.geometry()}`,...s.listAttributes().map(([k,v])=>`  ${k}=${v}`)].join("\n"); }
  /** 汇总帮助，或显示某条命令的语法和可直接回放的示例。 */
  private help(a: string[]): string { if (a.length > 1) throw new Error("usage: help [command]"); if (!a.length) return HELP; const detail = this.commands.get(a[0].toLowerCase())?.description; if (!detail) throw new Error(`unknown command: ${a[0]}. Type 'help' to list available commands.`); return detail; }
}
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
