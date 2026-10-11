# CatLeaf Website

仅维护宣传网站及经过核验的CatLeaf APK下载中转，不修改Android客户端或后端。沿用暖白/森林绿与现有品牌SVG，不增加用户系统、AI服务、数据库或分析SDK。

先检查git status/diff，保护现有修改。部署仅使用维护者明确指定的catleaf-website；不改DNS、不开通收费资源、不把APK放入public/dist、不打印密钥。CI凭据放GitHub Secrets，禁止复制本机OAuth。

版本来源以公开Release、对应发布清单和实际APK为准；运行check:release、test:release和build，预览全量下载及Range验证通过才部署生产。App截图为0.1.18/code19，不伪造AI结果/离线成功，不把测试版宣传为全部验收通过。保留全部第三方版权和许可。

报告区分本地验证、公开预览、生产上线、自动化启用和国内网络实测。
