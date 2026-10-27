/** 把命令行拆成参数，同时保留双引号括起的空格和空字符串。 */
export class CommandLineTokenizer {
  static tokenize(line: string): string[] {
    const tokens: string[] = [];
    let token = "";
    let quoted = false;
    let active = false;

    for (const character of line) {
      if (character === '"') {
        quoted = !quoted;
        active = true;
      } else if (/\s/.test(character) && !quoted) {
        if (active) {
          tokens.push(token);
          token = "";
          active = false;
        }
      } else {
        token += character;
        active = true;
      }
    }

    if (quoted) throw new Error("unterminated quoted string");
    if (active) tokens.push(token);
    return tokens;
  }
}
