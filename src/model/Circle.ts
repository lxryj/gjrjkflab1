import { Shape } from "./Shape";
import { SvgNumber } from "./SvgNumber";
/** 圆：cx/cy 为圆心，r 为半径；缩放时圆心和半径一起变化。 */
export class Circle extends Shape {
  readonly type = "circle" as const;
  constructor(id: string, private cxValue: number, private cyValue: number, private radiusValue: number, fill?: string) { super(id); if (fill !== undefined) this.setAttribute("fill", fill); }
  static fromCommand(id: string, args: string[]): Circle {
    if (args.length < 3 || args.length > 4) throw new Error("usage: create circle <id> <cx> <cy> <r> [fill]");
    return new Circle(id, SvgNumber.fromCommand(args[0]), SvgNumber.fromCommand(args[1]), SvgNumber.fromCommand(args[2]), args[3]);
  }
  static fromSvg(id: string, attrs: Record<string, unknown>): Circle {
    const circle = new Circle(id, SvgNumber.fromSvg(attrs.cx), SvgNumber.fromSvg(attrs.cy), SvgNumber.fromSvg(attrs.r));
    circle.importSvgAttributes(attrs, ["cx", "cy", "r"]);
    return circle;
  }
  get cx(): number { return this.cxValue; }
  get cy(): number { return this.cyValue; }
  get r(): number { return this.radiusValue; }
  move(dx: number, dy: number): void { this.cxValue += dx; this.cyValue += dy; }
  scale(f: number): void { this.cxValue *= f; this.cyValue *= f; this.radiusValue *= f; }
  geometry(): string { return `cx=${this.cx} cy=${this.cy} r=${this.r}`; }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return [["cx", String(this.cx)], ["cy", String(this.cy)], ["r", String(this.r)]]; }
  protected setSpecificAttribute(name: string, value: string): boolean {
    if (name === "cx") this.cxValue = this.numberValue(name, value);
    else if (name === "cy") this.cyValue = this.numberValue(name, value);
    else if (name === "r") this.radiusValue = this.numberValue(name, value);
    else return false;
    return true;
  }
  clone(): Circle { return this.copyAttributesTo(new Circle(this.id, this.cx, this.cy, this.r)); }
  override toSvg(indent: string): string { return `${indent}<circle${this.serializeAttributes()}/>`; }
}
