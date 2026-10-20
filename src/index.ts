import { createInterface } from "node:readline";
import { Cli } from "./Cli";
const cli = new Cli();
console.log("svg-editor 0.1 - type 'help' for commands");
const repl = createInterface({ input: process.stdin, output: process.stdout, prompt: "svg> " });
repl.prompt();
repl.on("line", line => { const output = cli.runLine(line); if(output) console.log(output); repl.prompt(); });
