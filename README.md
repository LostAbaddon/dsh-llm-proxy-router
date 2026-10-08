# dsh-llm-proxy-router

按 Provider 决定 DSH 的模型请求走不走代理：需要翻墙才能访问的 Provider（Gemini、OpenRouter 等）走代理，国内可直连的 Provider（DeepSeek、Kimi、MiniMax、GLM 等）保持直连。代理地址与「哪些 Provider 走代理」都在 DSH 设置页里配置。

## 它解决什么问题

DSH 里同时挂了很多家模型。把代理塞进进程环境变量（`HTTPS_PROXY`）是全局的：一旦设上，DeepSeek 这类本来直连更快、更稳的请求也会被绕进代理，延迟变高，还多一层失败点。反过来不设代理，Gemini、OpenRouter 又完全用不了。

本插件把「走不走代理」变成按请求主机名判断的逐条规则，并且规则可以在界面上改，改完立即生效、不用重启。

## 判定规则

一次请求按下面的顺序判定，先命中先算：

1. 路由总开关关闭 → 直连。
2. 没填代理地址 → 直连。
3. 目标主机是本机（`localhost`、`127.0.0.1`、`::1`、`*.local`）→ 直连。
4. 目标主机命中某条主机规则 → 走代理。
5. 其余 → 直连。

主机规则来自两处，按顺序拼接：

- **Provider 行**：勾选「走代理」的 Provider 自带一组主机名。例如 Gemini 是 `generativelanguage.googleapis.com`，OpenRouter 是 `openrouter.ai` 与 `*.openrouter.ai`。每行还可以追加自定义主机名（内网网关、自建反代）。
- **额外主机规则**：与 Provider 无关的独立主机名条目，支持 `*` 通配。

主机名支持三种写法：精确匹配 `api.openai.com`；子域通配 `*.openrouter.ai`（不匹配裸域）；全通配 `*`。

无论配置怎么写，下面这些 Provider 永远不会走代理：`deepseek`、`deepseek-official`、`ollama`、`lmstudio`。

## 安装

打包目录本身就是可安装的 bundle：

```
plugin_manager install_bundle <包目录绝对路径>
```

安装后若 DSH 报告 `restart-required`，重启一次 DSH 即可。bundle 的 patch 只插入一行 Host 条目，不碰 profile 里其它任何配置。

## 设置页

设置 → **模型** 分组下的「LLM 代理路由」页：

| 区域 | 作用 |
| --- | --- |
| 总开关 | 关掉后所有请求立即恢复直连，配置保留 |
| 代理地址 | `http://127.0.0.1:7890` 这类地址，省略协议时按 `http://` 处理；支持 `http://用户:口令@主机:端口` |
| 测试代理 | 向代理发起一次真实的 `CONNECT` 隧道握手并回报结果与耗时，不经过任何第三方探测服务 |
| Provider 列表 | 逐行勾选是否走代理；显示该行当前覆盖的主机名，可追加自定义主机名 |
| 额外主机规则 | 独立的主机名条目，可单条停用 |
| 状态行 | 当前生效的代理地址与规则条数 |

保存即落盘、立即生效。配置写在 `$DSH_HOME/llm-proxy-router/config.json`（原子写入），不写 profile 的 patch 层，因此升级不会冲掉它。

## 配置文件

```json
{
  "enabled": true,
  "proxyUrl": "http://127.0.0.1:7890",
  "providers": {
    "gemini": { "enabled": true, "extraHosts": [] },
    "openrouter": { "enabled": true, "extraHosts": ["openrouter.internal"] },
    "deepseek": { "enabled": false, "extraHosts": [] }
  },
  "hosts": [
    { "pattern": "*.openrouter.ai", "enabled": true, "note": "" }
  ]
}
```

行配置可以给一个初始值（用户第一次保存后以配置文件为准）：

```yaml
- id: llm-proxy-router
  name: 'dsh-llm-proxy-router'
  config:
    enabled: false
    proxyUrl: ''
    configPath: ''
    defaultEnabledProviders: []
    reportPath: ''
```

## 实现方式

Host 半边在进程的 `globalThis.fetch` 上装一层路由补丁。选这个接入点的原因有两条：

1. 这套 profile 里每个模型适配器最终都走 `globalThis.fetch`——pi-ai 的 OpenAI / Anthropic / Google 三条协议、DSH 自己的 DeepSeek 适配器、各家 SDK 都一样，一个口子覆盖全部。
2. pi-ai 的 Google 适配器会主动拒绝自定义 `fetch`（源码里明确判断 `options.fetch !== globalThis.fetch` 就抛错），所以没法用「给适配器塞自定义 fetch」这种更局部的办法。

命中代理规则时，请求交给 undici 的 `ProxyAgent` 走 `CONNECT` 隧道；未命中的请求原样交回进程原来的 `fetch`，不做任何包装。补丁在插件卸载时完整还原。

undici 从**运行中应用自己的** `node_modules` 解析，而不是从 profile。原因是 `fetch` 只认「装上了全局 dispatcher 的那个 undici 实例」造出来的 dispatcher：另装一份 undici 属于不同实例，它造的 `ProxyAgent` 会被 `fetch` 以 `UND_ERR_INVALID_ARG` 拒绝。同理，工作区目录安装的插件按真实路径解析模块，所以 `undici`、`@deepseek-ai/schemastery` 这类依赖不能用裸模块名导入，必须从应用目录解析。

浏览器半边是一个自包含的客户端模块（无构建步骤，React 通过浏览器模块表取得，不导入任何 `@deepseek-ai/dsh-client-*` 包），在 `settings.section` 槽位注册设置页，通过 `/api/dsh-llm-proxy-router/*` 读写配置。

Host 暴露的接口：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/state` | 配置、Provider 列表、生效主机规则、运行状态 |
| POST | `/config` | 保存配置并立即生效 |
| POST | `/test` | 测试代理连通性 |
| POST | `/reset` | 恢复默认配置 |
| POST | `/selftest` | 用一次真实请求验证路由补丁的判定 |
| GET | `/diagnostics` | 解析结果、补丁统计、最近判定记录 |

## 已知边界

- 补丁按**主机名**判定，不是按「哪家 Provider 发的」。同进程里任何访问这些主机的请求都会走代理，同进程访问其它主机的请求都不会——这正是期望行为，但需要知道它不等同于「按 Provider 隔离」。
- 隧道不对目标证书做二次校验（`requestTls.rejectUnauthorized: false`）。走私有 MITM 代理时这是必要的，代价是这一层不做证书校验。
- 代理协议只支持 HTTP / HTTPS 代理，不支持 SOCKS。
- 只影响模型请求。搜索、抓取网页、MCP 连接等其它网络流量默认直连，除非它们访问的主机被显式写进规则。

## 测试

```
DSH_LLM_PROXY_ROUTER_UNDICI="<undici 目录>/" node --test "test/*.test.mjs"   # 22 项
node client/selfcheck.mjs                                                     # 50 项
```

`test/core.test.mjs` 覆盖纯路由判定、配置归一化与容错；`test/routing.test.mjs` 起本地源站与本地代理，验证走代理的请求确实进了代理、直连的请求代理一条都没看到、关闭开关后恢复直连、`fetch` 补丁卸载后完整还原。`DSH_LLM_PROXY_ROUTER_UNDICI` 只在应用外跑测试时需要，用来指认一份已安装的 undici。

## 目录

```
host/core.js     纯路由判定与配置归一化（无 I/O，可独立测试）
host/proxy.js    undici 解析、ProxyAgent 池、代理连通性探测、fetch 补丁
host/config.js   配置文档的原子读写
host/index.js    插件入口：装配补丁、注册 HTTP 接口
client/client.js 设置页（浏览器模块，无构建步骤）
locale/          插件在插件列表里的中英文标题与描述
```
