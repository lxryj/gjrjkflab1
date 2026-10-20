import { Shape } from "./Shape";
export class Circle extends Shape {
  readonly type = "circle" as const;
  constructor(id: string, public cx: number, public cy: number, public r: number, fill?: string) { super(id); if (fill !== undefined) this.attributes.fill = fill; }
  move(dx: number, dy: number): void { this.cx += dx; this.cy += dy; }
  scale(f: number): void { this.cx *= f; this.cy *= f; this.r *= f; }
  geometry(): string { return `cx=${this.cx} cy=${this.cy} r=${this.r}`; }
  clone(): Circle { const s = new Circle(this.id, this.cx, this.cy, this.r); Object.assign(s.attributes, this.attributes); return s; }
}
