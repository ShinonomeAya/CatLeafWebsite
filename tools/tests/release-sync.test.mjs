import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareRelease, verifyBytes, certificate } from '../release-sync.mjs';
import { handleDownload } from '../download-worker.mjs';
const bytes = Buffer.from('fixture-apk');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const url = 'https://github.com/ShinonomeAya/CatLeaf/releases/download/v0.1.23/catleaf-0.1.23-code24.apk';
const source = { version: '0.1.23', versionCode: 24, packageId: 'dev.local.catleaf.nativeapp', minSdk: 29, minAndroid: '10',
  published: true, downloadUrl: url, releaseNotes: '测试', artifact: { fileName: 'catleaf-0.1.23-code24.apk', bytes: bytes.length, sha256, certificateSha256: certificate } };
const github = { tag_name: 'v0.1.23', draft: false, published_at: '2026-10-11T08:30:14Z', assets: [ { name: source.artifact.fileName, size: bytes.length, digest: `sha256:${sha256}`, browser_download_url: url } ] };
const current = { version: '0.1.22', versionCode: 23, bytes: 1, sha256: 'a'.repeat(64) };
test('发布校验、倒退及同 code 换包阻断', () => {
  const next = prepareRelease(source, github, current); verifyBytes(bytes, next);
  for (const invalid of [{ ...source, published: false }, { ...source, packageId: 'other.app' }, { ...source, minSdk: 28 },
    { ...source, downloadUrl: 'https://other.invalid/a.apk' }, { ...source, artifact: { ...source.artifact, certificateSha256: 'b'.repeat(64) } }]) {
    assert.throws(() => prepareRelease(invalid, github, current));
  }
  assert.throws(() => prepareRelease(source, { ...github, draft: true }, current));
  assert.throws(() => prepareRelease(source, { ...github, assets: [] }, current));
  assert.throws(() => prepareRelease(source, github, { ...current, versionCode: 25 }));
  assert.throws(() => prepareRelease(source, github, { ...next, sha256: 'b'.repeat(64) }));
  assert.doesNotThrow(() => prepareRelease(source, github, next));
  assert.throws(() => verifyBytes(Buffer.from('wrong'), next));
  assert.throws(() => verifyBytes(Buffer.from('fixture-bpk'), next));
});
const path = '/downloads/catleaf-0.1.23-code24.apk';
const downloads = { [path]: { url, bytes: bytes.length, sha256 } };
const req = (suffix = path, options = {}) => new Request(`https://catleaf.konoyuming.top${suffix}`, options);
test('中转白名单、方法与静态回退', async () => {
  const forbidden = () => { throw new Error('禁止调用'); };
  assert.equal((await handleDownload(req('/downloads/not.apk?url=https://evil.invalid'), {}, downloads, forbidden)).status, 404);
  assert.equal((await handleDownload(req(path, { method: 'POST' }), {}, downloads, forbidden)).status, 405);
  assert.equal((await handleDownload(req('/download/'), { ASSETS: { fetch: () => new Response('static') } }, downloads, forbidden)).status, 200);
});
test('全量、HEAD、续传及 If-Range', async () => {
  const upstream = async (target, options) => {
    assert.equal(target, url);
    assert.equal(options.headers.Authorization, undefined);
    const range = options.headers.Range;
    const match = range && /bytes=(\d+)-(\d+)/.exec(range);
    const body = match ? bytes.subarray(Number(match[1]), Number(match[2]) + 1) : bytes;
    return new Response(options.method === 'HEAD' ? null : body, { status: range ? 206 : 200, headers: {
      'Content-Length': String(body.length), ...(range ? { 'Content-Range': `${range.replace('=', ' ')}/${bytes.length}` } : {}) } });
  };
  const full = await handleDownload(req(), {}, downloads, upstream);
  assert(Buffer.from(await full.arrayBuffer()).equals(bytes));
  assert.equal((await handleDownload(req(path, { method: 'HEAD' }), {}, downloads, upstream)).headers.get('Content-Length'), String(bytes.length));
  for (const range of ['bytes=0-2', 'bytes=2-', 'bytes=-3']) {
    const partial = await handleDownload(req(path, { headers: { Range: range } }), {}, downloads, upstream);
    assert.equal(partial.status, 206); assert.equal(partial.headers.get('Accept-Ranges'), 'bytes');
  }
  assert.equal((await handleDownload(req(path, { headers: { Range: 'bytes=0-2', 'If-Range': 'stale' } }), {}, downloads, upstream)).status, 200);
});
test('错误范围、上游错误/忽略续传/大小错误/网络失败不可伪装 APK', async () => {
  for (const range of ['bytes=0-1,2-3', 'bytes=999-', 'bytes=-0', 'bytes=8-2', 'other']) {
    assert.equal((await handleDownload(req(path, { headers: { Range: range } }), {}, downloads, () => { throw 0; })).status, 416);
  }
  for (const fetcher of [async () => new Response('not apk'), async () => { throw new Error('network'); }]) {
    const result = await handleDownload(req(), {}, downloads, fetcher);
    assert.equal(result.status, 502); assert.equal(result.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal((await handleDownload(req(path, { headers: { Range: 'bytes=0-1' } }), {}, downloads,
    async () => new Response(bytes, { headers: { 'Content-Length': String(bytes.length) } }))).status, 502);
});
