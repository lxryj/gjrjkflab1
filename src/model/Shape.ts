export type ShapeType = "rect" | "circle" | "ellipse" | "line" | "text" | "g";

/** 叶子图形和容器的公共协议，使调用者能够统一移动、缩放和克隆。 */
export abstract class Shape {
  private parentRef: Shape | null = null;
  // SVG 样式及额外属性不对外暴露可变字典；几何状态由各具体图形封装。
  private readonly attributesRef = new Map<string, string>();

  protected constructor(public readonly id: string) {
    if (!id) throw new Error("id must not be empty");
  }
  abstract readonly type: ShapeType;
  abstract move(dx: number, dy: number): void;
  /** 按画布原点等比缩放位置与尺寸，区别于只改变自身大小。 */
  abstract scale(factor: number): void;
  /** CLI 的几何摘要由具体图形决定，属性设置和序列化也通过多态处理。 */
  abstract geometry(): string;
  protected abstract geometryAttributes(): readonly (readonly [string, string])[];
  // 类型守卫帮助调用者安全访问 Group 的子节点操作。
  isContainer(): this is import("./Group").Group { return false; }
  get parent(): Shape | null { return this.parentRef; }
  setParent(parent: Shape | null): void { this.parentRef = parent; }
  isDescendantOf(ancestor: Shape): boolean { for (let current = this.parentRef; current; current = current.parentRef) if (current === ancestor) return true; return false; }
  setAttribute(name: string, value: string): string {
    if (name === "fill" || name === "stroke" || name === "stroke-width") { this.attributesRef.set(name, value); return value; }
    if (this.setSpecificAttribute(name, value)) return this.specificAttributeValue(name) ?? value;
    throw new Error(`unknown attribute: ${name}`);
  }
  /** SVG 导入保留编辑器不解释的属性；已知几何属性仍由具体图形写入封装字段。 */
  importAttribute(name: string, value: string): void {
    if (name === "fill" || name === "stroke" || name === "stroke-width") this.attributesRef.set(name, value);
    else if (!this.setSpecificAttribute(name, value)) this.attributesRef.set(name, value);
  }
  importSvgAttributes(attributes: Record<string, unknown>, geometryNames: readonly string[]): void {
    const geometry = new Set(geometryNames);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === "id" || name === "xmlns" || name === "#text" || geometry.has(name)) continue;
      this.importAttribute(name, String(value));
    }
  }
  getAttribute(name: string): string | undefined { return this.attributesRef.get(name); }
  listAttributes(): readonly (readonly [string, string])[] { return [...this.attributesRef.entries()]; }
  treeAnnotation(): string { return ""; }
  protected setSpecificAttribute(_name: string, _value: string): boolean { return false; }
  protected specificAttributeValue(name: string): string | undefined {
    return this.geometryAttributes().find(([attribute]) => attribute === name)?.[1];
  }
  protected numberValue(_name: string, value: string): number { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`invalid number: ${value}`); return parsed; }
  protected serializeAttributes(): string {
    const entries: (readonly [string, string])[] = [["id", this.id], ...this.geometryAttributes(), ...this.attributesRef.entries()];
    return entries.map(([name, value]) => ` ${name}="${this.escapeXml(value)}"`).join("");
  }
  protected escapeXml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
  toSvg(indent: string): string { return `${indent}<${this.type}${this.serializeAttributes()}/>`; }
  protected copyAttributesTo<T extends Shape>(copy: T): T { for (const [name, value] of this.attributesRef) copy.attributesRef.set(name, value); return copy; }
  /** 复制自身状态；容器还须复制全部后代，不沿 parent 反向复制。 */
  abstract clone(): Shape;
}
