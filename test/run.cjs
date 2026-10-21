// 不依赖额外测试框架；每个场景使用独立 Cli 和临时文件目录，并留存真实执行证据。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const resultsDir = path.join(__dirname, 'results');
fs.mkdirSync(resultsDir, { recursive: true });
const now = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'medium', hour12: false
}).format(new Date()) + ' +08:00';
const startedAt = now();
const compilerPackage = require.resolve('typescript/package.json');
const compilerInfo = JSON.parse(fs.readFileSync(compilerPackage, 'utf8'));
const compiler = path.resolve(path.dirname(compilerPackage), compilerInfo.bin.tsc);
const build = spawnSync(process.execPath, [compiler, '-p', path.join(root, 'tsconfig.json')], {
  cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true
});
const buildOutput = (build.stdout || '') + (build.stderr || '') + (build.error ? String(build.error) : '');
fs.writeFileSync(path.join(resultsDir, 'build.log'),
  `${startedAt}\nCommand: node <typescript>/bin/tsc -p tsconfig.json\nExit code: ${build.status}\n${buildOutput}`, 'utf8');

const sourceHashes = {};
function fingerprint(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) fingerprint(file);
    else if (file.endsWith('.ts')) sourceHashes[path.relative(root, file).replaceAll('\\', '/')] =
      createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
}
fingerprint(path.join(root, 'src'));
let head = 'unavailable';
try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(); } catch {}
const report = {
  startedAt, finishedAt: null,
  environment: { node: process.version, platform: process.platform, arch: process.arch,
    typescript: compilerInfo.version, fastXmlParser: JSON.parse(fs.readFileSync(path.join(root, 'node_modules/fast-xml-parser/package.json'), 'utf8')).version },
  gitHead: head, sourceHashes, build: { status: build.status === 0 ? 'pass' : 'fail', exitCode: build.status, output: buildOutput },
  cases: []
};

if (build.status === 0) {
  const { Cli } = require('../dist/Cli.js');
  const { SvgDocument } = require('../dist/model/SvgDocument.js');
  const cases = require('./cases.cjs');
  for (const scenario of cases) {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-cli-test-'));
    const record = { id: scenario.id, name: scenario.name, requirement: scenario.requirement,
      issue: scenario.issue || null, status: 'pass', steps: [] };
    const begin = performance.now();
    const context = {
      root, work, resultsDir, SvgDocument, assert,
      cli: () => new Cli(),
      fixture: name => path.join(__dirname, 'fixtures', name),
      sample: name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'),
      note: (label, actual) => record.steps.push({ label, actual }),
      // 所有命令的输入与输出均进入 report，断言失败时仍保留前面的过程。
      run(cli, command) {
        const output = cli.runLine(command);
        record.steps.push({ command, output });
        return output;
      },
      ok(cli, command) {
        const output = context.run(cli, command);
        assert.ok(!output.startsWith('error:'), `Expected command success: ${command}\n${output}`);
        return output;
      },
      init(commands = []) {
        const cli = context.cli();
        context.ok(cli, 'init');
        for (const command of commands) context.ok(cli, command);
        return cli;
      }
    };
    try { scenario.run(context); }
    catch (error) {
      record.status = 'fail';
      record.error = { name: error.name, message: error.message, stack: error.stack,
        actual: error.actual, expected: error.expected, operator: error.operator };
    } finally {
      // 只清理由本场景创建的系统临时目录；测试报告和可预览样例均保留。
      fs.rmSync(work, { recursive: true, force: true });
    }
    record.durationMs = Math.round((performance.now() - begin) * 100) / 100;
    report.cases.push(record);
    console.log(`${record.status === 'pass' ? 'PASS' : 'FAIL'} ${record.id} ${record.name}`);
    if (record.error) console.log(`  ${record.error.message.split('\n')[0]}`);
  }
}

report.finishedAt = now();
report.summary = { total: report.cases.length, passed: report.cases.filter(c => c.status === 'pass').length,
  failed: report.cases.filter(c => c.status === 'fail').length };
fs.writeFileSync(path.join(resultsDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const failed = report.cases.filter(c => c.status === 'fail');
fs.writeFileSync(path.join(resultsDir, 'report.md'), [
  '# 自动化测试结果', '', `执行时间：${report.startedAt} 至 ${report.finishedAt}。`, '',
  `环境：Node.js ${report.environment.node}；TypeScript ${report.environment.typescript}；${process.platform}/${process.arch}。`, '',
  `构建：${report.build.status}；场景总数：${report.summary.total}；通过：${report.summary.passed}；失败：${report.summary.failed}。`, '',
  '本报告由 `npm test` 生成；失败场景正常计入失败，不跳过、不标记为预期通过。详细输入、输出、断言及源码 SHA-256 见 `report.json`。', '',
  '| 编号 | 场景 | 需求依据 | 结果 | 问题 |', '|---|---|---|---|---|',
  ...report.cases.map(c => `| ${c.id} | ${cell(c.name)} | ${cell(c.requirement)} | ${c.status.toUpperCase()} | ${c.issue || '-'} |`), '',
  '## 失败原因', '',
  ...(failed.length ? failed.flatMap(c => [`### ${c.id} ${c.name}`, '', '```text', c.error.message, '```', '']) :
    [report.build.status === 'pass' ? '本次没有断言失败。' : '构建失败，功能测试尚未执行，不能据此认定通过。', '']),
  '## 验证边界', '',
  '本报告验证列出的场景，不等同于穷尽所有输入。未进行浏览器渲染截图验收、大文档压力测试、完整 SVG 规范兼容验证或代码覆盖率测量。', ''
].join('\n'), 'utf8');
console.log(`\nBuild: ${report.build.status}. Cases: ${report.summary.total}, pass: ${report.summary.passed}, fail: ${report.summary.failed}.`);
console.log('Evidence: test/results/report.md, report.json, build.log, repl.log, errors.log');
process.exitCode = build.status === 0 && report.summary.failed === 0 ? 0 : 1;
