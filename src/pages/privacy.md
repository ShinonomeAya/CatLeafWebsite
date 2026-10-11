---
layout: ../layouts/DocumentLayout.astro
title: 隐私与数据说明
description: 猫页的隐私与数据说明。默认本机使用，可选服务按需配置，Android 公开测试版已开放下载。
---

本机使用是数据与使用方式的选择。订阅刷新、全文与图片等功能仍需要网络。这份说明基于当前客户端源码和证据，正式发布前还需复核。

## 哪些数据保存在设备

订阅、文章缓存、阅读与收藏状态保存在本机。主动离线副本在应用私有目录内。选择自有实例后，与该实例交互的数据由你选择的实例管理。配置密钥经 Android Keystore 保护的密钥加密存放，不进入普通状态导出。

## 网络请求会去哪里

- 订阅更新：订阅提供方或第三方 RSS 生成服务。
- 获取全文和图片：文章公开原站及图片来源。
- 可选自有实例：你在设置中指定的实例。
- 可选 AI：连接测试访问配置服务；你发起翻译/摘要时发送所需文章文字。服务商可能计费，其处理规则取决于所选供应商。
- 手动检查更新：0.1.23/code24在用户点击后向GitHub的raw.githubusercontent.com读取公开版本清单，不发送订阅、文章或AI配置；前往下载时由系统浏览器访问GitHub Releases。不自动下载、安装或后台检查。0.1.22及更早版本未配置清单地址。

“默认本机”不等于零网络传输，也不是绝对隐私保证。当前客户端没有应用内账号体系、广告或分析 SDK；本网站也没有分析 SDK、外部字体或远端图片请求。

## 权限与文件

当前 Manifest 业务权限为联网和读取网络状态；导入导出使用系统文件选择与分享能力，不请求广泛存储、定位或通讯录。最终下载包权限仍需发布前核实。

OPML 和状态备份可能包含带 token 的订阅 URL，应私密保存。状态备份不包含正文、图片离线包、AI 结果或密钥，不能代替完整备份。

## 删除与保护

清普通缓存、取消收藏与移除离线副本是不同动作，请阅读 App 的范围说明。卸载或重置会丢失本机数据；重置不删除自有实例远端数据。截图/日志/反馈提交前检查个人文章、账户、URL token和密钥。

## 网站与发布者

CatLeaf（猫页）由 ShinonomeAya 开发与维护，公开主页为[GitHub个人主页](https://github.com/ShinonomeAya)。官网为https://catleaf.konoyuming.top，使用 Cloudflare Pages。官网 APK 下载通过 Cloudflare 中转 GitHub Releases 原包；备用入口直接进入 GitHub。中转只提供核验过的猫页安装包，不接收订阅或 AI 配置，不建立用户账户。

托管与下载平台可能处理必要访问日志，适用其[Cloudflare隐私政策](https://www.cloudflare.com/privacypolicy/)与[GitHub隐私声明](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)。[反馈页](/feedback/)提供 GitHub Issues 和私人漏洞报告入口；点击后进入 GitHub，提交的内容由该平台处理。公开 Issue 可被其他人看到，请先脱敏。本网站没有反馈提交表单；个人主页只是发布者入口。站点不提供账户、RSS代理或AI服务。
