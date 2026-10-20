import { Shape } from "./Shape";
/** 矩形：x/y 表示左上角，width/height 表示宽高，单位均为 px。 */
export class Rect extends Shape {
  readonly type = "rect" as const;
  constructor(id: string, public x: number, public y: number, public width: number, public height: number, fill?: string) { super(id); if (fill !== undefined) this.attributes.fill = fill; }
  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  scale(f: number): void { this.x *= f; this.y *= f; this.width *= f; this.height *= f; }
  geometry(): string { return `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`; }
  // 属性字典需单独复制，避免撤销快照与当前图形共用可变对象。
  clone(): Rect { const s = new Rect(this.id, this.x, this.y, this.width, this.height); Object.assign(s.attributes, this.attributes); return s; }
}
