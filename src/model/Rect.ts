import { Shape } from "./Shape";
export class Rect extends Shape {
  readonly type = "rect" as const;
  constructor(id: string, public x: number, public y: number, public width: number, public height: number, fill?: string) { super(id); if (fill !== undefined) this.attributes.fill = fill; }
  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  scale(f: number): void { this.x *= f; this.y *= f; this.width *= f; this.height *= f; }
  geometry(): string { return `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`; }
  clone(): Rect { const s = new Rect(this.id, this.x, this.y, this.width, this.height); Object.assign(s.attributes, this.attributes); return s; }
}
