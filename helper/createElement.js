// olova.js
import { createElement } from "olovakit";

// Utility sets
const SVG_TAGS = new Set([
  "svg",
  "circle",
  "rect",
  "path",
  "line",
  "polyline",
  "polygon",
  "text",
  "g",
  "defs",
  "use",
  "symbol",
  "image",
  "pattern",
  "mask",
  "clipPath",
  "foreignObject",
  "animate",
  "animateMotion",
  "animateTransform",
]);

const MATHML_TAGS = new Set([
  "math",
  "mi",
  "mn",
  "mo",
  "ms",
  "mtext",
  "mspace",
  "mrow",
  "mfrac",
  "msqrt",
  "mroot",
  "mtable",
  "mtr",
  "mtd",
  "msup",
  "msub",
  "munder",
  "mover",
  "mmultiscripts",
]);

// Core element creation function
const createOlovaElement =
  (tagName) =>
  (attributes = {}, ...children) => {
    // Skip rendering if condition is false
    if (attributes.if === false) return null;

    let namespace = null;
    if (SVG_TAGS.has(tagName.toLowerCase())) {
      namespace = "http://www.w3.org/2000/svg";
    } else if (MATHML_TAGS.has(tagName.toLowerCase())) {
      namespace = "http://www.w3.org/1998/Math/MathML";
    }

    const {
      ref,
      if: condition,
      onCreate,
      onMount,
      onDestroy,
      className,
      classList,
      style,
      dataset,
      ...restAttributes
    } = attributes;

    const processedAttributes = {
      ...restAttributes,
      // Handle event listeners with support for multiple handlers
      ...Object.entries(restAttributes)
        .filter(([key]) => key.startsWith("on"))
        .reduce((acc, [key, value]) => {
          const eventName = key.toLowerCase();
          if (Array.isArray(value)) {
            acc[eventName] = (e) => value.forEach((fn) => fn(e));
          } else {
            acc[eventName] = value;
          }
          return acc;
        }, {}),

      // Enhanced class handling
      ...(className || classList
        ? {
            class: [
              className,
              ...(Array.isArray(classList) ? classList : []),
              ...Object.entries(
                typeof classList === "object" && !Array.isArray(classList)
                  ? classList
                  : {}
              )
                .filter(([_, value]) => value)
                .map(([key]) => key),
            ]
              .filter(Boolean)
              .join(" "),
          }
        : {}),

      // Enhanced style handling with CSS variables support
      ...(style && typeof style === "object"
        ? {
            style: Object.entries(style)
              .map(([k, v]) => {
                const key = k.startsWith("--")
                  ? k
                  : k.replace(/([A-Z])/g, "-$1").toLowerCase();
                return `${key}:${v}`;
              })
              .join(";"),
          }
        : {}),

      // Data attributes shorthand
      ...(dataset && typeof dataset === "object"
        ? Object.entries(dataset).reduce((acc, [key, value]) => {
            acc[`data-${key.toLowerCase()}`] = value;
            return acc;
          }, {})
        : {}),
    };

    // Handle custom elements
    const isValue = attributes.is || (tagName.includes("-") ? tagName : null);
    if (isValue) {
      processedAttributes.is = isValue;
    }

    // Process children with enhanced functionality
    const processedChildren = children.flat(Infinity).map((child) => {
      if (child === false || child === null || child === undefined) return null;
      if (typeof child === "function") return child();
      if (child instanceof Promise) return { type: "async", promise: child };
      return child;
    });

    return createElement(
      tagName,
      {
        ...processedAttributes,
        namespace,
      },
      ...processedChildren
    );
  };

// Base Olova object with explicit tags
const olovaBase = {
  // HTML tags
  a: createOlovaElement("a"),
  abbr: createOlovaElement("abbr"),
  address: createOlovaElement("address"),
  area: createOlovaElement("area"),
  article: createOlovaElement("article"),
  aside: createOlovaElement("aside"),
  audio: createOlovaElement("audio"),
  b: createOlovaElement("b"),
  base: createOlovaElement("base"),
  bdi: createOlovaElement("bdi"),
  bdo: createOlovaElement("bdo"),
  blockquote: createOlovaElement("blockquote"),
  body: createOlovaElement("body"),
  br: createOlovaElement("br"),
  button: createOlovaElement("button"),
  canvas: createOlovaElement("canvas"),
  caption: createOlovaElement("caption"),
  cite: createOlovaElement("cite"),
  code: createOlovaElement("code"),
  col: createOlovaElement("col"),
  colgroup: createOlovaElement("colgroup"),
  data: createOlovaElement("data"),
  datalist: createOlovaElement("datalist"),
  dd: createOlovaElement("dd"),
  del: createOlovaElement("del"),
  details: createOlovaElement("details"),
  dfn: createOlovaElement("dfn"),
  dialog: createOlovaElement("dialog"),
  div: createOlovaElement("div"),
  dl: createOlovaElement("dl"),
  dt: createOlovaElement("dt"),
  em: createOlovaElement("em"),
  embed: createOlovaElement("embed"),
  fieldset: createOlovaElement("fieldset"),
  figcaption: createOlovaElement("figcaption"),
  figure: createOlovaElement("figure"),
  footer: createOlovaElement("footer"),
  form: createOlovaElement("form"),
  h1: createOlovaElement("h1"),
  h2: createOlovaElement("h2"),
  h3: createOlovaElement("h3"),
  h4: createOlovaElement("h4"),
  h5: createOlovaElement("h5"),
  h6: createOlovaElement("h6"),
  head: createOlovaElement("head"),
  header: createOlovaElement("header"),
  hgroup: createOlovaElement("hgroup"),
  hr: createOlovaElement("hr"),
  html: createOlovaElement("html"),
  i: createOlovaElement("i"),
  iframe: createOlovaElement("iframe"),
  img: createOlovaElement("img"),
  input: createOlovaElement("input"),
  ins: createOlovaElement("ins"),
  kbd: createOlovaElement("kbd"),
  label: createOlovaElement("label"),
  legend: createOlovaElement("legend"),
  li: createOlovaElement("li"),
  link: createOlovaElement("link"),
  main: createOlovaElement("main"),
  map: createOlovaElement("map"),
  mark: createOlovaElement("mark"),
  menu: createOlovaElement("menu"),
  meta: createOlovaElement("meta"),
  meter: createOlovaElement("meter"),
  nav: createOlovaElement("nav"),
  noscript: createOlovaElement("noscript"),
  object: createOlovaElement("object"),
  ol: createOlovaElement("ol"),
  optgroup: createOlovaElement("optgroup"),
  option: createOlovaElement("option"),
  output: createOlovaElement("output"),
  p: createOlovaElement("p"),
  param: createOlovaElement("param"),
  picture: createOlovaElement("picture"),
  pre: createOlovaElement("pre"),
  progress: createOlovaElement("progress"),
  q: createOlovaElement("q"),
  rp: createOlovaElement("rp"),
  rt: createOlovaElement("rt"),
  ruby: createOlovaElement("ruby"),
  s: createOlovaElement("s"),
  samp: createOlovaElement("samp"),
  script: createOlovaElement("script"),
  section: createOlovaElement("section"),
  select: createOlovaElement("select"),
  slot: createOlovaElement("slot"),
  small: createOlovaElement("small"),
  source: createOlovaElement("source"),
  span: createOlovaElement("span"),
  strong: createOlovaElement("strong"),
  style: createOlovaElement("style"),
  sub: createOlovaElement("sub"),
  summary: createOlovaElement("summary"),
  sup: createOlovaElement("sup"),
  table: createOlovaElement("table"),
  tbody: createOlovaElement("tbody"),
  td: createOlovaElement("td"),
  template: createOlovaElement("template"),
  textarea: createOlovaElement("textarea"),
  tfoot: createOlovaElement("tfoot"),
  th: createOlovaElement("th"),
  thead: createOlovaElement("thead"),
  time: createOlovaElement("time"),
  title: createOlovaElement("title"),
  tr: createOlovaElement("tr"),
  track: createOlovaElement("track"),
  u: createOlovaElement("u"),
  ul: createOlovaElement("ul"),
  var: createOlovaElement("var"),
  video: createOlovaElement("video"),
  wbr: createOlovaElement("wbr"),
  // Utility methods
  fragment: (...children) => createElement(Fragment, {}, ...children),
  create: (tag, attrs, ...children) => createElement(tag, attrs, ...children),
  component: (fn) => (props) => fn(props),
};

// Proxy to handle custom tags
const x = new Proxy(olovaBase, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return createOlovaElement(String(prop));
  },
});

// Type definitions
/**
 * @typedef {Object} Attributes
 * @property {string} [className]
 * @property {Record<string, string> | string} [style]
 * @property {string} [is]
 * @property {Record<string, any>} [dataset]
 * @property {{[key: string]: (event: Event) => void}} [on*]
 */

/**
 * @typedef {Object} OlovaElementCreator
 * @property {(attributes?: Attributes, ...children: any[]) => any} [tag:string]
 * @property {(attributes?: Attributes, ...children: any[]) => any} a
 * @property {(attributes?: Attributes, ...children: any[]) => any} abbr
 * @property {(attributes?: Attributes, ...children: any[]) => any} address
 * @property {(attributes?: Attributes, ...children: any[]) => any} area
 * @property {(attributes?: Attributes, ...children: any[]) => any} article
 * @property {(attributes?: Attributes, ...children: any[]) => any} aside
 * @property {(attributes?: Attributes, ...children: any[]) => any} audio
 * @property {(attributes?: Attributes, ...children: any[]) => any} b
 * @property {(attributes?: Attributes, ...children: any[]) => any} base
 * @property {(attributes?: Attributes, ...children: any[]) => any} bdi
 * @property {(attributes?: Attributes, ...children: any[]) => any} bdo
 * @property {(attributes?: Attributes, ...children: any[]) => any} blockquote
 * @property {(attributes?: Attributes, ...children: any[]) => any} body
 * @property {(attributes?: Attributes, ...children: any[]) => any} br
 * @property {(attributes?: Attributes, ...children: any[]) => any} button
 * @property {(attributes?: Attributes, ...children: any[]) => any} canvas
 * @property {(attributes?: Attributes, ...children: any[]) => any} caption
 * @property {(attributes?: Attributes, ...children: any[]) => any} cite
 * @property {(attributes?: Attributes, ...children: any[]) => any} code
 * @property {(attributes?: Attributes, ...children: any[]) => any} col
 * @property {(attributes?: Attributes, ...children: any[]) => any} colgroup
 * @property {(attributes?: Attributes, ...children: any[]) => any} data
 * @property {(attributes?: Attributes, ...children: any[]) => any} datalist
 * @property {(attributes?: Attributes, ...children: any[]) => any} dd
 * @property {(attributes?: Attributes, ...children: any[]) => any} del
 * @property {(attributes?: Attributes, ...children: any[]) => any} details
 * @property {(attributes?: Attributes, ...children: any[]) => any} dfn
 * @property {(attributes?: Attributes, ...children: any[]) => any} dialog
 * @property {(attributes?: Attributes, ...children: any[]) => any} div
 * @property {(attributes?: Attributes, ...children: any[]) => any} dl
 * @property {(attributes?: Attributes, ...children: any[]) => any} dt
 * @property {(attributes?: Attributes, ...children: any[]) => any} em
 * @property {(attributes?: Attributes, ...children: any[]) => any} embed
 * @property {(attributes?: Attributes, ...children: any[]) => any} fieldset
 * @property {(attributes?: Attributes, ...children: any[]) => any} figcaption
 * @property {(attributes?: Attributes, ...children: any[]) => any} figure
 * @property {(attributes?: Attributes, ...children: any[]) => any} footer
 * @property {(attributes?: Attributes, ...children: any[]) => any} form
 * @property {(attributes?: Attributes, ...children: any[]) => any} h1
 * @property {(attributes?: Attributes, ...children: any[]) => any} h2
 * @property {(attributes?: Attributes, ...children: any[]) => any} h3
 * @property {(attributes?: Attributes, ...children: any[]) => any} h4
 * @property {(attributes?: Attributes, ...children: any[]) => any} h5
 * @property {(attributes?: Attributes, ...children: any[]) => any} h6
 * @property {(attributes?: Attributes, ...children: any[]) => any} head
 * @property {(attributes?: Attributes, ...children: any[]) => any} header
 * @property {(attributes?: Attributes, ...children: any[]) => any} hgroup
 * @property {(attributes?: Attributes, ...children: any[]) => any} hr
 * @property {(attributes?: Attributes, ...children: any[]) => any} html
 * @property {(attributes?: Attributes, ...children: any[]) => any} i
 * @property {(attributes?: Attributes, ...children: any[]) => any} iframe
 * @property {(attributes?: Attributes, ...children: any[]) => any} img
 * @property {(attributes?: Attributes, ...children: any[]) => any} input
 * @property {(attributes?: Attributes, ...children: any[]) => any} ins
 * @property {(attributes?: Attributes, ...children: any[]) => any} kbd
 * @property {(attributes?: Attributes, ...children: any[]) => any} label
 * @property {(attributes?: Attributes, ...children: any[]) => any} legend
 * @property {(attributes?: Attributes, ...children: any[]) => any} li
 * @property {(attributes?: Attributes, ...children: any[]) => any} link
 * @property {(attributes?: Attributes, ...children: any[]) => any} main
 * @property {(attributes?: Attributes, ...children: any[]) => any} map
 * @property {(attributes?: Attributes, ...children: any[]) => any} mark
 * @property {(attributes?: Attributes, ...children: any[]) => any} menu
 * @property {(attributes?: Attributes, ...children: any[]) => any} meta
 * @property {(attributes?: Attributes, ...children: any[]) => any} meter
 * @property {(attributes?: Attributes, ...children: any[]) => any} nav
 * @property {(attributes?: Attributes, ...children: any[]) => any} noscript
 * @property {(attributes?: Attributes, ...children: any[]) => any} object
 * @property {(attributes?: Attributes, ...children: any[]) => any} ol
 * @property {(attributes?: Attributes, ...children: any[]) => any} optgroup
 * @property {(attributes?: Attributes, ...children: any[]) => any} option
 * @property {(attributes?: Attributes, ...children: any[]) => any} output
 * @property {(attributes?: Attributes, ...children: any[]) => any} p
 * @property {(attributes?: Attributes, ...children: any[]) => any} param
 * @property {(attributes?: Attributes, ...children: any[]) => any} picture
 * @property {(attributes?: Attributes, ...children: any[]) => any} pre
 * @property {(attributes?: Attributes, ...children: any[]) => any} progress
 * @property {(attributes?: Attributes, ...children: any[]) => any} q
 * @property {(attributes?: Attributes, ...children: any[]) => any} rp
 * @property {(attributes?: Attributes, ...children: any[]) => any} rt
 * @property {(attributes?: Attributes, ...children: any[]) => any} ruby
 * @property {(attributes?: Attributes, ...children: any[]) => any} s
 * @property {(attributes?: Attributes, ...children: any[]) => any} samp
 * @property {(attributes?: Attributes, ...children: any[]) => any} script
 * @property {(attributes?: Attributes, ...children: any[]) => any} section
 * @property {(attributes?: Attributes, ...children: any[]) => any} select
 * @property {(attributes?: Attributes, ...children: any[]) => any} slot
 * @property {(attributes?: Attributes, ...children: any[]) => any} small
 * @property {(attributes?: Attributes, ...children: any[]) => any} source
 * @property {(attributes?: Attributes, ...children: any[]) => any} span
 * @property {(attributes?: Attributes, ...children: any[]) => any} strong
 * @property {(attributes?: Attributes, ...children: any[]) => any} style
 * @property {(attributes?: Attributes, ...children: any[]) => any} sub
 * @property {(attributes?: Attributes, ...children: any[]) => any} summary
 * @property {(attributes?: Attributes, ...children: any[]) => any} sup
 * @property {(attributes?: Attributes, ...children: any[]) => any} table
 * @property {(attributes?: Attributes, ...children: any[]) => any} tbody
 * @property {(attributes?: Attributes, ...children: any[]) => any} td
 * @property {(attributes?: Attributes, ...children: any[]) => any} template
 * @property {(attributes?: Attributes, ...children: any[]) => any} textarea
 * @property {(attributes?: Attributes, ...children: any[]) => any} tfoot
 * @property {(attributes?: Attributes, ...children: any[]) => any} th
 * @property {(attributes?: Attributes, ...children: any[]) => any} thead
 * @property {(attributes?: Attributes, ...children: any[]) => any} time
 * @property {(attributes?: Attributes, ...children: any[]) => any} title
 * @property {(attributes?: Attributes, ...children: any[]) => any} tr
 * @property {(attributes?: Attributes, ...children: any[]) => any} track
 * @property {(attributes?: Attributes, ...children: any[]) => any} u
 * @property {(attributes?: Attributes, ...children: any[]) => any} ul
 * @property {(attributes?: Attributes, ...children: any[]) => any} var
 * @property {(attributes?: Attributes, ...children: any[]) => any} video
 * @property {(attributes?: Attributes, ...children: any[]) => any} wbr
 * @property {(...children: any[]) => any} fragment
 * @property {(tag: string, attributes?: Attributes, ...children: any[]) => any} create
 * @property {(fn: (props: any) => any) => (props: any) => any} component
 */

/** @type {OlovaElementCreator} */
export default x;
