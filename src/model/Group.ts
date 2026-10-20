import { Shape } from "./Shape";
import type { ShapeType } from "./Shape";
export class Group extends Shape {
  readonly type = "g" as const;
  private childrenRef: Shape[] = [];
  constructor(id: string) { super(id); }
  isContainer(): this is Group { return true; }
  get children(): readonly Shape[] { return this.childrenRef; }
  insert(shape: Shape, index = this.childrenRef.length): void { this.childrenRef.splice(index, 0, shape); shape.setParent(this); }
  remove(shape: Shape): number { const index = this.childrenRef.indexOf(shape); if (index >= 0) { this.childrenRef.splice(index, 1); shape.setParent(null); } return index; }
  move(dx: number, dy: number): void { for (const child of this.childrenRef) child.move(dx, dy); }
  scale(f: number): void { for (const child of this.childrenRef) child.scale(f); }
  geometry(): string { return ""; }
  clone(): Group { const group = new Group(this.id); Object.assign(group.attributes, this.attributes); for (const child of this.childrenRef) group.insert(child.clone()); return group; }
}
