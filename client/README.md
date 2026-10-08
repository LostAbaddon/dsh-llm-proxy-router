# Client half — `dsh-llm-proxy-router`

Browser artifact for the plugin's Settings page. Plain JavaScript ES module, no JSX, no build
step: React arrives through the browser module table, and no Harness Client package is imported
as a module.

| File | Role |
| --- | --- |
| [`client.js`](./client.js) | The installable artifact: `window.__ModuleLoader__.load({ id: 'dsh-llm-proxy-router', … })`. |
| `selfcheck.mjs` | Dev-only harness (`node client/selfcheck.mjs`). Not referenced by `package.json` and not installed. |

## Registration

```js
const inject = ['slots', 'locale'];           // ctx.locale, ctx.slots

ctx.locale.register('dsh-llm-proxy-router', { zh, en });   // inside ctx.effect

ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section',
  id: 'llm-proxy-router',
  order: 152,                                  // below the usage section (151)
  label: () => ctx.locale.bind('dsh-llm-proxy-router')('title'),
  locale: 'dsh-llm-proxy-router',
}, Page));
```

`settings.section` is the `list` slot the settings shell (`sidebar.settings` occupant) declares and
renders through `renderSlot('settings.section', { close }, { only: active })`. The page renders its
own heading, uses the framework `t` seat when present (with the bound translator as fallback), keeps
one `<style>` element inside its own tree, and touches no DOM outside its component.

## Manifest entries the host half's `package.json` must declare

```json
"exports": { "./client": "./client.js" },
"dsh": {
  "client": {
    "platform": "web",
    "immediately": true,
    "inject": [
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-settings",
      "@deepseek-ai/dsh-client-connection",
      "@deepseek-ai/dsh-client-ui-renderer",
      "@deepseek-ai/dsh-client-ui-primitives"
    ]
  }
}
```

The `inject` entries only order activation — this module imports none of them; `ui-settings` must
activate first because it owns the `settings.section` slot type. `immediately: true` follows the
official decoration template, so the page materializes at boot instead of waiting for an in-page
trigger (`dsh-usage` works without it).

## Host API used

| Call | When |
| --- | --- |
| `GET /api/dsh-llm-proxy-router/state` | On mount, and again after a successful save or reset. |
| `POST /api/dsh-llm-proxy-router/config` with `{ config }` | Save; on success the page re-reads `/state` and syncs the draft. |
| `POST /api/dsh-llm-proxy-router/test` with `{ proxyUrl }` | 测试代理. |
| `POST /api/dsh-llm-proxy-router/reset` | 恢复默认, after an inline confirmation. |

Timeouts: 30 s for state/config/reset, 25 s for the probe. `ok: false` and non-2xx responses reject
with the host's own `error` text, which the page shows verbatim.

## Page contents

Master switch (启用代理路由) · proxy URL field with client-side validation and 测试代理 · one rule row
per catalog provider (switch, the host patterns it matches, removable custom patterns) · extra host
rules (pattern, enable switch, remove) · status line (当前经代理：…, host-rule count, effective proxy
URL, unsaved marker, runtime facts) · save/restore footer with 保存中/已保存/保存失败 + reason. An
unreachable host API renders an error state with 重试 instead of throwing.

## Verification

- `node --check client/client.js` — syntax.
- `node client/selfcheck.mjs` — 51 checks: drives the real artifact through a minimal React/hook
  runtime with a mocked Client context and mocked `fetch`. Covers the registration options, zh/en key
  parity, every `t()` key existing in both dictionaries, no CJK outside the dictionaries, the loading
  → ready → error states, switch/add/remove/validation interactions, the probe, save (request body and
  saved feedback), reset confirmation, and a refused save keeping the host's reason.
- `DSH_THEME_TOKENS=<list> node client/selfcheck.mjs` — also asserts that all 29 `var(--dsw-*)` tokens
  in the stylesheet exist in the live theme token list, that no hex/rgb/hsl color appears, and that
  every class name carries the `dshlpr-` prefix. Verified against the token list extracted from the
  running `@deepseek-ai/dsh-client-ui-theme` bundle.
- Not verified here: live slot registration and appearance. `Slots.listSubTree` / `Service` /
  `Theme` Client inspect queries timed out in this session (no page response), so the slot contract
  was read from the installed bundles instead (`dsh-client-ui-settings-general` declares the slot;
  `dsh-usage`, `dsh-pet`, `dsh-session-archive` register into it with the same options). Confirm the
  nav entry and light/dark rendering after installation.

## Notes for the host half

- `state.providers[].enabled` seeds the switch for every provider the config does not mention, so it
  must be the effective value, not a raw default. Report every provider DSH can call, with
  `displayName`, `hosts`, and `source` in `default | configured | registered`.
- `effectiveHosts` drives the "N 条主机规则" count: the union of enabled providers' hosts (defaults plus
  their extra patterns) and enabled extra host rules.
- The 生效代理 line reads `state.config.proxyUrl`; `proxyConfigured` is informational for this page.
- `POST /config` accepts the whole document, including `displayName` and every provider id; provider
  ids the catalog does not report are preserved and rendered as `configured`.
- `POST /config` errors reach the user as 保存失败：<reason>, so `error` should be one short sentence.
- `POST /test` should answer within 25 s. The page cannot distinguish a slow proxy from a slow host.
