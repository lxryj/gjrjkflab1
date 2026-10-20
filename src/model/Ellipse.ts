import { Shape } from "./Shape";
/** 椭圆：cx/cy 为中心，rx/ry 分别为水平和垂直半径。 */
export class Ellipse extends Shape {
  readonly type = "ellipse" as const;
  constructor(id: string, public cx: number, public cy: number, public rx: number, public ry: number, fill?: string) { super(id); if (fill !== undefined) this.attributes.fill = fill; }
  move(dx: number, dy: number): void { this.cx += dx; this.cy += dy; }
  scale(f: number): void { this.cx *= f; this.cy *= f; this.rx *= f; this.ry *= f; }
  geometry(): string { return `cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`; }
  clone(): Ellipse { const s = new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry); Object.assign(s.attributes, this.attributes); return s; }
}
