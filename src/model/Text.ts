import { Shape } from "./Shape";
/** 文本：x/y 是 SVG 文本定位点，content 序列化为元素内的文本内容。 */
export class Text extends Shape {
  readonly type = "text" as const;
  constructor(id: string, public x: number, public y: number, public content: string) { super(id); }
  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  // 本阶段 text 的几何白名单只有 x/y，因此缩放仅调整定位点。
  scale(f: number): void { this.x *= f; this.y *= f; }
  geometry(): string { return `(${this.x},${this.y}) ${JSON.stringify(this.content)}`; }
  clone(): Text { const s = new Text(this.id, this.x, this.y, this.content); Object.assign(s.attributes, this.attributes); return s; }
}
