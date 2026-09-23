const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, 'source', '_posts', 'blog');

function git(args, options = {}) {
  const output = execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe']
  });
  return typeof output === 'string' ? output.trim() : '';
}

function changedPostPaths() {
  const status = git(['status', '--porcelain', '--untracked-files=all', '--', 'source/_posts/blog']);
  return status.split(/\r?\n/).filter(Boolean).map(line => line.slice(3));
}

function proxyFromWindowsSettings() {
  if (process.platform !== 'win32') return null;
  const result = spawnSync('reg.exe', [
    'query',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
    '/v',
    'ProxyServer'
  ], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return null;
  const match = result.stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
  if (!match) return null;

  const raw = match[1].trim();
  let address = raw;
  if (raw.includes('=')) {
    const mappings = Object.fromEntries(raw.split(';').map(entry => entry.split('=', 2)).filter(pair => pair.length === 2).map(([key, value]) => [key.toLowerCase(), value]));
    address = mappings.https || mappings.http;
  }
  if (!address) return null;
  return /^https?:\/\//i.test(address) ? address : `http://${address}`;
}

function push() {
  const direct = spawnSync('git', ['push', 'origin', 'main'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true
  });
  if (direct.status === 0) return;

  const proxy = proxyFromWindowsSettings();
  if (!proxy) {
    throw new Error('推送失败，且没有检测到 Windows 系统代理。请检查 GitHub 网络连接后运行 npm run post:publish 重试。');
  }

  console.log('Git 直连失败，正在通过 Windows 系统代理重试推送...');
  const retried = spawnSync('git', ['-c', `http.proxy=${proxy}`, 'push', 'origin', 'main'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true
  });
  if (retried.status !== 0) throw new Error('通过系统代理推送也失败，请检查代理和 GitHub 连接后重试。');
}

function main() {
  const requestedPath = process.argv[2];
  const candidates = changedPostPaths();
  let relativePath = requestedPath;

  if (!relativePath) {
    if (candidates.length === 0) {
      const ahead = Number(git(['rev-list', '--count', 'origin/main..HEAD']));
      const lastCommit = git(['log', '-1', '--format=%s']);
      if (ahead === 1 && lastCommit.startsWith('Add blog post: ')) {
        console.log('发现尚未推送的文章提交，正在重试推送...');
        push();
        console.log('文章已推送。Cloudflare Pages 将自动部署。');
        return;
      }
      throw new Error('没有发现尚未提交的文章。');
    }
    if (candidates.length > 1) {
      throw new Error(`待发布文章有多篇：\n${candidates.join('\n')}\n请指定文件：npm run post:publish -- source/_posts/blog/文件名.md`);
    }
    relativePath = candidates[0];
  }

  relativePath = relativePath.replace(/\\/g, '/');
  if (!relativePath.startsWith('source/_posts/blog/') || !relativePath.endsWith('.md')) {
    throw new Error('只能发布 source/_posts/blog/ 下的 Markdown 文章。');
  }
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(postsDir + path.sep) || !fs.existsSync(absolutePath)) {
    throw new Error(`找不到文章文件：${relativePath}`);
  }
  if (!candidates.includes(relativePath)) {
    throw new Error(`该文章没有未提交的改动：${relativePath}`);
  }

  const stagedBefore = git(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
  if (stagedBefore.some(file => file !== relativePath)) {
    throw new Error(`暂存区已有其他文件，请先在 VS Code 中处理这些文件：\n${stagedBefore.join('\n')}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const title = content.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') || path.basename(relativePath, '.md');
  git(['add', '--', relativePath]);
  const staged = git(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
  if (staged.length !== 1 || staged[0] !== relativePath) {
    throw new Error(`暂存区内容与预期不符，已停止提交：\n${staged.join('\n')}`);
  }

  git(['commit', '-m', `Add blog post: ${title}`], { stdio: 'inherit' });
  push();
  console.log('文章已推送。Cloudflare Pages 将自动部署。');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
