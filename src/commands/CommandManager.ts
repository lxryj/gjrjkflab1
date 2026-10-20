import { Command } from "./Command";
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private locked = false;
  execute(command: Command): string { const result = command.run(); this.undoStack.push(command); this.redoStack = []; this.locked = false; return result; }
  undo(): string { if (this.locked) throw new Error("undo not allowed after io command"); const cmd = this.undoStack.pop(); if (!cmd) throw new Error("nothing to undo"); cmd.undo(); this.redoStack.push(cmd); return "undone"; }
  redo(): string { if (this.locked) throw new Error("undo not allowed after io command"); const cmd = this.redoStack.pop(); if (!cmd) throw new Error("nothing to redo"); const result = cmd.redo(); this.undoStack.push(cmd); return result; }
  documentOperation(): void { this.undoStack = []; this.redoStack = []; this.locked = true; }
}
