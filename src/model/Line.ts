import { Shape } from "./Shape";
import { SvgNumber } from "./SvgNumber";
/** 线段：用两端点表示；可选颜色写入 stroke，而非 fill。 */
export class Line extends Shape {
  readonly type = "line" as const;
  constructor(id: string, private x1Value: number, private y1Value: number, private x2Value: number, private y2Value: number, stroke?: string) { super(id); if (stroke !== undefined) this.setAttribute("stroke", stroke); }
  static fromCommand(id: string, args: string[]): Line {
    if (args.length < 4 || args.length > 5) throw new Error("usage: create line <id> <x1> <y1> <x2> <y2> [stroke]");
    return new Line(id, SvgNumber.fromCommand(args[0]), SvgNumber.fromCommand(args[1]), SvgNumber.fromCommand(args[2]), SvgNumber.fromCommand(args[3]), args[4]);
  }
  static fromSvg(id: string, attrs: Record<string, unknown>): Line {
    const line = new Line(id, SvgNumber.fromSvg(attrs.x1), SvgNumber.fromSvg(attrs.y1), SvgNumber.fromSvg(attrs.x2), SvgNumber.fromSvg(attrs.y2));
    line.importSvgAttributes(attrs, ["x1", "y1", "x2", "y2"]);
    return line;
  }
  get x1(): number { return this.x1Value; }
  get y1(): number { return this.y1Value; }
  get x2(): number { return this.x2Value; }
  get y2(): number { return this.y2Value; }
  move(dx: number, dy: number): void { this.x1Value += dx; this.y1Value += dy; this.x2Value += dx; this.y2Value += dy; }
  scale(f: number): void { this.x1Value *= f; this.y1Value *= f; this.x2Value *= f; this.y2Value *= f; }
  geometry(): string { return `(${this.x1},${this.y1}) -> (${this.x2},${this.y2})`; }
  protected geometryAttributes(): readonly (readonly [string, string])[] { return [["x1", String(this.x1)], ["y1", String(this.y1)], ["x2", String(this.x2)], ["y2", String(this.y2)]]; }
  protected setSpecificAttribute(name: string, value: string): boolean {
    if (name === "x1") this.x1Value = this.numberValue(name, value);
    else if (name === "y1") this.y1Value = this.numberValue(name, value);
    else if (name === "x2") this.x2Value = this.numberValue(name, value);
    else if (name === "y2") this.y2Value = this.numberValue(name, value);
    else return false;
    return true;
  }
  clone(): Line { return this.copyAttributesTo(new Line(this.id, this.x1, this.y1, this.x2, this.y2)); }
  override toSvg(indent: string): string { return `${indent}<line${this.serializeAttributes()}/>`; }
}
