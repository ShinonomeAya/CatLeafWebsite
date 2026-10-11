import { readFile, writeFile } from 'node:fs/promises';
import { handleDownload } from './download-worker.mjs';
const downloads = JSON.parse(await readFile('src/data/downloads.json', 'utf8'));
for (const [path, item] of Object.entries(downloads)) {
  const match = /^\/downloads\/(catleaf-(\d+\.\d+\.\d+)-code(\d+)\.apk)$/.exec(path);
  if (!match || item.url !== `https://github.com/ShinonomeAya/CatLeaf/releases/download/v${match[2]}/${match[1]}`
    || !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('下载映射未通过检查');
}
await writeFile('dist/_worker.js', `const downloads = ${JSON.stringify(downloads)};\n${handleDownload.toString()}\nexport default { fetch(request, env) { return handleDownload(request, env, downloads); } };\n`);
await writeFile('dist/_routes.json', JSON.stringify({ version: 1, include: ['/downloads/*'], exclude: [] }));
