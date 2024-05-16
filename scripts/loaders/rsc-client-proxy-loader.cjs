var path = require('path');
var rsModuleLexer = require('rs-module-lexer');

function extractExports(code, filename) {
  const result = rsModuleLexer.parse({
    input: [
      {
        filename,
        code
      }
    ]
  });
  const { output } = result;
  const exportRefs = output.map((item) => {
    return item.exports;
  }).flat().map((item) => item.n);
  return exportRefs;
}
const RSC_MODULE_TYPES = {
  client: "client",
  server: "server"
};
const moduleProxy = path.join(process.cwd(), "scripts", "loaders", "module-proxy.mjs");
function getRSCModuleInformation(source) {
  const type = source.includes("use client") ? RSC_MODULE_TYPES.client : RSC_MODULE_TYPES.server;
  return { type };
}
async function transformSource(source, sourceMap) {
  if (typeof source !== "string") {
    throw new TypeError("Expected source to have been transformed to a string.");
  }
  const callback = this.async();
  const { type } = getRSCModuleInformation(source);
  if (type === RSC_MODULE_TYPES.client) {
    let exports = [];
    try {
      exports = extractExports(source, this.resourcePath);
    } catch (e) {
      const message = `Extract exported component from client component file ${this.resourcePath} failed, reason: ${e}`;
      const error = new Error(message);
      return callback(error);
    }
    let esmSource = `    import { createProxy } from "${moduleProxy}"
    const proxy = createProxy("${this.resourcePath}")
    
    // Accessing the __esModule property and exporting $$typeof are required here.
    // The __esModule getter forces the proxy target to create the default export
    // and the $$typeof value is for rendering logic to determine if the module
    // is a client boundary.
    const { __esModule, $$typeof } = proxy;
    const __default__ = proxy.default
    `;
    let cnt = 0;
    for (const ref of exports) {
      if (ref === "") {
        esmSource += "\nexports[''] = proxy[''];";
      } else if (ref === "default") {
        esmSource += `
    export { __esModule, $$typeof };
    export default __default__;`;
      } else {
        esmSource += `
    const e${cnt} = proxy["${ref}"];
    export { e${cnt++} as ${ref} };`;
      }
    }
    return callback(null, esmSource, sourceMap);
  }
  return callback(
    null,
    source,
    sourceMap
  );
}

module.exports = transformSource;
