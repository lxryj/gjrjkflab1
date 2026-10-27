import { Shape } from "./Shape";
import { SvgNumber } from "./SvgNumber";
/** 矩形：x/y 表示左上角，width/height 表示宽高，单位均为 px。 */
export class Rect extends Shape {
  readonly type = "rect" as const;
  constructor(id: string, private xValue: number, private yValue: number, private widthValue: number, private heightValue: number, fill?: string) { super(id); if (fill !== undefined) this.setAttribute("fill", fill); }
  static fromCommand(id: string, args: string[]): Rect {
    if (args.length < 4 || args.length > 5) throw new Error("usage: create rect <id> <x> <y> <w> <h> [fill]");
    return new Rect(id, SvgNumber.fromCommand(args[0]), SvgNumber.fromCommand(args[1]), SvgNumber.fromCommand(args[2]), SvgNumber.fromCommand(args[3]), args[4]);
  }
  static fromSvg(id: string, attrs: Record<string, unknown>): Rect {
    const rect = new Rect(id, SvgNumber.fromSvg(attrs.x), SvgNumber.fromSvg(attrs.y), SvgNumber.fromSvg(attrs.width), SvgNumber.fromSvg(attrs.height));
    rect.importSvgAttributes(attrs, ["x", "y", "width", "height"]);
    return rect;
  }
  get x(): number { return this.xValue; }
  get y(): number { return this.yValue; }
  get width(): number { return this.widthValue; }
  get height(): number { return this.heightValue; }
  move(dx: number, dy: number): void { this.xValue += dx; this.yValue += dy; }
  scale(f: number): void { this.xValue *= f; this.yValue *= f; this.widthValue *= f; this.heightValue *= f; }
  geometry(): string { return `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`; }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return [["x", String(this.x)], ["y", String(this.y)], ["width", String(this.width)], ["height", String(this.height)]]; }
  protected setSpecificAttribute(name: string, value: string): boolean {
    if (name === "x") this.xValue = this.numberValue(name, value);
    else if (name === "y") this.yValue = this.numberValue(name, value);
    else if (name === "width") this.widthValue = this.numberValue(name, value);
    else if (name === "height") this.heightValue = this.numberValue(name, value);
    else return false;
    return true;
  }
  // 属性字典需单独复制，避免撤销快照与当前图形共用可变对象。
  clone(): Rect { return this.copyAttributesTo(new Rect(this.id, this.x, this.y, this.width, this.height)); }
  override toSvg(indent: string): string { return `${indent}<rect${this.serializeAttributes()}/>`; }
}
