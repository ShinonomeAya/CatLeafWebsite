// Only verified release paths can fetch upstream; visitors cannot supply a URL.
export async function handleDownload(request, env, downloads, fetcher = fetch) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/downloads/')) return env.ASSETS.fetch(request);
  const fail = (status, text, extra = {}) => new Response(text, { status, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra,
  } });
  if (!['GET', 'HEAD'].includes(request.method)) return fail(405, '仅支持 GET / HEAD', { Allow: 'GET, HEAD' });
  const artifact = Object.hasOwn(downloads, path) ? downloads[path] : undefined;
  if (!artifact) return fail(404, '未找到安装包，请返回 /download/ 查看当前版本。');
  const etag = `"sha256-${artifact.sha256}"`;
  let range = request.method === 'GET' ? request.headers.get('Range') : null;
  if (request.headers.has('If-Range') && request.headers.get('If-Range') !== etag) range = null;
  let start = 0, end = artifact.bytes - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return fail(416, '不支持此续传范围', { 'Content-Range': `bytes */${artifact.bytes}` });
    if (!match[1]) start = Math.max(0, artifact.bytes - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= artifact.bytes || match[2] === '0' && !match[1]) {
      return fail(416, '续传范围超出文件', { 'Content-Range': `bytes */${artifact.bytes}` });
    }
  }
  try {
    const upstream = await fetcher(artifact.url, {
      method: request.method, redirect: 'follow',
      headers: { 'Accept-Encoding': 'identity', ...(range ? { Range: `bytes=${start}-${end}` } : {}) },
    });
    const length = end - start + 1;
    if (upstream.status !== (range ? 206 : 200)
      || Number(upstream.headers.get('Content-Length')) !== length
      || range && upstream.headers.get('Content-Range') !== `bytes ${start}-${end}/${artifact.bytes}`) {
      await upstream.body?.cancel();
      return fail(502, '下载源暂不可用，请返回 /download/ 使用 GitHub 备用入口。');
    }
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`,
      'Content-Length': String(length), 'Accept-Ranges': 'bytes', ETag: etag,
      'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff',
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${artifact.bytes}` } : {}),
    } });
  } catch { return fail(502, '下载源连接失败，请返回 /download/ 使用 GitHub 备用入口。'); }
}
