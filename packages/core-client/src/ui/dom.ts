type Child = Node | string | null | undefined | false;
type Props = Record<string, unknown> & { className?: string };

/**
 * Tiny DOM helper: h("button", { className: "primary", onclick: play }, t("menu.play")).
 * Props starting with "on" are event handlers; others are set as properties
 * (falling back to attributes for names like `aria-*` and `data-*`).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2), value as EventListener);
    } else if (key.includes("-")) {
      node.setAttribute(key, String(value));
    } else {
      (node as unknown as Record<string, unknown>)[key] = value;
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}
