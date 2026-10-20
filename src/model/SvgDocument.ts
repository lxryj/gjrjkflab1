import { XMLParser } from "fast-xml-parser";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Group } from "./Group";
import { Line } from "./Line";
import { Rect } from "./Rect";
import { Shape } from "./Shape";
import { Text } from "./Text";

/** 同时维护有序图形树与 id 索引，并负责支持的 SVG 子集的读写。 */
export class SvgDocument {
  // 内部虚拟根承载画布直接子节点；序列化时输出为 svg，而非普通 g。
  private rootRef = new Group("__svg_root__");
  private index = new Map<string, Shape>();
  private warningList: string[] = [];
  constructor(public width = 800, public height = 600) {}
  get root(): Group { return this.rootRef; }
  get warnings(): readonly string[] { return this.warningList; }
  find(id: string): Shape | undefined { return this.index.get(id); }
  require(id: string): Shape { const shape = this.find(id); if (!shape) throw new Error(`no such shape: ${id}`); return shape; }
  register(shape: Shape): void { if (shape.id === "__svg_root__" || this.index.has(shape.id)) throw new Error(`id already exists: ${shape.id}`); this.index.set(shape.id, shape); }
  /** 删除整棵子树的索引；父容器中的结构摘除由调用者负责。 */
  unregisterTree(shape: Shape): void { if (shape.isContainer()) for (const child of shape.children) this.unregisterTree(child); this.index.delete(shape.id); }
  /** 仅注销该节点，供 ungroup 使用，以保留子节点的寻址能力。 */
  unregister(shape: Shape): void { this.index.delete(shape.id); }
  all(): Shape[] { return [...this.index.values()]; }
  clear(width = 800, height = 600): void { this.width = width; this.height = height; this.rootRef = new Group("__svg_root__"); this.index.clear(); this.warningList = []; }
  // 从新树重新登记索引，使历史快照与当前文档不共享图形实例。
  clone(): SvgDocument { const copy = new SvgDocument(this.width, this.height); for (const child of this.root.children) copy.attach(child.clone(), copy.root); return copy; }
  // 登记整个子树后挂入父容器；只移动已有节点时使用 Group 操作，避免重复登记。
  attach(shape: Shape, parent: Group, index = parent.children.length): void { const add = (item: Shape) => { this.register(item); if (item.isContainer()) for (const child of item.children) add(child); }; add(shape); parent.insert(shape, index); }
  // 直接接管另一文档的树和索引（共享引用）；独立快照应使用 clone。
  replaceFrom(other: SvgDocument): void { this.width = other.width; this.height = other.height; this.rootRef = other.rootRef; this.index = other.index; this.warningList = [...other.warningList]; }
  /** 将当前图形树递归输出为 XML，并转义 id、属性及文本中的特殊字符。 */
  toSvg(): string {
    const attrs = (s: Shape) => Object.entries(s.attributes).map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join("");
    const render = (s: Shape, depth: number): string => {
      const pad = "  ".repeat(depth);
      if (s.isContainer()) return s.children.length ? `${pad}<g id="${escapeXml(s.id)}"${attrs(s)}>` + s.children.map(c => `\n${render(c, depth + 1)}`).join("") + `\n${pad}</g>` : `${pad}<g id="${escapeXml(s.id)}"${attrs(s)}/>`;
      const values: Record<string, string> = s instanceof Rect ? { x: String(s.x), y: String(s.y), width: String(s.width), height: String(s.height) } : s instanceof Circle ? { cx: String(s.cx), cy: String(s.cy), r: String(s.r) } : s instanceof Ellipse ? { cx: String(s.cx), cy: String(s.cy), rx: String(s.rx), ry: String(s.ry) } : s instanceof Line ? { x1: String(s.x1), y1: String(s.y1), x2: String(s.x2), y2: String(s.y2) } : s instanceof Text ? { x: String(s.x), y: String(s.y) } : {};
      const base = `${pad}<${s.type} id="${escapeXml(s.id)}"${Object.entries(values).map(([k,v]) => ` ${k}="${v}"`).join("")}${attrs(s)}`;
      return s instanceof Text ? `${base}>${escapeXml(s.content)}</text>` : `${base}/>`;
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">\n${this.root.children.map(s => render(s, 1)).join("\n")}\n</svg>\n`;
  }
  /** 读入六种内置图形；当前解析路径只遍历支持的标签，尚非完整 SVG 导入器。 */
  static fromSvg(xml: string): SvgDocument {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text", parseTagValue: false, trimValues: false });
    const data = parser.parse(xml) as Record<string, any>;
    const svg = data.svg;
    if (!svg || typeof svg !== "object") throw new Error("invalid SVG document");
    const doc = new SvgDocument(num(svg.width, 800), num(svg.height, 600));
    // 预先收集显式 id，避免自动命名与文件中稍后才出现的 id 冲突。
    const reservedIds = new Set<string>();
    const collectIds = (node: unknown): void => { if (!node || typeof node !== "object") return; const record = node as Record<string, unknown>; if (typeof record.id === "string") reservedIds.add(record.id); for (const [key,value] of Object.entries(record)) if (["rect","circle","ellipse","line","text","g"].includes(key)) for (const child of Array.isArray(value) ? value : [value]) collectIds(child); };
    collectIds(svg);
    // 本版使用跨类型共享的递增序号，并以标签名作为自动 id 的前缀。
    let auto = 0;
    const parseShape = (tag: string, raw: any): Shape | undefined => {
      if (!["rect", "circle", "ellipse", "line", "text", "g"].includes(tag)) return undefined;
      const attrs = raw && typeof raw === "object" ? raw : {};
      let id = String(attrs.id ?? "");
      if (!id) { do { id = `${tag}${++auto}`; } while (reservedIds.has(id) || doc.find(id)); reservedIds.add(id); doc.warningList.push(`warning: assigned id ${id} to unnamed <${tag}>`); }
      const n = (key: string, fallback = 0) => num(attrs[key], fallback);
      const shape: Shape = tag === "rect" ? new Rect(id,n("x"),n("y"),n("width"),n("height")) : tag === "circle" ? new Circle(id,n("cx"),n("cy"),n("r")) : tag === "ellipse" ? new Ellipse(id,n("cx"),n("cy"),n("rx"),n("ry")) : tag === "line" ? new Line(id,n("x1"),n("y1"),n("x2"),n("y2")) : tag === "text" ? new Text(id,n("x"),n("y"),String(attrs["#text"] ?? "")) : new Group(id);
      for (const [key,value] of Object.entries(attrs)) if (key !== "id" && key !== "#text" && key !== "xmlns") shape.setAttribute(key, String(value));
      // 子节点先形成树，等顶层 attach 时再统一登记索引。
      if (shape.isContainer()) for (const [childTag, childValue] of Object.entries(attrs)) if (["rect","circle","ellipse","line","text","g"].includes(childTag)) for (const item of Array.isArray(childValue) ? childValue : [childValue]) { const child = parseShape(childTag, item); if (child) shape.insert(child); }
      return shape;
    };
    for (const [tag, value] of Object.entries(svg)) if (["rect","circle","ellipse","line","text","g"].includes(tag)) for (const item of Array.isArray(value) ? value : [value]) { const shape = parseShape(tag,item); if (shape) doc.attach(shape,doc.root); }
    return doc;
  }
}
// 导入时数值缺省或无法转换时使用默认值。
function num(value: unknown, fallback: number): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
// 必须先替换 &，否则后续生成的实体（如 &lt;）会被二次转义。
function escapeXml(value: string): string { return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
