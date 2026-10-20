import { createInterface } from "node:readline";
import { Cli } from "./Cli";
// 入口只负责终端交互；命令解释与错误反馈交给 Cli，便于脱离终端调用。
const cli = new Cli();
console.log("svg-editor 0.1 — SVG 命令行编辑器");
console.log("输入 help 查看命令总览，输入 help create 查看参数与示例。");
console.log("试试看：init → create rect r1 20 20 120 60 steelblue → tree → save drawing.svg");
console.log("文字参数可用双引号包住；输入 # 开头的行可写脚本注释。\n");
const repl = createInterface({ input: process.stdin, output: process.stdout, prompt: "svg> " });
repl.prompt();
// readline 同时支持交互输入和管道脚本；空行、注释行无需输出结果。
repl.on("line", line => { const output = cli.runLine(line); if(output) console.log(output); repl.prompt(); });
