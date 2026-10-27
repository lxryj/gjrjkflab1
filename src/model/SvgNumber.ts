/** 数值转换集中点：命令输入非法时报错，外部 SVG 缺失或非法值使用规范默认值。 */
export class SvgNumber {
  static fromCommand(value: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`invalid number: ${value}`);
    return parsed;
  }

  static positive(value: string, label: string): number {
    const parsed = this.fromCommand(value);
    if (parsed <= 0) throw new Error(`${label} must be positive`);
    return parsed;
  }

  static fromSvg(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
