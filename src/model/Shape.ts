export type ShapeType = "rect" | "circle" | "ellipse" | "line" | "text" | "g";

export abstract class Shape {
  private parentRef: Shape | null = null;
  readonly attributes: Record<string, string> = {};

  protected constructor(public readonly id: string) {}
  abstract readonly type: ShapeType;
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract geometry(): string;
  isContainer(): this is import("./Group").Group { return false; }
  get parent(): Shape | null { return this.parentRef; }
  setParent(parent: Shape | null): void { this.parentRef = parent; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getAttribute(name: string): string | undefined { return this.attributes[name]; }
  abstract clone(): Shape;
}
