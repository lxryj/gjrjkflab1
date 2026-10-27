import { Shape } from "./Shape";
import type { ShapeType } from "./Shape";
/** Composite 容器：子节点的数组顺序也决定 SVG 的绘制先后顺序。 */
export class Group extends Shape {
  readonly type = "g" as const;
  private childrenRef: Shape[] = [];
  constructor(id: string) { super(id); }
  isContainer(): this is Group { return true; }
  // 只读视图限制外部直接增删数组；结构修改通过 insert/remove 同步父引用。
  get children(): readonly Shape[] { return this.childrenRef; }
  // 移动已有节点前，调用者负责先从旧父容器摘除。
  insert(shape: Shape, index = this.childrenRef.length): void { this.childrenRef.splice(index, 0, shape); shape.setParent(this); }
  remove(shape: Shape): number { const index = this.childrenRef.indexOf(shape); if (index >= 0) { this.childrenRef.splice(index, 1); shape.setParent(null); } return index; }
  // 本版直接更新后代几何坐标，不为 CLI 的整体移动新增 transform 属性。
  move(dx: number, dy: number): void { for (const child of this.childrenRef) child.move(dx, dy); }
  scale(f: number): void { for (const child of this.childrenRef) child.scale(f); }
  geometry(): string { return ""; }
  override treeAnnotation(): string {
    const kind = this.getAttribute("data-kind");
    return kind ? ` (${kind})` : "";
  }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return []; }
  override toSvg(indent: string): string {
    const start = `${indent}<g${this.serializeAttributes()}`;
    if (!this.childrenRef.length) return `${start}/>`;
    const children = this.childrenRef.map(child => `\n${child.toSvg(`${indent}  `)}`).join("");
    return `${start}>${children}\n${indent}</g>`;
  }
  loadSvgAttributes(attributes: Record<string, unknown>): void { super.importSvgAttributes(attributes, []); }
  // insert 会为克隆后的子节点建立新 parent，避免快照引用原来的图形树。
  clone(): Group { const group = this.copyAttributesTo(new Group(this.id)); for (const child of this.childrenRef) group.insert(child.clone()); return group; }
}
