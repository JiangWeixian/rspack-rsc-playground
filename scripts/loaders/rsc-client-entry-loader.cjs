var fs = require('fs');
var path = require('path');
var fsExtra = require('fs-extra');

const isClientEntry = (resourcePath) => {
  return resourcePath === path.join(process.cwd(), './src/client-entry.tsx');
};
const getEntryClientModulesInfo = (resourcePath) => {
  let name = "";
  let chunkName = "";
  if (isClientEntry(resourcePath)) {
    name = "server-entry";
    chunkName = "client-entry";
  }
  return {
    manifest: name ? path.join(process.cwd(), './dist/server', `[${name}]_client_imports.json`) : "",
    chunkName
  };
};
async function RSCClientEntryLoader(source) {
  const callback = this.async();
  const resourcePath = this.resourcePath;
  this.cacheable(true);
  const isClient = isClientEntry(resourcePath);
  if (!isClient) {
    callback(null, source);
    return;
  }
  const { manifest } = getEntryClientModulesInfo(resourcePath);
  const isExist = fs.existsSync(manifest);
  if (!isExist) {
    this.addMissingDependency(manifest);
    callback(null, source);
    return;
  }
  let modules = !isExist ? [] : fsExtra.readJSONSync(manifest);
  if (!Array.isArray(modules)) {
    modules = modules ? [modules] : [];
  }
  this.addDependency(manifest);
  const requests = modules;
  let code = requests.map(
    (request) => `import(/* webpackMode: "eager" */ ${JSON.stringify(request)})`
  ).join(";\n");
  if (this._compiler.options.mode === "development") {
    code += `
      import "${manifest}";
    `;
  }
  code += `
  ${source}
  `;
  return callback(null, code);
}

module.exports = RSCClientEntryLoader;
