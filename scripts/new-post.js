const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, 'source', '_posts', 'blog');

function localTimestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
}

async function main() {
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const title = (process.argv[2] || await terminal.question('文章标题: ')).trim();
    if (!title) throw new Error('标题不能为空。');

    const timestamp = localTimestamp();
    const slug = (process.argv[3] || `post-${timestamp}`).trim();
    if (!/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u.test(slug)) {
      throw new Error('文件名只能包含字母、数字和连字符，并且不能以连字符开头。');
    }

    fs.mkdirSync(postsDir, { recursive: true });
    const filePath = path.join(postsDir, `${slug}.md`);
    if (fs.existsSync(filePath)) throw new Error(`文章已存在：${path.relative(root, filePath)}`);

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const markdown = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `date: ${date}`,
      'categories:',
      '  - 随笔',
      'tags: []',
      '# 有封面时取消下一行注释并填入 PicGo 返回的图片 URL',
      '# cover: https://img.darthry.top/picbed/example.jpg',
      '---',
      '',
      '在这里写摘要。首页文章卡片会显示分隔标记之前的内容。',
      '',
      '<!-- more -->',
      '',
      '## 正文标题',
      '',
      '在这里开始写正文。',
      '',
      '插入图片时使用标准 Markdown：',
      '',
      '![图片说明](https://img.darthry.top/picbed/example.jpg)',
      ''
    ].join('\n');

    fs.writeFileSync(filePath, markdown, { encoding: 'utf8', flag: 'wx' });
    console.log(`已创建：${path.relative(root, filePath)}`);
    console.log('在 Obsidian 或 VS Code 中打开文件编辑；文章链接别名使用文件名。');
  } finally {
    terminal.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
