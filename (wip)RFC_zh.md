- 开始日期: 2024/06/30
- 实施PR: RSC

# 摘要

Rspack 支持 RSC

# 基本例子

支持 `RSC` 的

- `"use client"` 定义 `Client Components`
- `"use server"` 定义 `Server Actions`

## compile part

三份配置文件构建前端产物，服务端（用于 SSR）产物，服务端（用于 RSC）产物。

`rspack.rsc.config`

```ts
const config = defineConfig({
  // ...other configs
  plugins: [
    new rspack.RSCProxyRspackPlugin({
      // ...options
    }),
  ],
})
```

`rspack.server.config`

```ts
const config = defineConfig({
  // ...other configs
  plugins: [
    new rspack.RSCClientEntryRspackPlugin({
      // ...options
    }),
  ],
})
```

`rspack.client.config`

```ts
const config = defineConfig({
  // ...other configs
  plugins: [
    new rspack.RSCClientReferenceManifestRspackPlugin({
      // ...options
		}),
  ],
})
```

加载配置文件并且启动编译。将会在 `dist` 目录输出

- `dist/client` for browser
- `dist/server` for server ssr stream
- `dist/server/rsc` for server rsc stream

```tsx
const compiler = rspack.rspack([clientConfig, serverConfig, serverRSCConfig])
const rspackServer = new RspackDevServer.RspackDevServer(clientConfig.devServer!, compiler)
await rspackServer.start()
```

## runtime part

详见 [server-entry.tsx]('./src/server-entry.tsx')

# 动机

让 `RSC` 功能在 `Rspack` 开箱即用。

# 详细设计

提供三个插件:

- `RSCProxyRspackPlugin`
  - 将服务端引用的 `"use client"` 文件使用 `client-proxy.mjs` 文件包裹
- `RSCClientEntryRspackPlugin`
  - 用于在服务端代码编译阶段找到 `RSC` 的 `Client Components`
  - 用于在服务端代码编译阶段找到 `RSC` 的 `Server Actions`
- `RSCClientReferenceManifestRspackPlugin`
  - 生成客户端组建的 `manifest` 文件
  - 将客户端引用的 `"use server"` 文件使用 `server-proxy.mjs` 文件包裹

## 如何找到客户端组件和 Server Actions

*参考 Next.js 部分实现*

**寻找客户端和服务端组间边界点**

以 `compilation.entries` 为入口进行遍历

```rs
for (name, entry) in &compilation.entries {
  // ...
}
```

判断 `resolved_module` 的 `build_info` 是否有 `"use client"` 的 `directives`。如果是样式文件也认为是`Client Components`。

如果是 `Client Components`，则认为是找到了边界点，并且中断寻找。如果不是，则遍历 `moduleGraph.get_outgoing_connections(...)` 继续寻找。

**寻找Server Actions**

同样以 `compilation.entries` 作为入口遍历，判断 `resolved_module` 的 `build_info` 是否有 `"use server"` 的 `directives`。

但是与 `Client Components` 不同的是，找到 `Server Action` 并不会中断寻找。会遍历整个 `moduleGraph` 寻找 `Server Actions`。

## 客户端组件编译阶段如何消费

`RSCClientEntryRspackPlugin` 将找到的客户端信息保存到全局对象中。

**被客户端编译实例消费**

```rs
pub static SHARED_CLIENT_IMPORTS: Lazy<Mutex<ClientImports>> = Lazy::new(|| Mutex::default());
```

以 `entry` 的 `name` 为 `key` 进行分组。在客户端编译的 `finish_make` 阶段通过 `add_include` 加入到 `client` 的入口文件中。 

```rs
let context = compilation.options.context.clone();
let request = format!(
  "rsc-client-entry-loader.js?from={}&name={}",
  "client-entry", "server-entry"
);
let entry = Box::new(EntryDependency::new(request, context.clone(), false));
compilation
  .add_include(
    entry,
    EntryOptions {
      name: Some(String::from("client-entry")),
      ..Default::default()
    },
  )
  .await?;
```

其中 `request` 格式为 `rsc-client-entry-loader.js?from=<entry-uniqname>&name=<entry-name>`。保证来自同一的 `entry` 的 `Client Components` 被打包到一起。

在 `builtin:rsc-client-entry-loader` 中单独处理 `rsc-client-entry-loader.js` 文件，以 `<entry-name>` 作为 `key` 从 `SHARED_CLIENT_IMPORTS` 中取出 `Client Components`。将 `rsc-client-entry-loader.js` 内容格式化为

```js
import(/* webpackMode: "eager" */ "client-component-path")
```

**被服务端编译实例消费**



# 缺点

- 额外的 `RSC` 产物是否必要，看起来有和 `server` 产物重复的地方

# 未解决的问题

- [ ] `<form />` 中 `action` 处理
- [ ] 内置运行时代码(`scripts/runtime/**`)
- [ ] 支持 `React19`