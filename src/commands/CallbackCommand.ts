import { Command } from "./Command";
/** 用回调承载具体编辑行为，复用基类提供的快照、撤销和失败回滚。 */
export class CallbackCommand extends Command {
  constructor(editor: import("../Editor").Editor, private readonly action: () => string) { super(editor); }
  protected execute(): string { return this.action(); }
}
