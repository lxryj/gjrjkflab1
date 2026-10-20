import { Shape } from "./Shape";
export class Text extends Shape {
  readonly type = "text" as const;
  constructor(id: string, public x: number, public y: number, public content: string) { super(id); }
  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  scale(f: number): void { this.x *= f; this.y *= f; }
  geometry(): string { return `(${this.x},${this.y}) ${JSON.stringify(this.content)}`; }
  clone(): Text { const s = new Text(this.id, this.x, this.y, this.content); Object.assign(s.attributes, this.attributes); return s; }
}
