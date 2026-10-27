import { Shape } from "./Shape";
import { SvgNumber } from "./SvgNumber";
/** 椭圆：cx/cy 为中心，rx/ry 分别为水平和垂直半径。 */
export class Ellipse extends Shape {
  readonly type = "ellipse" as const;
  constructor(id: string, private cxValue: number, private cyValue: number, private rxValue: number, private ryValue: number, fill?: string) { super(id); if (fill !== undefined) this.setAttribute("fill", fill); }
  static fromCommand(id: string, args: string[]): Ellipse {
    if (args.length < 4 || args.length > 5) throw new Error("usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]");
    return new Ellipse(id, SvgNumber.fromCommand(args[0]), SvgNumber.fromCommand(args[1]), SvgNumber.fromCommand(args[2]), SvgNumber.fromCommand(args[3]), args[4]);
  }
  static fromSvg(id: string, attrs: Record<string, unknown>): Ellipse {
    const ellipse = new Ellipse(id, SvgNumber.fromSvg(attrs.cx), SvgNumber.fromSvg(attrs.cy), SvgNumber.fromSvg(attrs.rx), SvgNumber.fromSvg(attrs.ry));
    ellipse.importSvgAttributes(attrs, ["cx", "cy", "rx", "ry"]);
    return ellipse;
  }
  get cx(): number { return this.cxValue; }
  get cy(): number { return this.cyValue; }
  get rx(): number { return this.rxValue; }
  get ry(): number { return this.ryValue; }
  move(dx: number, dy: number): void { this.cxValue += dx; this.cyValue += dy; }
  scale(f: number): void { this.cxValue *= f; this.cyValue *= f; this.rxValue *= f; this.ryValue *= f; }
  geometry(): string { return `cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`; }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return [["cx", String(this.cx)], ["cy", String(this.cy)], ["rx", String(this.rx)], ["ry", String(this.ry)]]; }
  protected setSpecificAttribute(name: string, value: string): boolean {
    if (name === "cx") this.cxValue = this.numberValue(name, value);
    else if (name === "cy") this.cyValue = this.numberValue(name, value);
    else if (name === "rx") this.rxValue = this.numberValue(name, value);
    else if (name === "ry") this.ryValue = this.numberValue(name, value);
    else return false;
    return true;
  }
  clone(): Ellipse { return this.copyAttributesTo(new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry)); }
  override toSvg(indent: string): string { return `${indent}<ellipse${this.serializeAttributes()}/>`; }
}
