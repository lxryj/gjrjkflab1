import { XMLParser } from "fast-xml-parser";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Group } from "./Group";
import { Line } from "./Line";
import { Rect } from "./Rect";
import { Shape } from "./Shape";
import { Text } from "./Text";

export class SvgDocument {
  private rootRef = new Group("__svg_root__");
  private index = new Map<string, Shape>();
  private warningList: string[] = [];
  constructor(public width = 800, public height = 600) {}
  get root(): Group { return this.rootRef; }
  get warnings(): readonly string[] { return this.warningList; }
  find(id: string): Shape | undefined { return this.index.get(id); }
  require(id: string): Shape { const shape = this.find(id); if (!shape) throw new Error(`no such shape: ${id}`); return shape; }
  register(shape: Shape): void { if (shape.id === "__svg_root__" || this.index.has(shape.id)) throw new Error(`id already exists: ${shape.id}`); this.index.set(shape.id, shape); }
  unregisterTree(shape: Shape): void { if (shape.isContainer()) for (const child of shape.children) this.unregisterTree(child); this.index.delete(shape.id); }
  unregister(shape: Shape): void { this.index.delete(shape.id); }
  all(): Shape[] { return [...this.index.values()]; }
  clear(width = 800, height = 600): void { this.width = width; this.height = height; this.rootRef = new Group("__svg_root__"); this.index.clear(); this.warningList = []; }
  clone(): SvgDocument { const copy = new SvgDocument(this.width, this.height); for (const child of this.root.children) copy.attach(child.clone(), copy.root); return copy; }
  attach(shape: Shape, parent: Group, index = parent.children.length): void { const add = (item: Shape) => { this.register(item); if (item.isContainer()) for (const child of item.children) add(child); }; add(shape); parent.insert(shape, index); }
  replaceFrom(other: SvgDocument): void { this.width = other.width; this.height = other.height; this.rootRef = other.rootRef; this.index = other.index; this.warningList = [...other.warningList]; }
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
  static fromSvg(xml: string): SvgDocument {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text", parseTagValue: false, trimValues: false });
    const data = parser.parse(xml) as Record<string, any>;
    const svg = data.svg;
    if (!svg || typeof svg !== "object") throw new Error("invalid SVG document");
    const doc = new SvgDocument(num(svg.width, 800), num(svg.height, 600));
    const reservedIds = new Set<string>();
    const collectIds = (node: unknown): void => { if (!node || typeof node !== "object") return; const record = node as Record<string, unknown>; if (typeof record.id === "string") reservedIds.add(record.id); for (const [key,value] of Object.entries(record)) if (["rect","circle","ellipse","line","text","g"].includes(key)) for (const child of Array.isArray(value) ? value : [value]) collectIds(child); };
    collectIds(svg);
    let auto = 0;
    const parseShape = (tag: string, raw: any): Shape | undefined => {
      if (!["rect", "circle", "ellipse", "line", "text", "g"].includes(tag)) return undefined;
      const attrs = raw && typeof raw === "object" ? raw : {};
      let id = String(attrs.id ?? "");
      if (!id) { do { id = `${tag}${++auto}`; } while (reservedIds.has(id) || doc.find(id)); reservedIds.add(id); doc.warningList.push(`warning: assigned id ${id} to unnamed <${tag}>`); }
      const n = (key: string, fallback = 0) => num(attrs[key], fallback);
      const shape: Shape = tag === "rect" ? new Rect(id,n("x"),n("y"),n("width"),n("height")) : tag === "circle" ? new Circle(id,n("cx"),n("cy"),n("r")) : tag === "ellipse" ? new Ellipse(id,n("cx"),n("cy"),n("rx"),n("ry")) : tag === "line" ? new Line(id,n("x1"),n("y1"),n("x2"),n("y2")) : tag === "text" ? new Text(id,n("x"),n("y"),String(attrs["#text"] ?? "")) : new Group(id);
      for (const [key,value] of Object.entries(attrs)) if (key !== "id" && key !== "#text" && key !== "xmlns") shape.setAttribute(key, String(value));
      if (shape.isContainer()) for (const [childTag, childValue] of Object.entries(attrs)) if (["rect","circle","ellipse","line","text","g"].includes(childTag)) for (const item of Array.isArray(childValue) ? childValue : [childValue]) { const child = parseShape(childTag, item); if (child) shape.insert(child); }
      return shape;
    };
    for (const [tag, value] of Object.entries(svg)) if (["rect","circle","ellipse","line","text","g"].includes(tag)) for (const item of Array.isArray(value) ? value : [value]) { const shape = parseShape(tag,item); if (shape) doc.attach(shape,doc.root); }
    return doc;
  }
}
function num(value: unknown, fallback: number): number { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function escapeXml(value: string): string { return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
