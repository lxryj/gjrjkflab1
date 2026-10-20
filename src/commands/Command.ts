import { SvgDocument } from "../model/SvgDocument";
export abstract class Command {
  private before?: SvgDocument;
  protected constructor(protected readonly editor: import("../Editor").Editor) {}
  run(): string { this.before = this.editor.document?.clone(); try { return this.execute(); } catch (error) { if (this.before) this.editor.restore(this.before); throw error; } }
  undo(): void { if (this.before) this.editor.restore(this.before); }
  redo(): string { return this.run(); }
  protected abstract execute(): string;
}
