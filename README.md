# CatLeaf（猫页）官网

让阅读，安静一点。由 ShinonomeAya 维护的 Android RSS 阅读器宣传网站。

- 官网：https://catleaf.konoyuming.top
- Android 源码与公开测试版：https://github.com/ShinonomeAya/CatLeaf
- 问题反馈：https://github.com/ShinonomeAya/CatLeaf/issues

Astro 静态页面、TypeScript、原生 CSS/JavaScript。仅 APK 下载路径使用 Pages Function 流式中转 GitHub 原包；不提供在线阅读、AI 服务或用户系统。公开测试版不代表 App 完整发布验收通过。

## 本地运行

Node.js >=22.12.0（CI 为22.23.2）。

```sh
npm ci
npm run dev
npm run check:release
npm run test:release
npm run build
```

Astro 开发/预览服务器只提供静态页面，不执行 Cloudflare 下载 Function。完整下载路径用 `npx wrangler pages dev dist` 或实际预览部署验证。

`src/data/release.json` 为官网当前版本信息，`src/data/downloads.json` 为已核验的版本下载映射。修改前运行 APK 核验，不能只改版本号。

```sh
ANDROID_BUILD_TOOLS=/path/to/android-sdk/build-tools/36.0.0 npm run sync:release
# 核验成功后更新本地数据，尚不部署：
ANDROID_BUILD_TOOLS=/path/to/android-sdk/build-tools/36.0.0 npm run sync:release -- --apply
```

Windows 用环境变量指定 Android Build Tools；需要 Java 与 Android SDK 的官方 apksigner/aapt。当前只接受既有签名、包名和 Android10 基线；变更这些信任条件需要人工复核。详情见[部署与同步说明](docs/部署与同步.md)。

## 素材和许可

真机截图拍摄于0.1.18/code19，公开展示已由维护者确认。截图中的文章、配图归原内容提供方，保留来源标识；公开仓库不授予第三方内容的再利用权。Logo、文章及配图不得被视为通用免费素材。字体、图标、上游及动效来源许可全文保存在 `public/licenses/` 与网站许可页，保留 Copyright (c) 2025 su-kaka。

公开源码不含 APK、密钥、设备日志、私有测试资料或历史原型。下载 APK 仍由 GitHub Releases 托管。
