/**
 * dsh-llm-proxy-router — Client half.
 *
 * Registers a full first-level Settings page (`settings.section`) that edits the
 * host's proxy-routing document over `/api/dsh-llm-proxy-router`, plus the zh/en
 * dictionaries for every visible string.
 *
 * Plain-JavaScript ES-module artifact: no JSX, no build step. React comes from
 * the browser module table through the `window.__ModuleLoader__.load` factory;
 * no Harness Client package is imported as a module, so the controls below copy
 * the host's markup and theme tokens instead.
 */
window.__ModuleLoader__.load({
  id: "dsh-llm-proxy-router",
  factory(require) {
    const React = require("react");
    const h = React.createElement;

    /** Locale namespace this page registers and translates through. */
    const NS = "dsh-llm-proxy-router";
    /** Host HTTP API base path (routes owned by the host half). */
    const API_BASE = "/api/dsh-llm-proxy-router";
    /** Provider ids never hidden from the table even when the host omits them. */
    const SETTINGS_SECTION_ID = "llm-proxy-router";
    /** First-level nav position: directly below the usage section (order 151). */
    const SECTION_ORDER = 152;
    /** Ceiling for one host API call; a stalled host must not pile up requests. */
    const REQUEST_TIMEOUT_MS = 30000;
    /** The probe dials a real proxy, so it gets a wider ceiling. */
    const TEST_TIMEOUT_MS = 25000;
    /** Style tag identity, so a hot reload cannot stack duplicate sheets. */
    const CSS_TAG_ID = "dsh-llm-proxy-router/section.css";

    //#region locales
    /** Chinese copy (the user's UI language). */
    const zh = {
      title: "代理路由",
      intro: "选择哪些 Provider 经代理访问，其余直连；保存后立即生效，无需重启。",
      "status.title": "当前状态",
      "status.disabled": "代理路由已关闭，全部直连",
      "status.routed": "当前经代理：{providers}",
      "status.routedPending": "保存后经代理：{providers}",
      "status.disabledPending": "保存后将全部直连，规则保留",
      "status.routedNone": "代理路由已启用，但还没有 Provider 走代理",
      "status.hosts": "{n} 条主机规则",
      "status.proxy": "生效代理：{url}",
      "status.proxyPending": "保存后代理：{url}",
      "status.proxyNone": "未配置代理地址",
      "status.dirty": "有未保存的修改",
      "status.separator": "、",
      "load.loading": "正在读取配置…",
      "load.failed": "读取配置失败：{error}",
      "load.retry": "重试",
      "general.title": "基本设置",
      "enabled.label": "启用代理路由",
      "enabled.desc": "关闭后所有请求直连；已保存的规则会保留。",
      "proxy.label": "代理地址",
      "proxy.placeholder": "http://127.0.0.1:7890",
      "proxy.desc": "支持 http:// 与 https://，可带凭据：http://user:pass@host:port",
      "proxy.test": "测试代理",
      "proxy.testing": "测试中…",
      "proxy.ok": "连接成功（{ms} ms）",
      "proxy.fail": "连接失败：{error}",
      "proxy.invalid": "代理地址无效，需形如 http://host:port",
      "proxy.required": "启用代理路由前需填写代理地址",
      "providers.title": "Provider 规则",
      "providers.desc": "打开开关的 Provider 经代理访问，关闭的直连。",
      "providers.empty": "宿主未上报任何 Provider。",
      "providers.hosts": "命中主机",
      "providers.noHosts": "暂无命中主机",
      "providers.addPlaceholder": "添加主机规则，如 api.example.com",
      "providers.add": "添加",
      "providers.addLabel": "为 {name} 添加主机规则",
      "providers.removeHost": "从 {name} 的额外规则中移除 {host}",
      "providers.switchLabel": "{name} 走代理",
      "providers.source.default": "内置",
      "providers.source.configured": "已配置",
      "providers.source.registered": "运行中",
      "providers.invalidHost": "主机规则无效：不能包含空格、斜杠或冒号",
      "providers.invalidHostWith": "{name} 的主机规则无效：{host}",
      "providers.duplicateHost": "该主机规则已存在",
      "hosts.title": "额外主机规则",
      "hosts.desc": "这些主机无论归属哪个 Provider 都经代理访问。",
      "hosts.empty": "暂无额外主机规则",
      "hosts.add": "添加主机规则",
      "hosts.placeholder": "generativelanguage.googleapis.com",
      "hosts.pattern": "主机规则",
      "hosts.remove": "删除此规则",
      "hosts.enabled": "规则生效",
      "hosts.invalid": "主机规则无效：不能包含空格、斜杠或冒号",
      "save.save": "保存",
      "save.saving": "保存中…",
      "save.saved": "已保存",
      "save.failed": "保存失败：{error}",
      "save.reset": "恢复默认",
      "save.resetConfirm": "恢复默认会覆盖当前配置，确认继续？",
      "save.confirm": "确认恢复",
      "save.cancel": "取消",
      "save.resetting": "恢复中…",
      "runtime.title": "运行时",
      "runtime.patched": "宿主已接管 fetch",
      "runtime.notPatched": "宿主未接管 fetch",
      "runtime.undici": "undici {version}",
      "runtime.lastError": "最近一次错误（{at}）：{error}",
      "runtime.noError": "运行正常，无错误",
      "error.timeout": "请求超时",
      "error.network": "无法连接宿主接口：{error}",
      "error.http": "宿主返回 HTTP {status}",
    };
    /** English mirror; every zh key is present. */
    const en = {
      title: "Proxy routing",
      intro:
        "Choose which providers reach the network through the proxy; the rest connect directly. Saving applies immediately, with no restart.",
      "status.title": "Current state",
      "status.disabled": "Proxy routing is off; every request connects directly",
      "status.routed": "Currently through the proxy: {providers}",
      "status.routedPending": "After saving, through the proxy: {providers}",
      "status.disabledPending": "After saving, everything connects directly; rules are kept",
      "status.routedNone": "Proxy routing is on, but no provider uses the proxy yet",
      "status.hosts": "{n} host rules",
      "status.proxy": "Effective proxy: {url}",
      "status.proxyPending": "After saving: {url}",
      "status.proxyNone": "No proxy URL configured",
      "status.dirty": "Unsaved changes",
      "status.separator": ", ",
      "load.loading": "Loading configuration…",
      "load.failed": "Failed to load the configuration: {error}",
      "load.retry": "Retry",
      "general.title": "General",
      "enabled.label": "Enable proxy routing",
      "enabled.desc": "When off, every request connects directly; saved rules are kept.",
      "proxy.label": "Proxy URL",
      "proxy.placeholder": "http://127.0.0.1:7890",
      "proxy.desc": "Accepts http:// and https://, with optional credentials: http://user:pass@host:port",
      "proxy.test": "Test proxy",
      "proxy.testing": "Testing…",
      "proxy.ok": "Connected ({ms} ms)",
      "proxy.fail": "Connection failed: {error}",
      "proxy.invalid": "Invalid proxy URL; expected a form like http://host:port",
      "proxy.required": "A proxy URL is required while proxy routing is on",
      "providers.title": "Provider rules",
      "providers.desc": "Providers with the switch on use the proxy; the others connect directly.",
      "providers.empty": "The host reported no providers.",
      "providers.hosts": "Matching hosts",
      "providers.noHosts": "No matching hosts",
      "providers.addPlaceholder": "Add a host pattern, such as api.example.com",
      "providers.add": "Add",
      "providers.addLabel": "Add a host pattern for {name}",
      "providers.removeHost": "Remove {host} from {name}'s extra rules",
      "providers.switchLabel": "Route {name} through the proxy",
      "providers.source.default": "Built-in",
      "providers.source.configured": "Configured",
      "providers.source.registered": "Registered",
      "providers.invalidHost": "Invalid host pattern: no spaces, slashes, or colons",
      "providers.invalidHostWith": "Invalid host pattern for {name}: {host}",
      "providers.duplicateHost": "That host pattern is already there",
      "hosts.title": "Extra host rules",
      "hosts.desc": "These hosts always use the proxy, whichever provider calls them.",
      "hosts.empty": "No extra host rules",
      "hosts.add": "Add host rule",
      "hosts.placeholder": "generativelanguage.googleapis.com",
      "hosts.pattern": "Host pattern",
      "hosts.remove": "Remove this rule",
      "hosts.enabled": "Rule enabled",
      "hosts.invalid": "Invalid host pattern: no spaces, slashes, or colons",
      "save.save": "Save",
      "save.saving": "Saving…",
      "save.saved": "Saved",
      "save.failed": "Save failed: {error}",
      "save.reset": "Restore defaults",
      "save.resetConfirm": "Restoring defaults overwrites the current configuration. Continue?",
      "save.confirm": "Restore",
      "save.cancel": "Cancel",
      "save.resetting": "Restoring…",
      "runtime.title": "Runtime",
      "runtime.patched": "The host patched fetch",
      "runtime.notPatched": "The host has not patched fetch",
      "runtime.undici": "undici {version}",
      "runtime.lastError": "Last error ({at}): {error}",
      "runtime.noError": "No errors",
      "error.timeout": "Request timed out",
      "error.network": "Cannot reach the host API: {error}",
      "error.http": "The host answered HTTP {status}",
    };
    //#endregion

    //#region styles
    /**
     * Section stylesheet. Tokens only (`--dsw-alias-*` and friends) plus layout
     * numbers; class names carry the `dshlpr-` prefix so nothing collides with a
     * host rule. Rendered as a React element, so unmounting removes it.
     */
    const CSS = `
.dshlpr-page{display:flex;flex-direction:column;gap:14px;width:100%;max-width:760px;color:var(--dsw-alias-label-primary)}
.dshlpr-title{margin:0;font-size:16px;font-weight:500;line-height:24px;color:var(--dsw-alias-label-primary)}
.dshlpr-intro{margin:0;font-size:14px;line-height:22px;color:var(--dsw-alias-label-tertiary)}
.dshlpr-card{display:flex;flex-direction:column;gap:12px;padding:12px 14px;border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill)}
.dshlpr-cardHead{display:flex;flex-direction:column;gap:2px}
.dshlpr-cardTitle{margin:0;font-size:14px;font-weight:500;line-height:22px;color:var(--dsw-alias-label-primary)}
.dshlpr-cardDesc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshlpr-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:12px 0}
.dshlpr-row+.dshlpr-row{border-top:.5px solid var(--dsw-alias-border-l2)}
.dshlpr-rowText{flex:1;min-width:0}
.dshlpr-rowTitle{font-size:14px;line-height:20px}
.dshlpr-rowDesc{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshlpr-field{display:flex;flex-direction:column;gap:6px;padding:12px 0}
.dshlpr-fieldLabel{font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}
.dshlpr-fieldRow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dshlpr-fieldRow .dshlpr-input{flex:1;min-width:220px}
.dshlpr-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.dshlpr-provider{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}
.dshlpr-providerHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dshlpr-providerName{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;font-size:14px;font-weight:500;line-height:22px}
.dshlpr-tag{flex:none;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs);padding:1px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-weight:400}
.dshlpr-id{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-weight:400}
.dshlpr-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dshlpr-chipsLabel{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshlpr-chip{display:inline-flex;align-items:center;gap:4px;max-width:100%;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs);padding:1px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dshlpr-chipExtra{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dshlpr-chipText{overflow-wrap:anywhere}
.dshlpr-chipRemove{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;padding:0;border:none;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;line-height:1;cursor:pointer}
.dshlpr-chipRemove:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dshlpr-chipRemove:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.dshlpr-hostRow{display:flex;align-items:center;gap:8px}
.dshlpr-hostRow .dshlpr-input{flex:1;min-width:0}
.dshlpr-hostList{display:flex;flex-direction:column;gap:8px}
.dshlpr-status{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform)}
.dshlpr-statusLine{display:flex;align-items:baseline;gap:8px;font-size:14px;line-height:22px}
.dshlpr-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-label-dimmed);align-self:center}
.dshlpr-dot[data-on="true"]{background:var(--dsw-alias-state-success-primary)}
.dshlpr-statusMeta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dshlpr-warn{color:var(--dsw-alias-state-warn-label)}
.dshlpr-errorText{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.dshlpr-break{overflow-wrap:anywhere}
.dshlpr-footer{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:2px}
.dshlpr-feedback{margin-left:auto;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dshlpr-feedback[data-kind="saved"]{color:var(--dsw-alias-state-success-primary)}
.dshlpr-feedback[data-kind="failed"]{color:var(--dsw-alias-state-error-primary)}
.dshlpr-error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.dshlpr-failure{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary)}
.dshlpr-input{box-sizing:border-box;width:100%;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px}
.dshlpr-input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}
.dshlpr-input::placeholder{color:var(--dsw-alias-label-dimmed)}
.dshlpr-input:disabled{opacity:.6;cursor:default}
.dshlpr-input[aria-invalid="true"]{border-color:var(--dsw-alias-state-error-primary)}
.dshlpr-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:36px;padding:0 14px;border:none;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;cursor:pointer}
.dshlpr-button:disabled{opacity:.4;cursor:default}
.dshlpr-button:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.dshlpr-buttonPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dshlpr-buttonPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.dshlpr-buttonGhost{border:.5px solid var(--dsw-alias-border-l3)}
.dshlpr-buttonGhost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dshlpr-buttonDanger{color:var(--dsw-alias-state-error-primary)}
.dshlpr-buttonDanger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
.dshlpr-buttonSm{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:12px;line-height:18px}
.dshlpr-iconButton{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;line-height:1;cursor:pointer}
.dshlpr-iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.dshlpr-iconButton:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.dshlpr-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer}
.dshlpr-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
.dshlpr-switch:disabled{cursor:default;opacity:.5}
.dshlpr-switch:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}
.dshlpr-switchThumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground);transition:transform 120ms ease}
.dshlpr-switch[aria-checked="false"] .dshlpr-switchThumb{background:var(--dsw-alias-switch-thumb)}
.dshlpr-switch[aria-checked="true"] .dshlpr-switchThumb{transform:translateX(16px)}
@media (prefers-reduced-motion: reduce){.dshlpr-switchThumb{transition:none}}
`;
    //#endregion

    //#region utilities
    /** Message text of an unknown thrown value. */
    function messageOf(error) {
      if (error === null || error === undefined) return "";
      if (typeof error === "string") return error;
      if (error instanceof Error) return error.message || error.name;
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    /** Localized, user-facing description of a transport failure. */
    function describeError(error, t) {
      if (error && (error.name === "TimeoutError" || error.name === "AbortError")) return t("error.timeout");
      if (error && error.name === "HttpStatusError") return t("error.http", { status: error.status });
      if (error instanceof TypeError) return t("error.network", { error: messageOf(error) });
      return messageOf(error);
    }

    /** Abort signal that also honors an outer signal; `release()` clears both. */
    function withTimeout(signal, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
      const forward = () => controller.abort(signal && signal.reason);
      if (signal) {
        if (signal.aborted) forward();
        else signal.addEventListener("abort", forward, { once: true });
      }
      return {
        signal: controller.signal,
        release() {
          clearTimeout(timer);
          if (signal) signal.removeEventListener("abort", forward);
        },
      };
    }

    /** Parse a JSON body, or null when the response is not JSON. */
    async function readJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    /**
     * One host API call. Resolves to the parsed payload; rejects with the host's
     * own `error` text (or an HTTP status) when the call did not succeed.
     */
    async function request(path, options) {
      const opts = options || {};
      const guard = withTimeout(opts.signal, opts.timeoutMs || REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(API_BASE + path, {
          method: opts.method || "GET",
          headers: opts.body === undefined ? undefined : { "content-type": "application/json" },
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          cache: "no-store",
          signal: guard.signal,
        });
        const payload = await readJson(response);
        if (payload && payload.ok === false) throw new Error(messageOf(payload.error) || "request refused");
        if (!response.ok) {
          const failure = new Error(messageOf(payload && payload.error) || `HTTP ${response.status}`);
          failure.name = "HttpStatusError";
          failure.status = response.status;
          throw failure;
        }
        if (payload === null) {
          const failure = new Error(`HTTP ${response.status}`);
          failure.name = "HttpStatusError";
          failure.status = response.status;
          throw failure;
        }
        return payload;
      } finally {
        guard.release();
      }
    }

    /** Host API surface this page uses. */
    const api = {
      state: (signal) => request("/state", { signal, timeoutMs: REQUEST_TIMEOUT_MS }),
      save: (config) => request("/config", { method: "POST", body: { config }, timeoutMs: REQUEST_TIMEOUT_MS }),
      test: (proxyUrl) => request("/test", { method: "POST", body: { proxyUrl }, timeoutMs: TEST_TIMEOUT_MS }),
      reset: () => request("/reset", { method: "POST", timeoutMs: REQUEST_TIMEOUT_MS }),
    };

    /** Monotonic key source for host-rule rows; never sent to the host. */
    let hostRuleUid = 0;
    function nextHostRuleUid() {
      hostRuleUid += 1;
      return "host-" + hostRuleUid;
    }

    /** Validate one proxy URL; "required" | "invalid" | null. */
    function proxyUrlProblem(value) {
      const text = String(value === undefined || value === null ? "" : value).trim();
      if (text === "") return "required";
      let parsed;
      try {
        parsed = new URL(text);
      } catch {
        return "invalid";
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
      if (!parsed.hostname) return "invalid";
      return null;
    }

    /** Validate one host pattern; "empty" | "chars" | null. */
    function hostPatternProblem(pattern) {
      const text = String(pattern === undefined || pattern === null ? "" : pattern).trim();
      if (text === "") return "empty";
      if (!/^[A-Za-z0-9*._-]+$/.test(text)) return "chars";
      return null;
    }

    /** Trimmed, wire-shaped copy of one draft. */
    function toPayload(draft) {
      const providers = {};
      const source = draft && draft.providers ? draft.providers : {};
      for (const id of Object.keys(source).sort()) {
        const entry = source[id] || {};
        providers[id] = {
          enabled: entry.enabled === true,
          extraHosts: Array.isArray(entry.extraHosts)
            ? entry.extraHosts.map((host) => String(host).trim()).filter((host) => host !== "")
            : [],
          displayName: typeof entry.displayName === "string" && entry.displayName !== "" ? entry.displayName : id,
        };
      }
      return {
        enabled: draft ? draft.enabled === true : false,
        proxyUrl: draft ? String(draft.proxyUrl || "").trim() : "",
        proxyMode: draft && typeof draft.proxyMode === "string" && draft.proxyMode !== "" ? draft.proxyMode : "manual",
        providers,
        hosts: (draft && Array.isArray(draft.hosts) ? draft.hosts : []).map((rule) => ({
          pattern: String(rule.pattern || "").trim(),
          enabled: rule.enabled !== false,
          note: typeof rule.note === "string" ? rule.note : "",
        })),
      };
    }

    /** First validation failure of a draft as localized text, or null. */
    function validateDraft(draft, t) {
      if (!draft) return null;
      const required = draft.enabled === true;
      const problem = proxyUrlProblem(draft.proxyUrl);
      if (problem === "required" && required) return t("proxy.required");
      if (problem === "invalid") return t("proxy.invalid");
      for (const rule of draft.hosts || []) {
        const hostProblem = hostPatternProblem(rule.pattern);
        if (hostProblem === "empty") return t("hosts.invalid");
        if (hostProblem === "chars") return t("hosts.invalid");
      }
      for (const id of Object.keys(draft.providers || {})) {
        const entry = draft.providers[id] || {};
        for (const host of entry.extraHosts || []) {
          const hostProblem = hostPatternProblem(host);
          if (hostProblem !== null) {
            return t("providers.invalidHostWith", {
              name: entry.displayName || id,
              host: String(host).trim() === "" ? "—" : String(host),
            });
          }
        }
      }
      return null;
    }

    /**
     * Merge a host config with the host's live provider catalog: every catalog
     * provider gets a row, provider entries the catalog does not report survive,
     * and unknown fields are dropped.
     */
    function normalizeConfig(raw, catalog) {
      const config = raw !== null && typeof raw === "object" ? raw : {};
      const reported = config.providers !== null && typeof config.providers === "object" ? config.providers : {};
      const providers = {};
      const ids = [];
      for (const entry of Array.isArray(catalog) ? catalog : []) {
        const id = entry && typeof entry.id === "string" ? entry.id : null;
        if (id === null || ids.indexOf(id) !== -1) continue;
        ids.push(id);
      }
      for (const id of Object.keys(reported)) if (ids.indexOf(id) === -1) ids.push(id);
      for (const id of ids) {
        const saved = reported[id] !== null && typeof reported[id] === "object" ? reported[id] : {};
        const listed = (Array.isArray(catalog) ? catalog : []).find((entry) => entry && entry.id === id) || {};
        providers[id] = {
          // The saved override wins; a provider the config never mentions starts
          // from the host's effective value for it (default or registered).
          enabled: typeof saved.enabled === "boolean" ? saved.enabled : listed.enabled === true,
          extraHosts: Array.isArray(saved.extraHosts)
            ? saved.extraHosts.map((host) => String(host)).filter((host) => host.trim() !== "")
            : [],
          displayName:
            typeof saved.displayName === "string" && saved.displayName !== ""
              ? saved.displayName
              : typeof listed.displayName === "string" && listed.displayName !== ""
                ? listed.displayName
                : id,
        };
      }
      const hosts = (Array.isArray(config.hosts) ? config.hosts : [])
        .filter((rule) => rule !== null && typeof rule === "object")
        .map((rule) => ({
          uid: nextHostRuleUid(),
          pattern: String(rule.pattern === undefined || rule.pattern === null ? "" : rule.pattern),
          enabled: rule.enabled !== false,
          note: typeof rule.note === "string" ? rule.note : "",
        }));
      return {
        enabled: config.enabled === true,
        proxyUrl: typeof config.proxyUrl === "string" ? config.proxyUrl : "",
        proxyMode: typeof config.proxyMode === "string" && config.proxyMode !== "" ? config.proxyMode : "manual",
        providers,
        hosts,
      };
    }

    /** Provider catalog of a state snapshot, always an array. */
    function catalogOf(snapshot) {
      return snapshot && Array.isArray(snapshot.providers) ? snapshot.providers : [];
    }

    /** Catalog hosts already known for one provider id. */
    function knownHosts(catalog, id) {
      const entry = catalog.find((row) => row && row.id === id);
      return entry && Array.isArray(entry.hosts) ? entry.hosts.map((host) => String(host)) : [];
    }

    /** Localized label of a provider source. */
    function sourceLabel(source, t) {
      if (source === "configured") return t("providers.source.configured");
      if (source === "registered") return t("providers.source.registered");
      return t("providers.source.default");
    }
    //#endregion

    //#region components
    /** Host-styled toggle switch (`role="switch"`, state keyed off aria-checked). */
    function Switch(props) {
      return h(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": props.checked === true,
          "aria-label": props.label,
          title: props.title,
          disabled: props.disabled === true,
          className: "dshlpr-switch",
          onClick: () => props.onChange(props.checked !== true),
        },
        h("span", { className: "dshlpr-switchThumb" }),
      );
    }

    /** Host-styled button: primary, ghost, or danger, at md or sm size. */
    function Button(props) {
      const className = [
        "dshlpr-button",
        props.variant === "primary"
          ? "dshlpr-buttonPrimary"
          : props.variant === "danger"
            ? "dshlpr-buttonDanger"
            : "dshlpr-buttonGhost",
        props.size === "sm" ? "dshlpr-buttonSm" : "",
        props.className || "",
      ]
        .filter((part) => part !== "")
        .join(" ");
      return h(
        "button",
        {
          type: "button",
          className,
          disabled: props.disabled === true,
          title: props.title,
          onClick: props.onClick,
        },
        props.children,
      );
    }

    /** Small square icon button used by removable rows. */
    function IconButton(props) {
      return h(
        "button",
        {
          type: "button",
          className: "dshlpr-iconButton",
          disabled: props.disabled === true,
          title: props.title,
          "aria-label": props.label || props.title,
          onClick: props.onClick,
        },
        props.children,
      );
    }

    /** Card with an optional title and description above its children. */
    function Card(props) {
      const head =
        props.title === undefined
          ? null
          : h(
              "div",
              { className: "dshlpr-cardHead" },
              h("h3", { className: "dshlpr-cardTitle" }, props.title),
              props.description === undefined ? null : h("p", { className: "dshlpr-cardDesc" }, props.description),
            );
      return h("div", { className: "dshlpr-card" }, head, props.children);
    }

    /**
     * The proxy-routing settings page: the master switch, the proxy URL with its
     * probe, one rule row per provider, extra host rules, the live status line,
     * and the save/restore footer.
     */
    function ProxyRouterSection(props) {
      const t = props.t;
      const [reloadToken, setReloadToken] = React.useState(0);
      const [load, setLoad] = React.useState({ status: "loading", error: null });
      const [snapshot, setSnapshot] = React.useState(null);
      const [draft, setDraft] = React.useState(null);
      const [save, setSave] = React.useState({ status: "idle", error: null });
      const [probe, setProbe] = React.useState({ status: "idle", error: null, latencyMs: null });
      const [confirmReset, setConfirmReset] = React.useState(false);
      const [pendingHost, setPendingHost] = React.useState({});
      const [rowError, setRowError] = React.useState({});
      const [newHost, setNewHost] = React.useState("");
      const submitted = React.useRef(null);
      const translate = React.useRef(t);
      translate.current = t;
      const catalog = catalogOf(snapshot);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        setLoad({ status: "loading", error: null });
        api.state(controller.signal).then(
          (next) => {
            if (!alive) return;
            setSnapshot(next);
            setDraft(normalizeConfig(next.config, next.providers));
            setLoad({ status: "ready", error: null });
          },
          (error) => {
            if (!alive || controller.signal.aborted) return;
            setLoad({ status: "error", error: describeError(error, translate.current) });
          },
        );
        return () => {
          alive = false;
          controller.abort();
        };
      }, [reloadToken]);

      /** Immutable draft update. */
      const edit = (updater) => setDraft((current) => (current ? updater(current) : current));
      const providerEntry = (current, id) =>
        current.providers[id] || { enabled: false, extraHosts: [], displayName: id };

      const setProxyUrl = (value) => {
        edit((current) => ({ ...current, proxyUrl: value }));
        // A probe verdict describes the URL it was run against, so drop it here.
        setProbe((current) => (current.status === "idle" ? current : { status: "idle", error: null, latencyMs: null }));
        if (save.status === "failed") setSave({ status: "idle", error: null });
      };

      const setProviderEnabled = (id, next) =>
        edit((current) => ({
          ...current,
          providers: {
            ...current.providers,
            [id]: { ...providerEntry(current, id), enabled: next },
          },
        }));

      const addProviderHost = (id) => {
        const raw = String(pendingHost[id] || "").trim();
        const entry = draft ? providerEntry(draft, id) : { extraHosts: [], displayName: id };
        const problem = hostPatternProblem(raw);
        if (problem !== null) {
          setRowError((current) => ({ ...current, [id]: "providers.invalidHost" }));
          return;
        }
        const known = knownHosts(catalog, id).map((host) => host.toLowerCase());
        const extras = entry.extraHosts.map((host) => host.toLowerCase());
        if (known.indexOf(raw.toLowerCase()) !== -1 || extras.indexOf(raw.toLowerCase()) !== -1) {
          setRowError((current) => ({ ...current, [id]: "providers.duplicateHost" }));
          return;
        }
        setRowError((current) => ({ ...current, [id]: null }));
        setPendingHost((current) => ({ ...current, [id]: "" }));
        edit((current) => ({
          ...current,
          providers: {
            ...current.providers,
            [id]: { ...providerEntry(current, id), extraHosts: [...providerEntry(current, id).extraHosts, raw] },
          },
        }));
      };

      const removeProviderHost = (id, host) =>
        edit((current) => {
          const entry = providerEntry(current, id);
          return {
            ...current,
            providers: {
              ...current.providers,
              [id]: { ...entry, extraHosts: entry.extraHosts.filter((item) => item !== host) },
            },
          };
        });

      const addHostRule = () => {
        const raw = newHost.trim();
        const problem = hostPatternProblem(raw);
        if (problem !== null) {
          setRowError((current) => ({ ...current, __newHost: "hosts.invalid" }));
          return;
        }
        setRowError((current) => ({ ...current, __newHost: null }));
        setNewHost("");
        edit((current) => ({
          ...current,
          hosts: [...current.hosts, { uid: nextHostRuleUid(), pattern: raw, enabled: true, note: "" }],
        }));
      };

      const updateHostRule = (index, patch) =>
        edit((current) => ({
          ...current,
          hosts: current.hosts.map((rule, at) => (at === index ? { ...rule, ...patch } : rule)),
        }));

      const removeHostRule = (index) =>
        edit((current) => ({ ...current, hosts: current.hosts.filter((rule, at) => at !== index) }));

      const onTest = () => {
        if (!draft) return;
        const problem = proxyUrlProblem(draft.proxyUrl);
        if (problem !== null) {
          setProbe({
            status: "failed",
            error: t(problem === "required" ? "proxy.required" : "proxy.invalid"),
            latencyMs: null,
          });
          return;
        }
        setProbe({ status: "testing", error: null, latencyMs: null });
        api.test(draft.proxyUrl.trim()).then(
          (result) =>
            setProbe({
              status: "ok",
              error: null,
              latencyMs: typeof result.latencyMs === "number" ? result.latencyMs : null,
            }),
          (error) => setProbe({ status: "failed", error: describeError(error, t), latencyMs: null }),
        );
      };

      const onSave = () => {
        if (!draft) return;
        const problem = validateDraft(draft, t);
        if (problem !== null) {
          setSave({ status: "failed", error: problem });
          return;
        }
        const payload = toPayload(draft);
        const signature = JSON.stringify(payload);
        setSave({ status: "saving", error: null });
        api.save(payload).then(
          () => {
            submitted.current = signature;
            setSave({ status: "saved", error: null });
            return api.state().then(
              (next) => {
                setSnapshot(next);
                setDraft((current) =>
                  current && JSON.stringify(toPayload(current)) === signature
                    ? normalizeConfig(next.config, next.providers)
                    : current,
                );
              },
              () =>
                setDraft((current) =>
                  current && JSON.stringify(toPayload(current)) === signature
                    ? normalizeConfig(payload, catalog)
                    : current,
                ),
            );
          },
          (error) => setSave({ status: "failed", error: describeError(error, t) }),
        );
      };

      const onReset = () => {
        setConfirmReset(false);
        setSave({ status: "resetting", error: null });
        api.reset().then(
          (result) => {
            const fallback = result && result.config !== undefined ? result.config : null;
            return api.state().then(
              (next) => {
                setSnapshot(next);
                setDraft(normalizeConfig(next.config, next.providers));
                setSave({ status: "saved", error: null });
              },
              () => {
                if (fallback !== null) {
                  setSnapshot((current) => (current ? { ...current, config: fallback } : current));
                  setDraft(normalizeConfig(fallback, catalog));
                }
                setSave({ status: "saved", error: null });
              },
            );
          },
          (error) => setSave({ status: "failed", error: describeError(error, t) }),
        );
      };

      const styleTag = h("style", {
        "data-plugin-css": CSS_TAG_ID,
        dangerouslySetInnerHTML: { __html: CSS },
      });

      const head = [
        h("h2", { className: "dshlpr-title", key: "title" }, t("title")),
        h("p", { className: "dshlpr-intro", key: "intro" }, t("intro")),
      ];

      if (load.status === "loading" && !draft) {
        return h(
          "div",
          { className: "dshlpr-page", "data-slot-section": SETTINGS_SECTION_ID },
          styleTag,
          head,
          h("p", { className: "dshlpr-hint" }, t("load.loading")),
        );
      }

      if (!draft) {
        return h(
          "div",
          { className: "dshlpr-page", "data-slot-section": SETTINGS_SECTION_ID },
          styleTag,
          head,
          h(
            "div",
            { className: "dshlpr-failure", role: "alert" },
            h("span", null, t("load.failed", { error: load.error || "" })),
            h("button", { type: "button", className: "dshlpr-button dshlpr-buttonGhost dshlpr-buttonSm", onClick: () => setReloadToken((value) => value + 1) }, t("load.retry")),
          ),
        );
      }

      const enabled = draft.enabled === true;
      const runtime = snapshot && snapshot.runtime ? snapshot.runtime : {};
      const appliedConfig = snapshot && snapshot.config !== null && typeof snapshot.config === "object" ? snapshot.config : {};
      const appliedUrl = typeof appliedConfig.proxyUrl === "string" ? appliedConfig.proxyUrl : "";
      const dirty = snapshot ? JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(normalizeConfig(snapshot.config, snapshot.providers))) : false;
      const hostCount = snapshot && Array.isArray(snapshot.effectiveHosts) ? snapshot.effectiveHosts.length : toPayload(draft).hosts.length;
      const appliedRouted = catalog
        .filter((entry) => entry && entry.enabled === true)
        .map((entry) => entry.displayName || entry.id);
      const draftRouted = draft.enabled === true
        ? Object.keys(draft.providers)
            .filter((id) => draft.providers[id] && draft.providers[id].enabled === true)
            .map((id) => draft.providers[id].displayName || id)
        : [];
      const routed = dirty ? draftRouted : appliedRouted;
      const routingOn = dirty ? enabled : !!(snapshot && snapshot.proxyConfigured === true && appliedRouted.length > 0);
      const statusText = dirty
        ? enabled
          ? routed.length > 0
            ? t("status.routedPending", { providers: routed.join(t("status.separator")) })
            : t("status.routedNone")
          : t("status.disabledPending")
        : !enabled
          ? t("status.disabled")
          : routed.length > 0
            ? t("status.routed", { providers: routed.join(t("status.separator")) })
            : t("status.routedNone");

      const statusCard = h(
        "div",
        { className: "dshlpr-status" },
        h(
          "div",
          { className: "dshlpr-statusLine" },
          h("span", { className: "dshlpr-dot", "data-on": routingOn && routed.length > 0 ? "true" : "false", "aria-hidden": "true" }),
          h("span", null, statusText),
        ),
        h(
          "div",
          { className: "dshlpr-statusMeta" },
          h("span", null, t("status.hosts", { n: hostCount })),
          h(
            "span",
            { className: "dshlpr-break" },
            appliedUrl !== "" ? t("status.proxy", { url: appliedUrl }) : t("status.proxyNone"),
          ),
          dirty && draft.proxyUrl.trim() !== "" && draft.proxyUrl.trim() !== appliedUrl
            ? h("span", { className: "dshlpr-break dshlpr-warn" }, t("status.proxyPending", { url: draft.proxyUrl.trim() }))
            : null,
          dirty ? h("span", { className: "dshlpr-warn" }, t("status.dirty")) : null,
        ),
        h(
          "div",
          { className: "dshlpr-statusMeta" },
          h("span", { className: "dshlpr-chipsLabel" }, t("runtime.title")),
          h("span", null, runtime.patched === true ? t("runtime.patched") : t("runtime.notPatched")),
          typeof runtime.undici === "string" && runtime.undici !== "" ? h("span", null, t("runtime.undici", { version: runtime.undici })) : null,
          typeof runtime.lastError === "string" && runtime.lastError !== ""
            ? h(
                "span",
                { className: "dshlpr-errorText" },
                t("runtime.lastError", {
                  at: typeof runtime.lastErrorAt === "string" && runtime.lastErrorAt !== ""
                    ? new Date(runtime.lastErrorAt).toLocaleTimeString()
                    : "—",
                  error: runtime.lastError,
                }),
              )
            : runtime.patched === true
              ? h("span", null, t("runtime.noError"))
              : null,
        ),
      );

      const proxyRow = h(
        "div",
        { className: "dshlpr-field" },
        h("label", { className: "dshlpr-fieldLabel", htmlFor: "dshlpr-proxy-url" }, t("proxy.label")),
        h(
          "div",
          { className: "dshlpr-fieldRow" },
          h("input", {
            id: "dshlpr-proxy-url",
            className: "dshlpr-input",
            type: "text",
            inputMode: "url",
            spellCheck: false,
            autoComplete: "off",
            value: draft.proxyUrl,
            placeholder: t("proxy.placeholder"),
            disabled: load.status !== "ready",
            "aria-invalid": probe.status === "failed" ? "true" : "false",
            onChange: (event) => setProxyUrl(event.target.value),
          }),
          h(
            Button,
            { variant: "ghost", size: "sm", disabled: probe.status === "testing", onClick: onTest },
            probe.status === "testing" ? t("proxy.testing") : t("proxy.test"),
          ),
        ),
        h("p", { className: "dshlpr-hint" }, t("proxy.desc")),
        probe.status === "ok"
          ? h(
              "p",
              { className: "dshlpr-hint", role: "status" },
              probe.latencyMs === null ? t("proxy.ok", { ms: "—" }) : t("proxy.ok", { ms: probe.latencyMs }),
            )
          : null,
        probe.status === "failed" ? h("p", { className: "dshlpr-error", role: "alert" }, t("proxy.fail", { error: probe.error || "" })) : null,
      );

      const generalCard = h(
        Card,
        { title: t("general.title") },
        h(
          "div",
          { className: "dshlpr-row" },
          h(
            "div",
            { className: "dshlpr-rowText" },
            h("div", { className: "dshlpr-rowTitle" }, t("enabled.label")),
            h("div", { className: "dshlpr-rowDesc" }, t("enabled.desc")),
          ),
          h(Switch, {
            checked: enabled,
            label: t("enabled.label"),
            disabled: load.status !== "ready",
            onChange: (next) => edit((current) => ({ ...current, enabled: next })),
          }),
        ),
        proxyRow,
      );

      const providerRows = catalog
        .map((entry) => entry && typeof entry.id === "string" ? entry : null)
        .filter((entry) => entry !== null)
        .concat(
          Object.keys(draft.providers)
            .filter((id) => !catalog.some((entry) => entry && entry.id === id))
            .sort()
            .map((id) => ({
              id,
              displayName: providerEntry(draft, id).displayName,
              enabled: providerEntry(draft, id).enabled,
              hosts: [],
              source: "configured",
            })),
        );

      const providerCards =
        providerRows.length === 0
          ? [h("p", { className: "dshlpr-hint", key: "empty" }, t("providers.empty"))]
          : providerRows.map((entry) => {
              const id = entry.id;
              const current = providerEntry(draft, id);
              const name = current.displayName || entry.displayName || id;
              const defaults = knownHosts(catalog, id);
              const extras = current.extraHosts;
              const chips = [];
              for (const host of defaults) {
                chips.push(h("span", { className: "dshlpr-chip", key: "d:" + host }, h("span", { className: "dshlpr-chipText" }, host)));
              }
              for (const host of extras) {
                chips.push(
                  h(
                    "span",
                    { className: "dshlpr-chip dshlpr-chipExtra", key: "e:" + host },
                    h("span", { className: "dshlpr-chipText" }, host),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "dshlpr-chipRemove",
                        title: t("providers.removeHost", { name: name, host: host }),
                        "aria-label": t("providers.removeHost", { name: name, host: host }),
                        onClick: () => removeProviderHost(id, host),
                      },
                      "\u00d7",
                    ),
                  ),
                );
              }
              if (chips.length === 0) chips.push(h("span", { className: "dshlpr-chipsLabel", key: "none" }, t("providers.noHosts")));
              return h(
                "div",
                { className: "dshlpr-provider", key: id },
                h(
                  "div",
                  { className: "dshlpr-providerHead" },
                  h(
                    "div",
                    { className: "dshlpr-providerName" },
                    h("span", null, name),
                    h("span", { className: "dshlpr-id" }, id),
                    h("span", { className: "dshlpr-tag" }, sourceLabel(entry.source, t)),
                  ),
                  h(Switch, {
                    checked: current.enabled === true,
                    label: t("providers.switchLabel", { name: name }),
                    disabled: load.status !== "ready",
                    onChange: (next) => setProviderEnabled(id, next),
                  }),
                ),
                h(
                  "div",
                  { className: "dshlpr-chips" },
                  h("span", { className: "dshlpr-chipsLabel" }, t("providers.hosts")),
                  chips,
                ),
                h(
                  "div",
                  { className: "dshlpr-fieldRow" },
                  h("input", {
                    className: "dshlpr-input",
                    type: "text",
                    spellCheck: false,
                    autoComplete: "off",
                    value: pendingHost[id] || "",
                    placeholder: t("providers.addPlaceholder"),
                    "aria-label": t("providers.addLabel", { name: name }),
                    "aria-invalid": rowError[id] ? "true" : "false",
                    disabled: load.status !== "ready",
                    onChange: (event) => setPendingHost((state) => ({ ...state, [id]: event.target.value })),
                    onKeyDown: (event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addProviderHost(id);
                      }
                    },
                  }),
                  h(
                    Button,
                    { variant: "ghost", size: "sm", disabled: load.status !== "ready", onClick: () => addProviderHost(id) },
                    t("providers.add"),
                  ),
                ),
                rowError[id] ? h("p", { className: "dshlpr-error", role: "alert" }, t(rowError[id])) : null,
              );
            });

      const providersCard = h(Card, { title: t("providers.title"), description: t("providers.desc") }, h("div", { className: "dshlpr-hostList" }, providerCards));

      const hostRows = draft.hosts.map((rule, index) =>
        h(
          "div",
          { className: "dshlpr-hostRow", key: rule.uid || "host-" + index },
          h(Switch, {
            checked: rule.enabled !== false,
            label: t("hosts.enabled"),
            disabled: load.status !== "ready",
            onChange: (next) => updateHostRule(index, { enabled: next }),
          }),
          h("input", {
            className: "dshlpr-input",
            type: "text",
            spellCheck: false,
            autoComplete: "off",
            value: rule.pattern,
            placeholder: t("hosts.placeholder"),
            "aria-label": t("hosts.pattern"),
            disabled: load.status !== "ready",
            onChange: (event) => updateHostRule(index, { pattern: event.target.value }),
          }),
          h(IconButton, { title: t("hosts.remove"), onClick: () => removeHostRule(index) }, "\u00d7"),
        ),
      );

      const hostsCard = h(
        Card,
        { title: t("hosts.title"), description: t("hosts.desc") },
        hostRows.length === 0 ? h("p", { className: "dshlpr-hint" }, t("hosts.empty")) : h("div", { className: "dshlpr-hostList" }, hostRows),
        h(
          "div",
          { className: "dshlpr-fieldRow" },
          h("input", {
            className: "dshlpr-input",
            type: "text",
            spellCheck: false,
            autoComplete: "off",
            value: newHost,
            placeholder: t("hosts.placeholder"),
            "aria-label": t("hosts.add"),
            "aria-invalid": rowError.__newHost ? "true" : "false",
            disabled: load.status !== "ready",
            onChange: (event) => setNewHost(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addHostRule();
              }
            },
          }),
          h(Button, { variant: "ghost", size: "sm", disabled: load.status !== "ready", onClick: addHostRule }, t("hosts.add")),
        ),
        rowError.__newHost ? h("p", { className: "dshlpr-error", role: "alert" }, t(rowError.__newHost)) : null,
      );

      const busy = save.status === "saving" || save.status === "resetting";
      const feedback =
        save.status === "saving"
          ? { kind: "idle", text: t("save.saving") }
          : save.status === "resetting"
            ? { kind: "idle", text: t("save.resetting") }
            : save.status === "saved"
              ? { kind: "saved", text: t("save.saved") }
              : save.status === "failed"
                ? { kind: "failed", text: t("save.failed", { error: save.error || "" }) }
                : null;

      const footer = h(
        "div",
        { className: "dshlpr-footer" },
        h(Button, { variant: "primary", disabled: busy || load.status !== "ready", onClick: onSave }, t("save.save")),
        confirmReset
          ? [
              h("span", { className: "dshlpr-hint", key: "ask" }, t("save.resetConfirm")),
              h(Button, { key: "yes", variant: "danger", size: "sm", disabled: busy, onClick: onReset }, t("save.confirm")),
              h(Button, { key: "no", variant: "ghost", size: "sm", disabled: busy, onClick: () => setConfirmReset(false) }, t("save.cancel")),
            ]
          : h(Button, { variant: "ghost", disabled: busy || load.status !== "ready", onClick: () => setConfirmReset(true) }, t("save.reset")),
        feedback === null
          ? null
          : h(
              "span",
              {
                className: "dshlpr-feedback",
                "data-kind": feedback.kind,
                role: feedback.kind === "failed" ? "alert" : "status",
                "aria-live": "polite",
              },
              feedback.text,
            ),
      );

      return h(
        "div",
        { className: "dshlpr-page", "data-slot-section": SETTINGS_SECTION_ID },
        styleTag,
        head,
        load.status === "error"
          ? h(
              "div",
              { className: "dshlpr-failure", role: "alert" },
              h("span", null, t("load.failed", { error: load.error || "" })),
              h(
                "button",
                {
                  type: "button",
                  className: "dshlpr-button dshlpr-buttonGhost dshlpr-buttonSm",
                  onClick: () => setReloadToken((value) => value + 1),
                },
                t("load.retry"),
              ),
            )
          : null,
        statusCard,
        generalCard,
        providersCard,
        hostsCard,
        footer,
      );
    }
    //#endregion

    //#region plugin
    /** Client services this half needs; both are core to the Web composition. */
    const inject = ["slots", "locale"];

    /**
     * Client plugin body: register the dictionaries, then seat the settings page.
     * Translation is resolved through the framework `t` seat; the bound translator
     * stays as the fallback so the page keeps rendering if the seat is absent.
     */
    function apply(ctx) {
      let bound = (key) => key;
      ctx.effect(() => {
        let dispose = () => {};
        try {
          dispose = ctx.locale.register(NS, { zh, en });
        } catch {
          // Already registered (a reload kept the previous dictionaries).
        }
        try {
          bound = ctx.locale.bind(NS);
        } catch {
          bound = (key) => key;
        }
        return () => {
          try {
            dispose();
          } catch {
            /* nothing to dispose */
          }
        };
      }, "dsh-llm-proxy-router: dictionaries");

      const translate = (key, params) => {
        let text = null;
        try {
          text = bound(key);
        } catch {
          text = null;
        }
        let out = text === null || text === undefined ? String(key) : String(text);
        if (params) {
          for (const name of Object.keys(params)) out = out.split("{" + name + "}").join(String(params[name]));
        }
        return out;
      };

      ctx.slots.inject("settings.section", () => {
        try {
          const unregister = ctx.slots.register(
            {
              name: "settings.section",
              id: SETTINGS_SECTION_ID,
              order: SECTION_ORDER,
              label: () => translate("title"),
              locale: NS,
            },
            (slotProps) =>
              h(ProxyRouterSection, {
                t: (key, params) => {
                  const seat = slotProps && typeof slotProps.t === "function" ? slotProps.t : null;
                  if (seat !== null) {
                    try {
                      const value = seat(key);
                      if (value !== undefined && value !== null && value !== key) {
                        let out = String(value);
                        if (params) {
                          for (const name of Object.keys(params)) out = out.split("{" + name + "}").join(String(params[name]));
                        }
                        return out;
                      }
                    } catch {
                      /* fall through to the bound translator */
                    }
                  }
                  return translate(key, params);
                },
              }),
          );
          return () => {
            unregister();
          };
        } catch {
          return () => {};
        }
      });
    }

    return { inject, apply };
    //#endregion
  },
});
