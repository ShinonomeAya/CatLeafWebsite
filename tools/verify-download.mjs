import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { verifyBytes, waitForDownload } from './release-sync.mjs';
import { serializeUpdateManifest } from '../src/data/release.ts';
const release = JSON.parse(await readFile('src/data/release.json', 'utf8'));
const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:') throw new Error('须指定 HTTPS 部署地址');
const request = path => new URL(path, origin);
await waitForDownload(request(new URL(release.url).pathname), release);
const response = await fetch(request(new URL(release.url).pathname), { signal: AbortSignal.timeout(180000) });
if (response.status !== 200 || !response.headers.get('content-type')?.includes('android.package-archive')) throw new Error(`中转没有返回 APK：HTTP ${response.status} / ${response.headers.get('Content-Type')}`);
const bytes = Buffer.from(await response.arrayBuffer()); verifyBytes(bytes, release);
console.log('APK 完整大小与 SHA-256 PASS');
const partial = await fetch(request(new URL(release.url).pathname), { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(60000) });
if (partial.status !== 206 || partial.headers.get('Content-Range') !== `bytes 0-1023/${release.bytes}`
  || !Buffer.from(await partial.arrayBuffer()).equals(bytes.subarray(0, 1024))) throw new Error('Range 续传核验失败');
console.log('Range 续传 PASS');
const manifest = await fetch(request('/releases/latest.json'), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
if (manifest.status !== 200 || !manifest.headers.get('Content-Type')?.includes('application/json')
  || await manifest.text() !== serializeUpdateManifest(release)) throw new Error('部署清单不符');
const page = await fetch(request('/download/'), { signal: AbortSignal.timeout(30000) });
const html = await page.text();
if (page.status !== 200 || !html.includes(release.url) || !html.includes(release.sha256)) throw new Error('下载页版本不符');
await mkdir('.release-work', { recursive: true });
await writeFile('.release-work/download-verification.json', JSON.stringify({ checkedAt: new Date().toISOString(), origin,
  version: release.version, versionCode: release.versionCode, bytes: bytes.length, sha256: release.sha256,
  fullDownload: true, range: true, manifest: true, downloadPage: true,
  network: '执行环境网络，未代表国内各运营商无代理测试' }, null, 2));
console.log(`${origin} APK 全量哈希、Range、JSON 和页面 PASS`);
