// Progressive enhancement for the shared compact header's native controls.
export function elementsWithin(root, selector) {
  return [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];
}

function icon(document, name) {
  const node = document.createElement("i");
  node.className = `ph ph-${name}`;
  node.setAttribute("aria-hidden", "true");
  return node;
}

export function createHeaderEnhancer(document, site) {
  const window = document.defaultView;
  const records = new WeakMap();
  let sequence = 0;
  let opened;

  function uniqueId(kind) {
    let id;
    do { id = `idy-${kind}-${++sequence}`; } while (document.getElementById(id));
    return id;
  }

  function close(restoreFocus = false) {
    if (!opened) return;
    const menu = opened;
    opened = undefined;
    menu.panel.hidden = true;
    menu.trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) menu.trigger.focus();
  }

  function place(panel) {
    panel.style.transform = "";
    const bounds = panel.getBoundingClientRect();
    if (bounds.left < 12) panel.style.transform = `translateX(${12 - bounds.left}px)`;
    else if (bounds.right > window.innerWidth - 12) {
      panel.style.transform = `translateX(${window.innerWidth - 12 - bounds.right}px)`;
    }
  }

  function open(menu) {
    close();
    document.querySelectorAll(".compact-header .idy-mobile[open]").forEach(node => { node.open = false; });
    opened = menu;
    menu.panel.hidden = false;
    menu.trigger.setAttribute("aria-expanded", "true");
    place(menu.panel);
    (menu.items.find(item => item.value === menu.select.value) || menu.items[0])?.button.focus();
  }

  function renderRecord(record) {
    for (const menu of record.menus) {
      const selected = menu.select.options[menu.select.selectedIndex];
      const theme = document.documentElement.dataset.theme;
      menu.trigger.replaceChildren(icon(document, menu.kind === "language" ? "translate" : theme === "dark" ? "moon" : "sun"));
      const label = `${site.t(menu.kind)}: ${selected?.textContent || ""}`;
      menu.trigger.setAttribute("aria-label", label);
      menu.trigger.title = label;
      for (const item of menu.items) {
        item.label.textContent = item.option.textContent;
        item.button.setAttribute("aria-checked", String(menu.select.value === item.value));
      }
    }
  }

  function enhance(root) {
    for (const header of elementsWithin(root, ".compact-header")) {
      const native = header.querySelector(".idy-preferences");
      const selects = ["theme", "language"].map(kind => native?.querySelector(`select[data-idy-${kind}]`));
      if (selects.some(select => !select || !select.options.length)) continue;
      const existing = records.get(header);
      if (existing && existing.native === native && existing.controls.isConnected === native.isConnected &&
          existing.menus.every((menu, index) => menu.select === selects[index]) &&
          existing.controls.parentNode === native.parentNode) {
        renderRecord(existing);
        continue;
      }
      if (existing) {
        if (existing.menus.includes(opened)) close();
        existing.controls.remove();
      }
      const controls = document.createElement("div");
      controls.className = "header-controls";
      const record = { native, controls, menus: [] };
      for (const [index, kind] of ["theme", "language"].entries()) {
        const select = selects[index];
        const wrapper = document.createElement("div");
        wrapper.className = "preference-control";
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "icon-button";
        trigger.dataset.preference = kind;
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        trigger.id = uniqueId(`${kind}-trigger`);
        const panel = document.createElement("div");
        panel.className = "preference-panel";
        panel.hidden = true;
        panel.id = uniqueId(`${kind}-menu`);
        panel.setAttribute("role", "menu");
        panel.setAttribute("aria-labelledby", trigger.id);
        trigger.setAttribute("aria-controls", panel.id);
        const menu = { root: wrapper, trigger, panel, select, kind, items: [] };
        for (const option of select.options) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "preference-option";
          button.setAttribute("role", "menuitemradio");
          button.tabIndex = -1;
          button.dataset.value = option.value;
          if (kind === "theme") button.append(icon(document, option.value === "system" ? "desktop" : option.value === "dark" ? "moon" : "sun"));
          const label = document.createElement("span");
          label.className = "option-label";
          const check = icon(document, "check");
          check.classList.add("option-check");
          button.append(label, check);
          button.addEventListener("click", () => {
            select.value = option.value;
            select.dispatchEvent(new window.Event("change", { bubbles: true }));
            renderRecord(record);
            close(true);
          });
          menu.items.push({ button, label, option, value: option.value });
          panel.append(button);
        }
        trigger.addEventListener("click", () => opened === menu ? close() : open(menu));
        trigger.addEventListener("keydown", event => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          open(menu);
          if (event.key === "ArrowUp") menu.items.at(-1).button.focus();
        });
        panel.addEventListener("keydown", event => {
          const index = menu.items.findIndex(item => item.button === document.activeElement);
          const length = menu.items.length;
          let next;
          if (event.key === "ArrowDown") next = (index + 1) % length;
          if (event.key === "ArrowUp") next = (index - 1 + length) % length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = length - 1;
          if (next !== undefined) {
            event.preventDefault();
            menu.items[next].button.focus();
          } else if (event.key === "Tab") close(true);
        });
        wrapper.addEventListener("focusout", event => {
          // Safari can blur without a related target before a menu click.
          if (opened === menu && event.relatedTarget && !wrapper.contains(event.relatedTarget)) close();
        });
        wrapper.append(trigger, panel);
        controls.append(wrapper);
        record.menus.push(menu);
      }
      native.after(controls);
      native.hidden = true;
      records.set(header, record);
      renderRecord(record);
    }
  }

  // One set of document listeners also covers headers added after initialization.
  document.addEventListener("pointerdown", event => {
    if (opened && !opened.root.contains(event.target)) close();
    document.querySelectorAll(".compact-header .idy-mobile[open]").forEach(mobile => {
      if (!mobile.contains(event.target)) mobile.open = false;
    });
  });
  document.addEventListener("focusin", event => {
    if (opened && !opened.root.contains(event.target)) close();
    document.querySelectorAll(".compact-header .idy-mobile[open]").forEach(mobile => {
      if (!mobile.contains(event.target)) mobile.open = false;
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (opened) { event.preventDefault(); close(true); return; }
    const mobile = document.querySelector(".compact-header .idy-mobile[open]");
    if (mobile) {
      event.preventDefault();
      mobile.open = false;
      mobile.querySelector("summary")?.focus();
    }
  });
  document.addEventListener("toggle", event => {
    if (event.target.matches?.(".compact-header .idy-mobile") && event.target.open) close();
  }, true);
  document.addEventListener("click", event => {
    const link = event.target.closest?.(".compact-header .idy-mobile a");
    if (link) link.closest(".idy-mobile").open = false;
  });
  window.addEventListener("blur", () => close());
  window.addEventListener("resize", () => { if (opened) place(opened.panel); });

  return {
    enhance,
    render(root = document) {
      for (const header of elementsWithin(root, ".compact-header")) {
        const record = records.get(header);
        if (record) renderRecord(record);
      }
    },
  };
}
