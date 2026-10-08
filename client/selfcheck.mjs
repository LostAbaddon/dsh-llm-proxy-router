/**
 * Dev-only self-check for `client.js` (not part of the installed bundle).
 *
 * Runs the real artifact against a minimal React/hook runtime, a mock host API
 * and a mock Client context, then asserts the registration contract, the locale
 * dictionaries, the render states and the save/probe request shapes.
 *
 *   node client/selfcheck.mjs
 *
 * Optional: set DSH_THEME_TOKENS to a file with one `--dsw-*` token per line to
 * also verify every CSS token against the live theme token list.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "client.js"), "utf8");

//#region assertions
const failures = [];
let checks = 0;
function ok(label, condition, detail) {
  checks += 1;
  if (!condition) failures.push(label + (detail === undefined ? "" : " — " + detail));
}
function equal(label, actual, expected) {
  ok(label, Object.is(actual, expected), "got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
}
//#endregion

//#region minimal React
let current = null;
const React = {
  createElement(type, props, ...children) {
    const next = { ...(props || {}) };
    if (children.length === 1) next.children = children[0];
    else if (children.length > 1) next.children = children;
    return { type, props: next };
  },
  useState: (...args) => current.useState(...args),
  useRef: (...args) => current.useRef(...args),
  useEffect: (...args) => current.useEffect(...args),
  useMemo: (...args) => current.useMemo(...args),
  useCallback: (fn) => fn,
  Fragment: Symbol.for("react.fragment"),
};
function sameDeps(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, at) => Object.is(value, b[at]));
}
function createRuntime() {
  const hooks = [];
  let cursor = 0;
  let dirty = false;
  let effects = [];
  return {
    get hooks() {
      return hooks;
    },
    get effects() {
      return effects;
    },
    get dirty() {
      return dirty;
    },
    start() {
      cursor = 0;
      dirty = false;
      effects = [];
    },
    api: {
      useState(init) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = { value: typeof init === "function" ? init() : init };
        const slot = hooks[index];
        return [
          slot.value,
          (next) => {
            const value = typeof next === "function" ? next(slot.value) : next;
            if (!Object.is(value, slot.value)) {
              slot.value = value;
              dirty = true;
            }
          },
        ];
      },
      useRef(init) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = { value: { current: init } };
        return hooks[index].value;
      },
      useMemo(fn, deps) {
        const index = cursor++;
        const previous = hooks[index];
        if (!previous || !sameDeps(previous.deps, deps)) hooks[index] = { value: fn(), deps };
        return hooks[index].value;
      },
      useEffect(fn, deps) {
        const index = cursor++;
        const previous = hooks[index];
        if (!previous || !sameDeps(previous.deps, deps)) {
          hooks[index] = { deps, fn, cleanup: previous ? previous.cleanup : null };
          effects.push(index);
        }
      },
    },
  };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Resolve function components and host children into a plain element tree. */
function resolve(element) {
  if (element === null || element === undefined || typeof element !== "object") return element;
  if (Array.isArray(element)) return element.map(resolve);
  if (typeof element.type === "function") return resolve(element.type(element.props));
  const children = element.props.children;
  if (children === undefined) return element;
  return { ...element, props: { ...element.props, children: resolve(children) } };
}

/** Mount a component and expose `act()` for state-changing interactions. */
async function mount(Component, props) {
  const runtime = createRuntime();
  let tree = null;
  async function pass() {
    for (let round = 0; round < 40; round += 1) {
      runtime.start();
      current = runtime.api;
      tree = resolve(React.createElement(Component, props));
      for (const index of runtime.effects) {
        const hook = runtime.hooks[index];
        const cleanup = hook.fn();
        if (typeof cleanup === "function") hook.cleanup = cleanup;
      }
      await flush();
      await flush();
      if (!runtime.dirty) return tree;
    }
    throw new Error("component did not settle");
  }
  await pass();
  return {
    get tree() {
      return tree;
    },
    act: async (fn) => {
      fn();
      await pass();
      return tree;
    },
  };
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node === "string" || typeof node === "number") {
    visit({ text: String(node) });
    return;
  }
  visit({ node });
  walk(node.props ? node.props.children : null, visit);
}
const texts = (tree) => {
  const out = [];
  walk(tree, (item) => {
    if (item.text !== undefined) out.push(item.text);
  });
  return out;
};
const find = (tree, predicate) => {
  const out = [];
  walk(tree, (item) => {
    if (item.node && predicate(item.node)) out.push(item.node);
  });
  return out;
};
const text = (tree) => texts(tree).join(" | ");
const byRole = (tree, role, label) =>
  find(tree, (node) => node.props && node.props.role === role && (label === undefined || node.props["aria-label"] === label))[0];
const byText = (tree, label) => find(tree, (node) => node.type === "button" && texts(node).join("") === label)[0];
//#endregion

//#region load artifact
let factory = null;
globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      if (spec.id !== "dsh-llm-proxy-router") throw new Error("unexpected module id " + spec.id);
      factory = spec.factory;
    },
  },
};
// eslint-disable-next-line no-eval
(0, eval)(source);
ok("artifact registers one module factory", typeof factory === "function");
const moduleExports = factory((id) => {
  if (id === "react") return React;
  throw new Error("unexpected require(" + id + ")");
});
ok("artifact exports apply()", typeof moduleExports.apply === "function");
equal("artifact injects slots + locale", JSON.stringify(moduleExports.inject), JSON.stringify(["slots", "locale"]));
//#endregion

//#region apply against a mock Client context
const context = {
  effect(fn) {
    return fn();
  },
  locale: {
    dictionaries: [],
    register(ns, dict) {
      this.dictionaries.push({ ns, dict });
      return () => {};
    },
    bind(ns) {
      const entry = this.dictionaries.find((item) => item.ns === ns);
      return (key) => (entry && entry.dict.zh[key] !== undefined ? entry.dict.zh[key] : key);
    },
  },
  slots: {
    injected: [],
    registration: null,
    inject(key, callback) {
      this.injected.push(key);
      return callback();
    },
    register(options, component) {
      this.registration = { options, component };
      return () => {};
    },
  },
};
moduleExports.apply(context);

const dictionaries = context.locale.dictionaries[0];
ok("registers exactly one locale namespace", context.locale.dictionaries.length === 1, JSON.stringify(context.locale.dictionaries.map((d) => d.ns)));
equal("locale namespace", dictionaries.ns, "dsh-llm-proxy-router");
equal("injects into settings.section", JSON.stringify(context.slots.injected), JSON.stringify(["settings.section"]));
const registration = context.slots.registration;
equal("slot name", registration.options.name, "settings.section");
equal("slot entry id", registration.options.id, "llm-proxy-router");
equal("slot locale", registration.options.locale, "dsh-llm-proxy-router");
ok("slot order is a number", typeof registration.options.order === "number", String(registration.options.order));
equal("slot nav label is the localized title", registration.options.label(), "代理路由");
ok("slot component is registered", typeof registration.component === "function");

const zhKeys = Object.keys(dictionaries.dict.zh).sort();
const enKeys = Object.keys(dictionaries.dict.en).sort();
ok("zh and en carry the same keys", zhKeys.length === enKeys.length && zhKeys.every((key, at) => key === enKeys[at]), "zh=" + zhKeys.length + " en=" + enKeys.length);

const usedKeys = new Set();
for (const match of source.matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) usedKeys.add(match[1]);
for (const match of source.matchAll(/\btranslate\("([a-zA-Z0-9_.]+)"/g)) usedKeys.add(match[1]);
const missing = [...usedKeys].filter((key) => dictionaries.dict.zh[key] === undefined || dictionaries.dict.en[key] === undefined);
ok("every t() key exists in both dictionaries", missing.length === 0, missing.join(", "));
ok("no hardcoded CJK outside the dictionaries", (() => {
  const withoutDicts = source.slice(source.indexOf("//#region components"), source.indexOf("//#region plugin"));
  const outside = source.split("//#region locales")[1].split("//#endregion")[0];
  const body = source.replace(outside, "");
  return !/[\u4e00-\u9fff]/.test(body);
})());
void zhKeys;
//#endregion

//#region host API mock
const calls = [];
let routes = {};
globalThis.fetch = async (url, options) => {
  const request = { url: String(url), method: (options && options.method) || "GET", body: options && options.body };
  calls.push(request);
  const handler = routes[request.url + " " + request.method];
  if (!handler) return { ok: false, status: 404, json: async () => ({ ok: false, error: "no route" }) };
  return handler(request);
};
const json = (payload, status = 200) => ({ ok: status < 400, status, json: async () => payload });

const stateA = {
  ok: true,
  config: {
    enabled: true,
    proxyUrl: "http://127.0.0.1:7890",
    proxyMode: "manual",
    providers: { gemini: { enabled: true, extraHosts: [], displayName: "Gemini" }, deepseek: { enabled: false, extraHosts: [], displayName: "DeepSeek" } },
    hosts: [{ pattern: "*.openrouter.ai", enabled: true, note: "" }],
  },
  providers: [
    { id: "gemini", displayName: "Gemini", enabled: true, hosts: ["generativelanguage.googleapis.com"], source: "default" },
    { id: "deepseek", displayName: "DeepSeek", enabled: false, hosts: ["api.deepseek.com"], source: "default" },
    { id: "openrouter", displayName: "OpenRouter", enabled: true, hosts: ["openrouter.ai"], source: "configured" },
  ],
  effectiveHosts: ["generativelanguage.googleapis.com", "openrouter.ai", "*.openrouter.ai"],
  proxyConfigured: true,
  runtime: { patched: true, fetchHost: "node", undici: "8.11.2", proxyReachable: null, lastError: null },
};
routes = {
  "/api/dsh-llm-proxy-router/state GET": () => json(stateA),
  "/api/dsh-llm-proxy-router/config POST": (request) => {
    const body = JSON.parse(request.body);
    return json({ ok: true, config: body.config, applied: true });
  },
  "/api/dsh-llm-proxy-router/test POST": () => json({ ok: true, latencyMs: 123 }),
  "/api/dsh-llm-proxy-router/reset POST": () => json({ ok: true, config: stateA.config }),
};

const seat = (key, params) => {
  let value = dictionaries.dict.zh[key] !== undefined ? dictionaries.dict.zh[key] : key;
  if (params) for (const name of Object.keys(params)) value = value.split("{" + name + "}").join(String(params[name]));
  return value;
};
//#endregion

//#region render + interactions
const host = await mount(registration.component, { t: seat });
let rendered = text(host.tree);
ok("renders the page title", rendered.includes("代理路由"));
ok("renders the routed-provider status line", rendered.includes("当前经代理：Gemini、OpenRouter"), rendered.slice(0, 400));
ok("renders the non-routed provider", !/当前经代理：[^|]*DeepSeek/.test(rendered));
ok("renders the effective proxy URL", rendered.includes("生效代理：http://127.0.0.1:7890"));
ok("renders the host-rule count", rendered.includes("3 条主机规则"));
ok("renders catalog host patterns", rendered.includes("generativelanguage.googleapis.com"));
ok("renders an extra host rule", find(host.tree, (node) => node.type === "input" && node.props.value === "*.openrouter.ai").length === 1);
ok("renders the runtime line", rendered.includes("宿主已接管 fetch") && rendered.includes("undici 8.11.2"));
ok("renders provider rows and switches", find(host.tree, (node) => node.props && node.props.role === "switch").length === 5, String(find(host.tree, (node) => node.props && node.props.role === "switch").length));
ok("loads state from the contract path", calls.some((call) => call.url === "/api/dsh-llm-proxy-router/state" && call.method === "GET"));

// provider switch toggles a draft and flips the unsaved marker
const geminiSwitch = byRole(host.tree, "switch", "Gemini 走代理");
ok("provider switch carries its accessible label", geminiSwitch !== undefined);
await host.act(() => geminiSwitch.props.onClick());
rendered = text(host.tree);
ok("toggling a provider marks unsaved changes", rendered.includes("有未保存的修改"));
ok("toggling a provider previews the pending routing", rendered.includes("保存后经代理：OpenRouter"), rendered);

// add a custom host to a provider row
const geminiInput = find(host.tree, (node) => node.type === "input" && node.props["aria-label"] === "为 Gemini 添加主机规则")[0];
ok("provider row offers a host input", geminiInput !== undefined);
await host.act(() => geminiInput.props.onChange({ target: { value: "  *.example.com  " } }));
const addGemini = find(host.tree, (node) => node.type === "button" && texts(node).join("") === "添加")[0];
await host.act(() => addGemini.props.onClick());
ok("adding a host renders a removable chip", text(host.tree).includes("*.example.com"));

// invalid host pattern is refused with a message
await host.act(() => find(host.tree, (node) => node.type === "input" && node.props["aria-label"] === "为 Gemini 添加主机规则")[0].props.onChange({ target: { value: "bad host" } }));
await host.act(() => find(host.tree, (node) => node.type === "button" && texts(node).join("") === "添加")[0].props.onClick());
ok("an invalid host pattern is reported", text(host.tree).includes("主机规则无效"));

// proxy probe
const probeButton = byText(host.tree, "测试代理");
ok("renders the proxy test button", probeButton !== undefined);
await host.act(() => probeButton.props.onClick());
ok("a successful probe reports latency", text(host.tree).includes("连接成功（123 ms）"), text(host.tree));
equal("probe posts the agreed body", calls.filter((call) => call.url === "/api/dsh-llm-proxy-router/test").pop().body, JSON.stringify({ proxyUrl: "http://127.0.0.1:7890" }));

// save applies immediately and reloads state
const saveButton = byText(host.tree, "保存");
ok("renders the save button", saveButton !== undefined);
await host.act(() => saveButton.props.onClick());
const savedCall = calls.filter((call) => call.url === "/api/dsh-llm-proxy-router/config").pop();
ok("save posts the agreed config envelope", savedCall !== undefined && JSON.parse(savedCall.body).config.proxyUrl === "http://127.0.0.1:7890");
ok("save posts provider and host rules", JSON.parse(savedCall.body).config.providers.gemini.extraHosts.includes("*.example.com") && JSON.parse(savedCall.body).config.hosts.length === 1);
ok("save reports success", text(host.tree).includes("已保存"), text(host.tree));
ok("save clears the unsaved marker", !text(host.tree).includes("有未保存的修改"));

// reset asks first, then posts
const resetButton = byText(host.tree, "恢复默认");
await host.act(() => resetButton.props.onClick());
ok("reset asks for confirmation first", text(host.tree).includes("恢复默认会覆盖当前配置"));
await host.act(() => byText(host.tree, "确认恢复").props.onClick());
ok("reset posts to the contract path", calls.some((call) => call.url === "/api/dsh-llm-proxy-router/reset" && call.method === "POST"));
ok("reset reports success", text(host.tree).includes("已保存"));
//#endregion

//#region failure path
routes = {};
const broken = await mount(registration.component, { t: seat });
const brokenText = text(broken.tree);
ok("an unreachable host API shows an error state instead of throwing", brokenText.includes("读取配置失败"), brokenText.slice(0, 300));
ok("the error state offers retry", byText(broken.tree, "重试") !== undefined);
ok("no crash placeholder is rendered", broken.tree !== null);

routes = {
  "/api/dsh-llm-proxy-router/state GET": () => json(stateA),
  "/api/dsh-llm-proxy-router/config POST": () => json({ ok: false, error: "代理地址无法解析" }, 400),
};
const rejected = await mount(registration.component, { t: seat });
await rejected.act(() => byText(rejected.tree, "保存").props.onClick());
ok("a refused save keeps the host's reason", text(rejected.tree).includes("保存失败：代理地址无法解析"), text(rejected.tree));
//#endregion

//#region style audit
const css = source.split("const CSS = `")[1].split("`;")[0];
ok("no literal hex colors", !/#[0-9a-fA-F]{3,8}\b/.test(css));
ok("no rgb()/hsl() colors", !/\b(rgb|rgba|hsl|hsla)\(/.test(css));
ok("every var() is a --dsw token", [...css.matchAll(/var\((--[a-z0-9-]+)/g)].every((match) => match[1].startsWith("--dsw-")));
const tokens = [...new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]))].sort();
const tokenFile = process.env.DSH_THEME_TOKENS;
if (tokenFile && fs.existsSync(tokenFile)) {
  const known = new Set(fs.readFileSync(tokenFile, "utf8").split("\n").map((line) => line.trim()).filter(Boolean));
  const unknown = tokens.filter((token) => !known.has(token));
  ok("every token exists in the live theme token list", unknown.length === 0, unknown.join(", "));
}
ok("class names carry the plugin prefix", [...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].every((match) => match[1].startsWith("dshlpr")), [...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]).find((name) => !name.startsWith("dshlpr")));
//#endregion

//#region report
console.log("client/selfcheck: " + (checks - failures.length) + "/" + checks + " checks passed");
if (tokenFile && fs.existsSync(tokenFile)) console.log("theme tokens verified against " + tokenFile + " (" + tokens.length + " used)");
if (failures.length > 0) {
  for (const failure of failures) console.error("FAIL " + failure);
  process.exitCode = 1;
} else {
  console.log("all checks passed");
}
//#endregion
