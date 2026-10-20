import { Command } from "./Command";
export class CallbackCommand extends Command {
  constructor(editor: import("../Editor").Editor, private readonly action: () => string) { super(editor); }
  protected execute(): string { return this.action(); }
}
