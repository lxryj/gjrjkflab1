import { createInterface } from "node:readline";
import { Cli } from "./Cli";
// 入口只负责终端交互；命令解释与错误反馈交给 Cli，便于脱离终端调用。
const cli = new Cli();
console.log("svg-editor 0.1 - type 'help' for commands");
const repl = createInterface({ input: process.stdin, output: process.stdout, prompt: "svg> " });
repl.prompt();
// readline 同时支持交互输入和管道脚本；空行、注释行无需输出结果。
repl.on("line", line => { const output = cli.runLine(line); if(output) console.log(output); repl.prompt(); });
