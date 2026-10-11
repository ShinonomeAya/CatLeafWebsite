import releaseData from './release.json' with { type: 'json' };

export type Release = {
  packageId: string;
  version: string;
  versionCode: number;
  android: string;
  bytes: number;
  sha256: string;
  certificateSha256: string;
  releaseNotes: string;
  githubUrl?: string;
} & (
  | { status: 'preparing'; date: null; url: null }
  | { status: 'paused'; reason: string; date: null; url: null }
  | { status: 'published'; date: string; url: string }
);

export const release = releaseData as Release;

export function validateRelease(value: Release): void {
  if (value.packageId !== 'dev.local.catleaf.nativeapp'
    || !Number.isInteger(value.versionCode) || value.versionCode < 1 || value.versionCode > 2147483647
    || !value.version.trim() || value.version.length > 80 || !value.android.trim()
    || !Number.isSafeInteger(value.bytes) || value.bytes <= 0
    || !/^[a-f0-9]{64}$/i.test(value.sha256) || !/^[a-f0-9]{64}$/i.test(value.certificateSha256)
    || typeof value.releaseNotes !== 'string' || /<\/?[a-z][^>]*>/i.test(value.releaseNotes)) {
    throw new Error('安装包元信息无效；更新说明须为纯文本。');
  }
  if (value.status !== 'published') {
    if (!['preparing', 'paused'].includes(value.status) || value.url !== null || value.date !== null
      || (value.status === 'paused' && !value.reason.trim())) throw new Error('未发布时下载地址和发布日期必须为空。');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isFinite(Date.parse(value.date))
    || new Date(value.date).toISOString().slice(0, 10) !== value.date) {
    throw new Error('已发布安装包须填写核定的发布日期。');
  }
  const target = new URL(value.url);
  if (target.protocol !== 'https:' || target.username || target.password
    || target.hash || !target.hostname.includes('.') || /^\[|^\d+\.\d+\.\d+\.\d+$/.test(target.hostname)
    || /(^|\.)(example\.(com|org|net)|localhost)$|\.(local|internal|invalid|test|example)$/.test(target.hostname)
    || [...target.searchParams.keys()].some(key => /^(x-amz-|x-goog-)|^(token|access_?token|api_?key|key|signature|sig|auth|authorization|password|credential)$/i.test(key))) {
    throw new Error('下载地址须为公开、无凭据的完整 HTTPS 地址。');
  }
}

export function serializeUpdateManifest(value: Release): string {
  validateRelease(value);
  const json = JSON.stringify({
    packageId: value.packageId,
    published: value.status === 'published',
    version: value.version,
    versionCode: value.versionCode,
    downloadUrl: value.status === 'published' ? value.url : null,
    ...(value.releaseNotes ? { releaseNotes: value.releaseNotes } : {}),
  }, null, 2) + '\n';
  if (new TextEncoder().encode(json).byteLength > 64 * 1024) throw new Error('更新清单不能超过64 KiB。');
  return json;
}

serializeUpdateManifest(release);
