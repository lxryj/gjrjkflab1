import { Shape } from "./Shape";
import { SvgNumber } from "./SvgNumber";
/** 文本：x/y 是 SVG 文本定位点，content 序列化为元素内的文本内容。 */
export class Text extends Shape {
  readonly type = "text" as const;
  constructor(id: string, private xValue: number, private yValue: number, private contentValue: string) { super(id); }
  static fromCommand(id: string, args: string[]): Text {
    if (args.length !== 3) throw new Error("usage: create text <id> <x> <y> \"content\"");
    return new Text(id, SvgNumber.fromCommand(args[0]), SvgNumber.fromCommand(args[1]), args[2]);
  }
  static fromSvg(id: string, attrs: Record<string, unknown>, content = ""): Text {
    const text = new Text(id, SvgNumber.fromSvg(attrs.x), SvgNumber.fromSvg(attrs.y), content);
    text.importSvgAttributes(attrs, ["x", "y"]);
    return text;
  }
  get x(): number { return this.xValue; }
  get y(): number { return this.yValue; }
  get content(): string { return this.contentValue; }
  move(dx: number, dy: number): void { this.xValue += dx; this.yValue += dy; }
  // 本阶段 text 的几何白名单只有 x/y，因此缩放仅调整定位点。
  scale(f: number): void { this.xValue *= f; this.yValue *= f; }
  geometry(): string { return `(${this.x},${this.y}) ${JSON.stringify(this.content)}`; }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return [["x", String(this.x)], ["y", String(this.y)]]; }
  protected setSpecificAttribute(name: string, value: string): boolean {
    if (name === "x") this.xValue = this.numberValue(name, value);
    else if (name === "y") this.yValue = this.numberValue(name, value);
    else if (name === "text") this.contentValue = value;
    else return false;
    return true;
  }
  protected override specificAttributeValue(name: string): string | undefined {
    return name === "text" ? this.contentValue : super.specificAttributeValue(name);
  }
  clone(): Text { return this.copyAttributesTo(new Text(this.id, this.x, this.y, this.content)); }
  override toSvg(indent: string): string { return `${indent}<text${this.serializeAttributes()}>${this.escapeXml(this.content)}</text>`; }
}
