import { CommandManager } from "./commands/CommandManager";
import { SvgDocument } from "./model/SvgDocument";
export class Editor {
  document?: SvgDocument;
  readonly history = new CommandManager();
  restore(document: SvgDocument): void { this.document = document.clone(); }
  requireDocument(): SvgDocument { if (!this.document) throw new Error("no document. use 'init' or 'read' first"); return this.document; }
}
