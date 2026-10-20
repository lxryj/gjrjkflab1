import { Command } from "./Command";
/** 管理成功执行的编辑命令，以及文档操作后的历史禁用状态。 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private locked = false;
  // 成功后才入栈；新编辑会放弃 redo 分支，并解除文档操作设置的锁定。
  execute(command: Command): string { const result = command.run(); this.undoStack.push(command); this.redoStack = []; this.locked = false; return result; }
  undo(): string { if (this.locked) throw new Error("undo not allowed after io command"); const cmd = this.undoStack.pop(); if (!cmd) throw new Error("nothing to undo"); cmd.undo(); this.redoStack.push(cmd); return "undone"; }
  redo(): string { if (this.locked) throw new Error("undo not allowed after io command"); const cmd = this.redoStack.pop(); if (!cmd) throw new Error("nothing to redo"); const result = cmd.redo(); this.undoStack.push(cmd); return result; }
  // init/read/save/修改画布会建立新的历史边界，不能跨边界撤销旧文档。
  documentOperation(): void { this.undoStack = []; this.redoStack = []; this.locked = true; }
}
