export type ShapeType = "rect" | "circle" | "ellipse" | "line" | "text" | "g";

/** 叶子图形和容器的公共协议，使调用者能够统一移动、缩放和克隆。 */
export abstract class Shape {
  private parentRef: Shape | null = null;
  // 通用 SVG 属性（如 fill、stroke）；各子类的几何参数另存为数值字段。
  readonly attributes: Record<string, string> = {};

  protected constructor(public readonly id: string) {}
  abstract readonly type: ShapeType;
  abstract move(dx: number, dy: number): void;
  /** 按画布原点等比缩放位置与尺寸，区别于只改变自身大小。 */
  abstract scale(factor: number): void;
  /** CLI 的几何属性摘要，由具体图形决定显示内容。 */
  abstract geometry(): string;
  // 类型守卫帮助调用者安全访问 Group 的子节点操作。
  isContainer(): this is import("./Group").Group { return false; }
  get parent(): Shape | null { return this.parentRef; }
  setParent(parent: Shape | null): void { this.parentRef = parent; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  getAttribute(name: string): string | undefined { return this.attributes[name]; }
  /** 复制自身状态；容器还须复制全部后代，不沿 parent 反向复制。 */
  abstract clone(): Shape;
}
