import { SvgDocument } from "../model/SvgDocument";
/** 一条编辑命令对应一个撤销单元；第一版使用整份文档的深拷贝快照。 */
export abstract class Command {
  private before?: SvgDocument;
  protected constructor(protected readonly editor: import("../Editor").Editor) {}
  // 先保存状态再执行；执行抛错时恢复文档，让失败命令不留下部分修改。
  run(): string { this.before = this.editor.document?.clone(); try { return this.execute(); } catch (error) { if (this.before) this.editor.restore(this.before); throw error; } }
  undo(): void { if (this.before) this.editor.restore(this.before); }
  // 重做会重新执行操作，同时以当前状态刷新下一次 undo 所需的快照。
  redo(): string { return this.run(); }
  protected abstract execute(): string;
}
