import { Shape } from "./model/Shape";

/** 将有序图形组合格式化为 CLI 的 tree 输出，不依赖具体叶子类型。 */
export class ShapeTreeFormatter {
  static format(shape: Shape): string {
    return this.formatNode(shape, "", true);
  }

  static formatChildren(shapes: readonly Shape[]): string[] {
    return shapes.map((shape, index) => this.formatNode(shape, "", index === shapes.length - 1));
  }

  private static formatNode(shape: Shape, prefix: string, last: boolean): string {
    const styles = ["fill", "stroke", "stroke-width"]
      .map(name => {
        const value = shape.getAttribute(name);
        return value === undefined ? "" : `${name}=${value}`;
      })
      .filter(Boolean);
    const details = [shape.geometry(), ...styles].filter(Boolean).join(" ");
    const line = `${prefix}${last ? "└── " : "├── "}${shape.type}#${shape.id}${details ? `  ${details}` : ""}${shape.treeAnnotation()}`;
    if (!shape.isContainer()) return line;

    return [
      line,
      ...shape.children.map((child, index) =>
        this.formatNode(child, prefix + (last ? "    " : "│   "), index === shape.children.length - 1),
      ),
    ].join("\n");
  }
}
