import { CommandManager } from "./commands/CommandManager";
import { SvgDocument } from "./model/SvgDocument";
/** 会话状态：当前文档与历史记录共用一个编辑器实例。 */
export class Editor {
  private documentValue?: SvgDocument;
  readonly history = new CommandManager();
  get document(): SvgDocument | undefined { return this.documentValue; }
  setDocument(document: SvgDocument): void { this.documentValue = document; }
  // 恢复时再次克隆，避免后续编辑修改历史命令保存的快照。
  restore(document: SvgDocument): void { this.documentValue = document.clone(); }
  /** 统一检查前置条件，防止未初始化文档时进入编辑逻辑。 */
  requireDocument(): SvgDocument {
    if (!this.documentValue) throw new Error("no document. use 'init' or 'read' first");
    return this.documentValue;
  }
}
