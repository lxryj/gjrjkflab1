import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Group } from "./Group";
import { Shape } from "./Shape";
import { ShapeFactory } from "./ShapeFactory";
import { SvgNumber } from "./SvgNumber";

interface OrderedSvgNode {
  readonly [name: string]: unknown;
  readonly ':@'?: Record<string, unknown>;
}

/** 文档状态、图形索引及 SVG 边界；图形本身负责各自的 XML 序列化。 */
export class SvgDocument {
  private static readonly defaultWidth = 800;
  private static readonly defaultHeight = 600;
  private rootRef = new Group("__svg_root__");
  private readonly index = new Map<string, Shape>();
  private warningList: string[] = [];
  private autoIdSequence = 0;
  private readonly shapeFactory = new ShapeFactory();
  private widthValue: number;
  private heightValue: number;

  constructor(width = 800, height = 600) { this.widthValue = width; this.heightValue = height; }
  get width(): number { return this.widthValue; }
  get height(): number { return this.heightValue; }
  get root(): Group { return this.rootRef; }
  get warnings(): readonly string[] { return [...this.warningList]; }

  resize(width: number, height: number): void { this.widthValue = width; this.heightValue = height; }
  find(id: string): Shape | undefined { return this.index.get(id); }
  require(id: string): Shape { const shape = this.find(id); if (!shape) throw new Error(`no such shape: ${id}`); return shape; }
  register(shape: Shape): void { if (shape.id === "__svg_root__" || this.index.has(shape.id)) throw new Error(`id already exists: ${shape.id}`); this.index.set(shape.id, shape); }
  unregister(shape: Shape): void { this.index.delete(shape.id); }
  unregisterTree(shape: Shape): void { if (shape.isContainer()) for (const child of shape.children) this.unregisterTree(child); this.unregister(shape); }
  delete(shape: Shape): void {
    const parent = shape.parent;
    if (!parent?.isContainer()) throw new Error(`shape is not attached: ${shape.id}`);
    parent.remove(shape);
    this.unregisterTree(shape);
  }
  all(): Shape[] { return [...this.index.values()]; }

  clear(width = 800, height = 600): void { this.resize(width, height); this.rootRef = new Group("__svg_root__"); this.index.clear(); this.warningList = []; }
  clone(): SvgDocument { const copy = new SvgDocument(this.width, this.height); for (const child of this.root.children) copy.attach(child.clone(), copy.root); copy.warningList = [...this.warningList]; return copy; }
  attach(shape: Shape, parent: Group, index = parent.children.length): void { this.registerTree(shape); parent.insert(shape, index); }
  private registerTree(shape: Shape): void { this.register(shape); if (shape.isContainer()) for (const child of shape.children) this.registerTree(child); }
  replaceFrom(other: SvgDocument): void {
    this.widthValue = other.width;
    this.heightValue = other.height;
    this.rootRef = other.rootRef;
    this.index.clear();
    for (const shape of other.all()) this.index.set(shape.id, shape);
    this.warningList = [...other.warningList];
  }

  toSvg(): string {
    const children = this.root.children.map(shape => shape.toSvg("  ")).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">\n${children}\n</svg>\n`;
  }

  static fromSvg(xml: string): SvgDocument {
    const validation = XMLValidator.validate(xml);
    if (validation !== true) throw new Error("invalid SVG document");

    const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text", parseTagValue: false, trimValues: false });
    const nodes = parser.parse(xml) as OrderedSvgNode[];
    const rootNode = nodes.find(node => Object.hasOwn(node, "svg"));
    if (!rootNode || !Array.isArray(rootNode.svg)) throw new Error("invalid SVG document");
    const rootAttributes = rootNode[':@'] ?? {};
    const document = new SvgDocument(
      SvgNumber.fromSvg(rootAttributes.width, SvgDocument.defaultWidth),
      SvgNumber.fromSvg(rootAttributes.height, SvgDocument.defaultHeight),
    );
    const reservedIds = new Set<string>();
    document.collectExplicitIds(rootNode.svg, reservedIds);
    for (const node of rootNode.svg) {
      const shape = document.buildSvgNode(node, reservedIds);
      if (shape) document.attach(shape, document.root);
    }
    return document;
  }

  private collectExplicitIds(nodes: readonly OrderedSvgNode[], reservedIds: Set<string>): void {
    for (const node of nodes) {
      const tag = this.nodeTag(node);
      if (!tag) continue;
      const attributes = node[':@'] ?? {};
      if (typeof attributes.id === "string") reservedIds.add(attributes.id);
      const children = node[tag];
      if (Array.isArray(children)) this.collectExplicitIds(children as OrderedSvgNode[], reservedIds);
    }
  }

  private buildSvgNode(node: OrderedSvgNode, reservedIds: Set<string>): Shape | undefined {
    const tag = this.nodeTag(node);
    if (!tag || !this.shapeFactory.supports(tag)) return undefined;

    const attributes = { ...(node[':@'] ?? {}) };
    let id = String(attributes.id ?? "");
    if (!id) {
      do { id = `${tag}${++this.autoIdSequence}`; } while (reservedIds.has(id) || this.index.has(id));
      reservedIds.add(id);
      this.warningList.push(`warning: assigned id ${id} to unnamed <${tag}>`);
    }

    const childNodes = node[tag];
    const shape = this.shapeFactory.createFromSvg(
      tag,
      id,
      attributes,
      Array.isArray(childNodes) ? this.collectText(childNodes as OrderedSvgNode[]) : "",
    );
    if (shape.isContainer() && Array.isArray(childNodes)) {
      for (const childNode of childNodes as OrderedSvgNode[]) {
        const child = this.buildSvgNode(childNode, reservedIds);
        if (child) shape.insert(child);
      }
    }
    return shape;
  }

  private nodeTag(node: OrderedSvgNode): string | undefined { return Object.keys(node).find(name => name !== ":@" && name !== "#text"); }

  private collectText(nodes: readonly OrderedSvgNode[]): string {
    let content = "";
    for (const node of nodes) if (typeof node["#text"] === "string") content += node["#text"];
    return content;
  }
}
