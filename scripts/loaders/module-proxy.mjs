const CLIENT_REFERENCE = Symbol.for("react.client.reference");
const PROMISE_PROTOTYPE = Promise.prototype;
const deepProxyHandlers = {
  get(target, name, _receiver) {
    switch (name) {
      case "$$typeof":
        return target.$$typeof;
      case "$$id":
        return target.$$id;
      case "$$async":
        return target.$$async;
      case "name":
        return target.name;
      case "displayName":
        return void 0;
      case "defaultProps":
        return void 0;
      case "toJSON":
        return void 0;
      case Symbol.toPrimitive.toString():
        return Object.prototype[Symbol.toPrimitive];
      case "Provider":
        throw new Error(
          "Cannot render a Client Context Provider on the Server. Instead, you can export a Client Component wrapper that itself renders a Client Context Provider."
        );
    }
    const expression = `${String(target.name)}.${String(name)}`;
    throw new Error(
      `Cannot access ${expression} on the server. You cannot dot into a client module from a server component. You can only pass the imported name through.`
    );
  },
  set() {
    throw new Error("Cannot assign to a client module from a server module.");
  }
};
const proxyHandlers = {
  get(target, name, _receiver) {
    switch (name) {
      case "$$typeof":
        return target.$$typeof;
      case "$$id":
        return target.$$id;
      case "$$async":
        return target.$$async;
      case "name":
        return target.name;
      case "defaultProps":
        return void 0;
      case "toJSON":
        return void 0;
      case Symbol.toPrimitive.toString():
        return Object.prototype[Symbol.toPrimitive];
      case "__esModule": {
        const moduleId = target.$$id;
        target.default = Object.defineProperties(
          () => {
            throw new Error(
              `Attempted to call the default export of ${moduleId} from the server but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.`
            );
          },
          {
            $$typeof: { value: CLIENT_REFERENCE },
            $$id: { value: `${target.$$id}#` },
            $$async: { value: target.$$async }
          }
        );
        return true;
      }
      case "then":
        if (target.then) {
          return target.then;
        }
        if (!target.$$async) {
          const clientReference = Object.defineProperties(
            {},
            {
              $$typeof: { value: CLIENT_REFERENCE },
              $$id: { value: target.$$id },
              $$async: { value: true }
            }
          );
          const proxy = new Proxy(clientReference, proxyHandlers);
          target.status = "fulfilled";
          target.value = proxy;
          const then = target.then = Object.defineProperties(
            (resolve, _reject) => {
              return Promise.resolve(
                resolve(proxy)
              );
            },
            {
              $$typeof: { value: CLIENT_REFERENCE },
              $$id: { value: target.$$id },
              $$async: { value: false }
            }
          );
          return then;
        } else {
          return void 0;
        }
    }
    let cachedReference = target[name];
    if (!cachedReference) {
      const reference = Object.defineProperties(
        () => {
          throw new Error(
            `Attempted to call ${String(name)}() from the server but ${String(
              name
            )} is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.`
          );
        },
        {
          $$typeof: { value: CLIENT_REFERENCE },
          $$id: { value: `${target.$$id}#${name}` },
          $$async: { value: target.$$async }
        }
      );
      cachedReference = target[name] = new Proxy(reference, deepProxyHandlers);
    }
    return cachedReference;
  },
  getPrototypeOf(_target) {
    return PROMISE_PROTOTYPE;
  },
  set() {
    throw new Error("Cannot assign to a client module from a server module.");
  }
};
function createProxy(moduleId) {
  const clientReference = Object.defineProperties(
    {},
    {
      $$typeof: { value: CLIENT_REFERENCE },
      $$id: { value: moduleId },
      $$async: { value: false }
    }
  );
  return new Proxy(clientReference, proxyHandlers);
}

export { createProxy };
//# sourceMappingURL=module-proxy.mjs.map
