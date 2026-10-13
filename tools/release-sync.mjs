import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRelease, serializeUpdateManifest } from '../src/data/release.ts';

export const certificate = '5f782c4afaf517286d0f5f2a2bd6d8d9f9e2ef9d1cc27b5d4084c65ad64d3f73';
export function prepareRelease(source, github, current) {
  const version = source.version;
  if (!/^\d+\.\d+\.\d+$/.test(version) || github.tag_name !== `v${version}` || github.draft
    || !github.published_at || source.published !== true || source.minSdk !== 29
    || source.minAndroid !== undefined && source.minAndroid !== '10'
    || source.artifact?.certificateSha256 !== certificate) throw new Error('发布状态、系统或签名信任锚不符');
  const name = `catleaf-${version}-code${source.versionCode}.apk`;
  const url = `https://github.com/ShinonomeAya/CatLeaf/releases/download/v${version}/${name}`;
  const asset = github.assets?.find(item => item.name === name);
  if (source.artifact.fileName !== name || source.downloadUrl !== url || !asset
    || asset.browser_download_url !== url || asset.size !== source.artifact.bytes
    || asset.digest !== `sha256:${source.artifact.sha256}`) throw new Error('GitHub 资产与发布清单不一致');
  const result = { status: 'published', packageId: source.packageId, version, versionCode: source.versionCode,
    android: 'Android 10 及以上', bytes: source.artifact.bytes, sha256: source.artifact.sha256,
    certificateSha256: certificate, date: github.published_at.slice(0, 10), githubUrl: url,
    url: `https://catleaf.konoyuming.top/downloads/${name}`, releaseNotes: source.releaseNotes ?? '' };
  validateRelease(result); serializeUpdateManifest(result);
  if (result.bytes > 100 * 1024 * 1024) throw new Error('APK 超过当前 100 MiB 校验预算，需先评估再发布');
  if (result.versionCode < current.versionCode || result.versionCode === current.versionCode
    && (result.version !== current.version || result.sha256 !== current.sha256 || result.bytes !== current.bytes)) {
    throw new Error('拒绝版本倒退或同 code 替换安装包');
  }
  return result;
}
export function verifyBytes(bytes, release) {
  if (bytes.length !== release.bytes || createHash('sha256').update(bytes).digest('hex') !== release.sha256) {
    throw new Error('下载文件大小或 SHA-256 不符');
  }
}
export async function waitForDownload(url, release, fetcher = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  let status;
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetcher(url, { method: 'HEAD', signal: AbortSignal.timeout(15000), cache: 'no-store' });
    status = response.status;
    if (status === 200 && response.headers.get('Content-Type')?.includes('android.package-archive')
      && Number(response.headers.get('Content-Length')) === release.bytes) return;
    if (![200, 404, 429, 502, 503].includes(status)) break;
    if (attempt < 5) await pause(5000);
  }
  throw new Error(`部署下载路径未就绪：HTTP ${status}，未启用未核验下载`);
}
async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`元数据请求失败 ${response.status}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > 1024 * 1024) throw new Error('元数据过大');
  return JSON.parse(text);
}
async function download(url, expectedBytes) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`APK 请求失败 ${response.status}`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > expectedBytes) throw new Error('APK 响应超出声明大小');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function sync() {
  const current = JSON.parse(await readFile('src/data/release.json', 'utf8'));
  const headers = { Accept: 'application/vnd.github+json', ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) };
  // Includes pre-releases; /releases/latest excludes the product's test channel.
  const githubReleases = await getJson('https://api.github.com/repos/ShinonomeAya/CatLeaf/releases?per_page=100', headers);
  const github = githubReleases.find(item => !item.draft && /^v\d+\.\d+\.\d+$/.test(item.tag_name));
  if (!github) throw new Error('没有可核验的公开发布');
  const version = github.tag_name.slice(1);
  const commit = await getJson('https://api.github.com/repos/ShinonomeAya/CatLeaf/commits/main', headers);
  if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('源码提交 SHA 无效');
  const source = await getJson(`https://raw.githubusercontent.com/ShinonomeAya/CatLeaf/${commit.sha}/docs/releases/${version}/release.json`);
  const next = prepareRelease(source, github, current);
  if (process.argv.includes('--apply') && !process.argv.includes('--verify') && JSON.stringify(next) === JSON.stringify(current)) {
    console.log('发布元数据没有变化，不重复下载或部署。'); return;
  }
  const bytes = await download(next.githubUrl, next.bytes);
  verifyBytes(bytes, next);
  const work = '.release-work'; await mkdir(work, { recursive: true });
  const apk = join(work, `catleaf-${version}-code${next.versionCode}.apk`);
  await writeFile(apk, bytes);
  const buildTools = process.env.ANDROID_BUILD_TOOLS;
  if (!buildTools) throw new Error('请指定 ANDROID_BUILD_TOOLS；未验证 APK 实际签名时禁止更新');
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const sign = execFileSync(java, ['-jar', join(buildTools, 'lib', 'apksigner.jar'), 'verify', '--verbose', '--print-certs', apk], { encoding: 'utf8' });
  const certs = [...sign.matchAll(/Signer #\d+ certificate SHA-256 digest:\s*([a-f0-9]+)/gi)];
  if (certs.length !== 1 || certs[0][1].toLowerCase() !== certificate) throw new Error('APK 实际签名不符');
  const badging = execFileSync(join(buildTools, process.platform === 'win32' ? 'aapt.exe' : 'aapt'), ['dump', 'badging', apk], { encoding: 'utf8' });
  const pkg = /^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m.exec(badging);
  if (!pkg || pkg[1] !== next.packageId || Number(pkg[2]) !== next.versionCode || pkg[3] !== next.version
    || !/^sdkVersion:'29'$/m.test(badging)) throw new Error('APK 实际包名、版本或最低系统不符');
  await writeFile(join(work, 'verified-release.json'), JSON.stringify({ ...next, metadataCommit: commit.sha }, null, 2) + '\n');
  if (!process.argv.includes('--apply')) { console.log(`已核验 ${version}/code${next.versionCode}；未更改官网或部署。`); return; }
  const downloads = JSON.parse(await readFile('src/data/downloads.json', 'utf8'));
  const path = new URL(next.url).pathname;
  const item = { url: next.githubUrl, bytes: next.bytes, sha256: next.sha256 };
  if (downloads[path] && JSON.stringify(downloads[path]) !== JSON.stringify(item)) throw new Error('禁止修改既有版本下载映射');
  downloads[path] = item;
  await writeFile('src/data/downloads.json', JSON.stringify(downloads, null, 2) + '\n');
  await writeFile('src/data/release.json', JSON.stringify(next, null, 2) + '\n');
  console.log(`已更新核验元数据 ${version}/code${next.versionCode}；尚未部署。`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await sync();
