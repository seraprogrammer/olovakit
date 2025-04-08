let rootComponent;
let rootContainer;
let previousVDOM;
let currentComponent;
const componentStateMap = new Map();
const contextProviders = new Map();
let currentContextKey = 0;

const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polygon",
  "polyline",
  "ellipse",
  "g",
  "text",
  "defs",
  "filter",
  "mask",
  "marker",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
  "use",
  "clipPath",
  "textPath",
  "tspan",
  "foreignObject",
]);

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.keyOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move accessed key to most recently used
    this.keyOrder = this.keyOrder.filter((k) => k !== key);
    this.keyOrder.push(key);

    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing key position
      this.keyOrder = this.keyOrder.filter((k) => k !== key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used item
      const lruKey = this.keyOrder.shift();
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
    this.keyOrder.push(key);
    return value;
  }

  has(key) {
    return this.cache.has(key);
  }
}

const renderCache = new LRUCache(100);

function memoizeRender(Component, props, pathKey) {
  const cacheKey = `${pathKey}-${JSON.stringify(props)}`;

  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey);
  }

  const result = Component(props);
  return renderCache.set(cacheKey, result);
}

function createElement(type, props, ...children) {
  props = props || {};

  let processedChildren = children
    .flat(Infinity)
    .filter(child => child !== true && child !== false)
    .map((child) =>
      child == null
        ? createTextElement("")
        : typeof child === "object"
        ? child
        : createTextElement(child)
    );

  if (props.children !== undefined) {
    const propsChildren = Array.isArray(props.children)
      ? props.children
      : [props.children];

    processedChildren = propsChildren
      .flat(Infinity)
      .filter(child => child !== true && child !== false)
      .map((child) =>
        child == null
          ? createTextElement("")
          : typeof child === "object"
          ? child
          : createTextElement(child)
      );
  }

  const newProps = { ...props };
  delete newProps.children;

  return {
    type,
    props: {
      ...newProps,
      children: processedChildren,
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT",
    props: {
      nodeValue: String(text),
      children: [],
    },
  };
}

function setState(initialValue) {
  const component = currentComponent;
  const hookIndex = component.hookIndex++;

  if (!component.hooks[hookIndex]) {
    const initialState =
      typeof initialValue === "function" ? initialValue() : initialValue;
    component.hooks[hookIndex] = { state: initialState };
  }

  const hook = component.hooks[hookIndex];
  const setState = (action) => {
    const newState = typeof action === "function" ? action(hook.state) : action;

    if (newState !== hook.state) {
      const updateFn = () => {
        hook.state = newState;
      };

      if (isBatchingUpdates) {
        pendingStateUpdates.push(updateFn);
      } else {
        updateFn();
        renderApp();
      }
    }
  };

  return [hook.state, setState];
}

function setReducer(reducer, initialState, init) {
  const [state, setState] = setState(
    init ? () => init(initialState) : initialState
  );

  const dispatch = (action) => {
    setState((prevState) => reducer(prevState, action));
  };

  return [state, dispatch];
}

function setMemo(factory, deps) {
  const component = currentComponent;
  const hookIndex = component.hookIndex++;

  if (!component.hooks[hookIndex]) {
    component.hooks[hookIndex] = { value: factory(), deps };
    return component.hooks[hookIndex].value;
  }

  const hook = component.hooks[hookIndex];
  if (!arraysEqual(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = deps;
  }

  return hook.value;
}

function setCallback(callback, deps) {
  return setMemo(() => callback, deps);
}

function setEffect(effect, deps) {
  const component = currentComponent;
  const hookIndex = component.hookIndex++;

  if (!component.hooks[hookIndex]) {
    component.hooks[hookIndex] = { effect, deps: null, cleanup: null };
  }

  const hook = component.hooks[hookIndex];
  if (!arraysEqual(hook.deps, deps)) {
    if (hook.cleanup) {
      setTimeout(() => {
        if (typeof hook.cleanup === "function") {
          hook.cleanup();
        }
      }, 0);
    }

    hook.effect = effect;
    hook.deps = deps;

    setTimeout(() => {
      const cleanup = effect();
      hook.cleanup = cleanup;
    }, 0);
  }
}

function createContext(defaultValue) {
  const contextId = currentContextKey++;

  return {
    Provider: function (props) {
      const { value, children } = props;

      setEffect(() => {
        contextProviders.set(contextId, value);
        return () => {
          if (contextProviders.get(contextId) === value) {
            contextProviders.delete(contextId);
          }
        };
      }, [value]);

      return children;
    },
    Consumer: function (props) {
      return props.children(setContext(this));
    },
    _contextId: contextId,
    _defaultValue: defaultValue,
  };
}

function setContext(context) {
  const component = currentComponent;

  setEffect(() => {
    return () => {};
  }, [contextProviders.get(context._contextId)]);

  return contextProviders.get(context._contextId) !== undefined
    ? contextProviders.get(context._contextId)
    : context._defaultValue;
}

function setRef(initialValue) {
  const component = currentComponent;
  const hookIndex = component.hookIndex++;

  if (!component.hooks[hookIndex]) {
    component.hooks[hookIndex] = { current: initialValue };
  }

  return component.hooks[hookIndex];
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function Fragment(props) {
  return props.children;
}

function buildVDOM(vdom, path) {
  if (!vdom) return null;

  if (Array.isArray(vdom)) {
    return {
      type: Fragment,
      props: {
        children: vdom.map((child, index) =>
          buildVDOM(child, path.concat(index))
        ),
      },
    };
  }

  try {
    if (typeof vdom !== "object") {
      return createTextElement(String(vdom));
    }

    if (vdom.type === Fragment) {
      return {
        type: Fragment,
        props: {
          children: Array.isArray(vdom.props.children)
            ? vdom.props.children.map((child, index) =>
                buildVDOM(child, path.concat(index))
              )
            : [buildVDOM(vdom.props.children, path.concat(0))],
        },
      };
    } else if (typeof vdom.type === "string" || vdom.type === "TEXT") {
      const children = Array.isArray(vdom.props.children)
        ? vdom.props.children.map((child, index) =>
            buildVDOM(child, path.concat(index))
          )
        : [buildVDOM(vdom.props.children, path.concat(0))];
      return { type: vdom.type, props: { ...vdom.props, children } };
    } else if (typeof vdom.type === "function") {
      const pathKey = path.join(".");
      let componentState = componentStateMap.get(pathKey);
      if (!componentState) {
        componentState = { hooks: [], hookIndex: 0 };
        componentStateMap.set(pathKey, componentState);
      }
      currentComponent = componentState;
      currentComponent.hookIndex = 0;
      currentComponent._pathKey = pathKey;

      vdom._pathKey = pathKey;

      try {
        const isPure =
          vdom.type.isPure ||
          (vdom.type.name && vdom.type.name.startsWith("Memo"));

        const componentProps = { ...vdom.props };

        const childVDOM = isPure
          ? memoizeRender(vdom.type, componentProps, pathKey)
          : vdom.type(componentProps);

        return buildVDOM(childVDOM, path);
      } catch (componentError) {
        console.error("Error rendering component:", componentError);
        return createElement(
          "div",
          { className: "error-boundary" },
          `Component Error: ${componentError.message}`
        );
      }
    } else {
      console.warn("Invalid vdom type:", vdom);
      return createTextElement("");
    }
  } catch (error) {
    console.error("Error in buildVDOM:", error, "for vdom:", vdom);
    return createElement(
      "div",
      { className: "error-boundary" },
      `Rendering Error: ${error.message}`
    );
  }
}

function createDOM(vdom) {
  if (!vdom) {
    return document.createComment("empty node");
  }

  if (vdom.type === "TEXT") {
    return document.createTextNode(vdom.props.nodeValue);
  }

  if (vdom.type === Fragment) {
    const fragment = document.createDocumentFragment();

    vdom.props.children
      .filter((child) => child != null)
      .forEach((child) => {
        const childDOM = createDOM(child);
        if (childDOM) {
          fragment.appendChild(childDOM);
        }
      });
    return fragment;
  }

  const isSvgElement = SVG_TAGS.has(vdom.type);

  const dom = isSvgElement
    ? document.createElementNS("http://www.w3.org/2000/svg", vdom.type)
    : document.createElement(vdom.type);

  if (vdom.props && vdom.props.dangerouslySetInnerHTML) {
    dom.innerHTML = vdom.props.dangerouslySetInnerHTML.__html || "";
  } else {
    applyProps(dom, {}, vdom.props, isSvgElement);

    vdom.props.children
      .filter((child) => child != null)
      .forEach((child) => {
        const childDOM = createDOM(child);
        if (childDOM) {
          dom.appendChild(childDOM);
        }
      });
  }

  vdom.dom = dom;
  return dom;
}

function applyProps(dom, oldProps = {}, newProps = {}, isSvg = false) {
  if (!dom || typeof dom.setAttribute !== "function") {
    return;
  }

  if (newProps.ref) {
    newProps.ref.current = dom;
  }

  if (newProps.style) {
    try {
      const styleObj = newProps.style;
      Object.keys(styleObj).forEach((key) => {
        dom.style[key] = styleObj[key];
      });
    } catch (e) {
      console.error("Error applying styles:", e);
    }
  }

  if (newProps.className) {
    try {
      if (isSvg) {
        dom.setAttribute("class", newProps.className);
      } else {
        dom.className = newProps.className;
      }
    } catch (e) {
      console.error("Error setting className:", e);
    }
  }

  if (newProps.dangerouslySetInnerHTML) {
    dom.innerHTML = newProps.dangerouslySetInnerHTML.__html || "";
    return;
  }

  if (
    "value" in newProps &&
    (dom.tagName === "INPUT" ||
      dom.tagName === "TEXTAREA" ||
      dom.tagName === "SELECT")
  ) {
    dom.value = newProps.value == null ? "" : newProps.value;
  }

  if ("checked" in newProps && dom.tagName === "INPUT") {
    dom.checked = !!newProps.checked;
  }

  for (const [key, value] of Object.entries(newProps)) {
    try {
      if (
        key !== "children" &&
        key !== "ref" &&
        key !== "style" &&
        key !== "className" &&
        key !== "dangerouslySetInnerHTML" &&
        key !== "value" &&
        key !== "checked"
      ) {
        if (key.startsWith("on") && typeof value === "function") {
          const eventName = key.toLowerCase().substring(2);

          if (oldProps[key] && oldProps[key] !== value) {
            dom.removeEventListener(eventName, oldProps[key]);
          }
          dom.addEventListener(eventName, value);
        } else if (typeof value !== "function" && typeof value !== "object") {
          if (isSvg) {
            dom.setAttribute(key, value);
          } else {
            if (key in dom) {
              dom[key] = value;
            } else {
              dom.setAttribute(key, value);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error setting attribute ${key}:`, e);
    }
  }
}

function cleanupComponent(pathKey) {
  const componentState = componentStateMap.get(pathKey);
  if (componentState) {
    componentState.hooks.forEach((hook) => {
      if (hook.cleanup && typeof hook.cleanup === "function") {
        hook.cleanup();
      }
    });

    componentStateMap.delete(pathKey);
  }
}

function updateDOM(parentDOM, previousVDOM, newVDOM, index = 0) {
  if (!parentDOM || !parentDOM.childNodes) {
    console.warn("Invalid parent DOM in updateDOM:", parentDOM);
    return;
  }

  if (Array.isArray(previousVDOM) && Array.isArray(newVDOM)) {
    const keyMap = new Map();
    const freeIndexes = [];

    previousVDOM.forEach((child, i) => {
      if (child && child.props && child.props.key) {
        keyMap.set(child.props.key, i);
      } else {
        freeIndexes.push(i);
      }
    });

    let freeIndex = 0;

    newVDOM.forEach((child, i) => {
      if (
        child &&
        child.props &&
        child.props.key &&
        keyMap.has(child.props.key)
      ) {
        const oldIndex = keyMap.get(child.props.key);
        updateDOM(parentDOM, previousVDOM[oldIndex], child, oldIndex);

        previousVDOM[oldIndex] = null;
      } else {
        const oldIndex = freeIndexes[freeIndex++] || index + i;
        updateDOM(parentDOM, previousVDOM[oldIndex], child, oldIndex);
        if (oldIndex < previousVDOM.length) {
          previousVDOM[oldIndex] = null;
        }
      }
    });

    previousVDOM.forEach((child, i) => {
      if (child !== null) {
        updateDOM(parentDOM, child, null, i);
      }
    });

    return;
  }

  if (previousVDOM?.type === Fragment && newVDOM?.type === Fragment) {
    const maxChildren = Math.max(
      previousVDOM.props.children.length,
      newVDOM.props.children.length
    );

    for (let i = 0; i < maxChildren; i++) {
      updateDOM(
        parentDOM,
        previousVDOM.props.children[i],
        newVDOM.props.children[i],
        index + i
      );
    }
    return;
  }

  if (newVDOM && newVDOM.type === "PORTAL") {
    const container = newVDOM.props.container;

    if (previousVDOM && previousVDOM.type === "PORTAL") {
      const maxChildren = Math.max(
        previousVDOM.props.children.length,
        newVDOM.props.children.length
      );

      for (let i = 0; i < maxChildren; i++) {
        updateDOM(
          previousVDOM.props.container,
          previousVDOM.props.children[i],
          newVDOM.props.children[i],
          i
        );
      }
    } else {
      newVDOM.props.children.forEach((child, i) => {
        updateDOM(container, null, child, i);
      });
    }
    return;
  }

  if (!previousVDOM && newVDOM) {
    const newDOM = createDOM(newVDOM);
    if (newDOM) {
      if (parentDOM.childNodes.length <= index) {
        parentDOM.appendChild(newDOM);
      } else {
        parentDOM.insertBefore(newDOM, parentDOM.childNodes[index]);
      }
    }
  } else if (previousVDOM && !newVDOM) {
    if (parentDOM.childNodes[index]) {
      parentDOM.removeChild(parentDOM.childNodes[index]);
    }

    if (typeof previousVDOM.type === "function") {
      const pathKey = previousVDOM._pathKey;
      if (pathKey) {
        cleanupComponent(pathKey);
      }
    }
  } else if (previousVDOM && newVDOM && previousVDOM.type !== newVDOM.type) {
    const newDOM = createDOM(newVDOM);
    if (newDOM) {
      if (index < parentDOM.childNodes.length) {
        parentDOM.replaceChild(newDOM, parentDOM.childNodes[index]);
      } else {
        parentDOM.appendChild(newDOM);
      }
    }
  } else if (previousVDOM && newVDOM) {
    if (newVDOM.type === "TEXT") {
      if (index < parentDOM.childNodes.length) {
        const textNode = parentDOM.childNodes[index];
        if (previousVDOM.props.nodeValue !== newVDOM.props.nodeValue) {
          textNode.nodeValue = newVDOM.props.nodeValue;
        }
        newVDOM.dom = textNode;
      }
    } else {
      if (index < parentDOM.childNodes.length) {
        const domNode = parentDOM.childNodes[index];
        const isSvg = SVG_TAGS.has(newVDOM.type);

        for (const key in previousVDOM.props) {
          if (key !== "children" && !(key in newVDOM.props)) {
            if (key.startsWith("on")) {
              domNode.removeEventListener(
                key.toLowerCase().substring(2),
                previousVDOM.props[key]
              );
            } else if (key === "style") {
              domNode.removeAttribute("style");
            } else if (key !== "ref") {
              domNode.removeAttribute(key);
            }
          }
        }

        applyProps(domNode, previousVDOM.props, newVDOM.props, isSvg);

        const maxChildren = Math.max(
          previousVDOM.props.children.length,
          newVDOM.props.children.length
        );

        for (let i = 0; i < maxChildren; i++) {
          updateDOM(
            domNode,
            previousVDOM.props.children[i],
            newVDOM.props.children[i],
            i
          );
        }

        newVDOM.dom = domNode;
      }
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

let renderQueued = false;

function render(component, container) {
  rootComponent = component;
  rootContainer = container;
  renderApp();
}

let concurrentMode = false;
let workInProgressRoot = null;
let currentPriority = 0;

const PRIORITY = {
  IMMEDIATE: 99,
  USER_BLOCKING: 98,
  NORMAL: 97,
  LOW: 96,
  IDLE: 95,
};

function enableConcurrentMode() {
  concurrentMode = true;
}

function scheduleWork(callback, priority = PRIORITY.NORMAL) {
  if (!concurrentMode) {
    callback();
    return;
  }

  currentPriority = priority;

  if (priority === PRIORITY.IMMEDIATE) {
    callback();
  } else if (priority === PRIORITY.USER_BLOCKING) {
    setTimeout(callback, 0);
  } else if (priority === PRIORITY.NORMAL) {
    setTimeout(callback, 10);
  } else if (priority === PRIORITY.LOW) {
    setTimeout(callback, 100);
  } else if (priority === PRIORITY.IDLE) {
    requestIdleCallback
      ? requestIdleCallback(callback)
      : setTimeout(callback, 500);
  }
}

const renderApp = debounce(() => {
  if (renderQueued) return;

  renderQueued = true;

  const renderTask = () => {
    try {
      renderQueued = false;

      const rootVDOM =
        typeof rootComponent === "object" && rootComponent.type
          ? rootComponent
          : createElement(rootComponent, null);

      const newVDOM = buildVDOM(rootVDOM, []);
      updateDOM(rootContainer, previousVDOM, newVDOM);
      previousVDOM = newVDOM;

      if (pendingStateUpdates.length > 0) {
        const updates = [...pendingStateUpdates];
        pendingStateUpdates.length = 0;

        updates.forEach((update) => update());

        renderApp();
      }
    } catch (error) {
      console.error("Error during render:", error);
      renderQueued = false;
    }
  };

  if (concurrentMode) {
    scheduleWork(renderTask, currentPriority || PRIORITY.NORMAL);
  } else {
    queueMicrotask(renderTask);
  }
}, 16);

function memo(Component, areEqual) {
  function MemoComponent(props) {
    const component = currentComponent;
    const hookIndex = component.hookIndex++;

    if (!component.hooks[hookIndex]) {
      component.hooks[hookIndex] = {
        props,
        result: Component(props),
        memoized: true,
      };
    } else {
      const hook = component.hooks[hookIndex];
      const shouldUpdate = areEqual
        ? !areEqual(hook.props, props)
        : !shallowEqual(hook.props, props);

      if (shouldUpdate) {
        hook.props = props;
        hook.result = Component(props);
      }
    }

    return component.hooks[hookIndex].result;
  }

  MemoComponent.displayName = `Memo(${
    Component.displayName || Component.name || "Component"
  })`;
  MemoComponent.isPure = true;

  return MemoComponent;
}

function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !Object.is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

function createRoot(container) {
  return {
    render: (element) => {
      enableConcurrentMode();
      render(element, container);
    },
    unmount: () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      componentStateMap.forEach((_, key) => {
        cleanupComponent(key);
      });

      rootComponent = null;
      rootContainer = null;
      previousVDOM = null;
    },
  };
}

let isBatchingUpdates = false;
const pendingStateUpdates = [];

function batchUpdates(callback) {
  const prevIsBatchingUpdates = isBatchingUpdates;
  isBatchingUpdates = true;

  try {
    callback();
  } finally {
    isBatchingUpdates = prevIsBatchingUpdates;

    if (!isBatchingUpdates && pendingStateUpdates.length > 0) {
      const updates = [...pendingStateUpdates];
      pendingStateUpdates.length = 0;

      updates.forEach((update) => update());
      renderApp();
    }
  }
}
// Make Fragment and createElement globally available
if (typeof window !== 'undefined') {
  window.Fragment = Fragment;
  window.createElement = createElement;
}

export {
  render,
  setState,
  setEffect,
  setReducer,
  setMemo,
  setCallback,
  setRef,
  setContext,
  createElement,
  createTextElement,
  createContext,
  Fragment,
  memo,
  createRoot,
  enableConcurrentMode,
  batchUpdates,
};
