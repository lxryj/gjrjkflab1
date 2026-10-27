import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Group } from "./Group";
import { Line } from "./Line";
import { Rect } from "./Rect";
import { Shape } from "./Shape";
import { Text } from "./Text";

type ShapeInput =
  | { readonly source: "command"; readonly args: readonly string[] }
  | { readonly source: "svg"; readonly attributes: Record<string, unknown>; readonly textContent: string };

/** 唯一的图形类型名分派点；命令创建与 SVG 读回共用同一工厂。 */
export class ShapeFactory {
  private readonly supportedTypes = new Set(["rect", "circle", "ellipse", "line", "text", "g"]);

  supports(type: string): boolean { return this.supportedTypes.has(type); }

  createFromCommand(type: string, id: string, args: string[]): Shape { return this.create(type, id, { source: "command", args }); }
  createFromSvg(type: string, id: string, attributes: Record<string, unknown>, textContent = ""): Shape {
    return this.create(type, id, { source: "svg", attributes, textContent });
  }

  private create(type: string, id: string, input: ShapeInput): Shape {
    switch (type) {
      case "rect": return input.source === "svg" ? Rect.fromSvg(id, input.attributes) : Rect.fromCommand(id, [...input.args]);
      case "circle": return input.source === "svg" ? Circle.fromSvg(id, input.attributes) : Circle.fromCommand(id, [...input.args]);
      case "ellipse": return input.source === "svg" ? Ellipse.fromSvg(id, input.attributes) : Ellipse.fromCommand(id, [...input.args]);
      case "line": return input.source === "svg" ? Line.fromSvg(id, input.attributes) : Line.fromCommand(id, [...input.args]);
      case "text": return input.source === "svg" ? Text.fromSvg(id, input.attributes, input.textContent) : Text.fromCommand(id, [...input.args]);
      case "g": {
        if (input.source === "command" && input.args.length) throw new Error("usage: create g <id>");
        const group = new Group(id);
        if (input.source === "svg") group.loadSvgAttributes(input.attributes);
        return group;
      }
      default: throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }
}
