import { Shape } from "./Shape";
/** 线段：用两端点表示；可选颜色写入 stroke，而非 fill。 */
export class Line extends Shape {
  readonly type = "line" as const;
  constructor(id: string, public x1: number, public y1: number, public x2: number, public y2: number, stroke?: string) { super(id); if (stroke !== undefined) this.attributes.stroke = stroke; }
  move(dx: number, dy: number): void { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  scale(f: number): void { this.x1 *= f; this.y1 *= f; this.x2 *= f; this.y2 *= f; }
  geometry(): string { return `(${this.x1},${this.y1}) -> (${this.x2},${this.y2})`; }
  clone(): Line { const s = new Line(this.id, this.x1, this.y1, this.x2, this.y2); Object.assign(s.attributes, this.attributes); return s; }
}
