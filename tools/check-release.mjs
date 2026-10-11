import assert from 'node:assert/strict';
import { release, validateRelease, serializeUpdateManifest } from '../src/data/release.ts';
import { site } from '../src/data/site.ts';

// Format-only fixtures: never requested, rendered, or saved as website release data.
const valid = { ...release, status: 'published', date: '2026-10-10', url: 'https://github.com/__fixture__/app/releases/download/test/app.apk' };
const preparing = { ...release, status: 'preparing', date: null, url: null };
assert.doesNotThrow(() => validateRelease(valid));
const invalids = [
  { ...valid, sha256: '' }, { ...valid, certificateSha256: '' }, { ...valid, version: '' },
  { ...valid, bytes: 0 }, { ...valid, android: '' }, { ...valid, date: '' },
  { ...valid, url: 'http://github.com/app.apk' }, { ...valid, url: 'https://example.com/app.apk' },
  { ...valid, url: 'https://localhost/app.apk' }, { ...valid, url: 'https://secret@github.com/app.apk' },
  { ...valid, packageId: 'other.app' }, { ...valid, versionCode: 0 }, { ...valid, versionCode: 20.1 },
  { ...valid, versionCode: '20' }, { ...valid, versionCode: 2147483648 }, { ...valid, version: 'x'.repeat(81) },
  { ...valid, date: '2026-02-30' }, { ...valid, url: 'https://127.0.0.1/app.apk' },
  { ...valid, url: 'https://github.com/app.apk?token=fixture' }, { ...valid, url: 'https://github.com/app.apk?X-Amz-Signature=fixture' },
  { ...valid, url: 'https://download.invalid/app.apk' }, { ...valid, releaseNotes: '<b>HTML</b>' },
  { ...preparing, url: valid.url }, { ...preparing, date: valid.date },
];
for (const invalid of invalids) assert.throws(() => validateRelease(invalid));
assert.equal(release.status, 'published');
const name = `catleaf-${release.version}-code${release.versionCode}.apk`;
assert.equal(release.githubUrl, `https://github.com/ShinonomeAya/CatLeaf/releases/download/v${release.version}/${name}`);
assert([release.githubUrl, `https://catleaf.konoyuming.top/downloads/${name}`].includes(release.url));
assert.equal(site.url, 'https://catleaf.konoyuming.top');
assert.equal(site.indexable, false);
const current = JSON.parse(serializeUpdateManifest(release));
assert.equal(current.published, true); assert.equal(current.downloadUrl, release.url);
assert.equal(current.packageId, 'dev.local.catleaf.nativeapp');
assert.equal(current.version, release.version); assert.equal(current.versionCode, release.versionCode);
assert.equal(typeof current.releaseNotes, 'string');
assert.equal(JSON.parse(serializeUpdateManifest(preparing)).published, false);
assert.equal(JSON.parse(serializeUpdateManifest({ ...preparing, status: 'paused', reason: 'fixture' })).published, false);
assert(!Object.hasOwn(JSON.parse(serializeUpdateManifest({ ...release, releaseNotes: '' })), 'releaseNotes'));
assert.equal(JSON.parse(serializeUpdateManifest(valid)).downloadUrl, valid.url);
const overhead = Buffer.byteLength(serializeUpdateManifest({ ...release, releaseNotes: 'x' })) - 1;
assert.equal(Buffer.byteLength(serializeUpdateManifest({ ...release, releaseNotes: 'x'.repeat(65536 - overhead) })), 65536);
assert.throws(() => serializeUpdateManifest({ ...release, releaseNotes: 'x'.repeat(65537 - overhead) }));
assert.throws(() => serializeUpdateManifest({ ...release, releaseNotes: '猫'.repeat(22000) }));
console.log(`Release/manifest checks PASS: ${invalids.length} invalid cases rejected, UTF-8/64KiB boundary, public release and unpublished/null fallback verified.`);
