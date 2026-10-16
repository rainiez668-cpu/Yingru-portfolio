/*
 * Mobile project navigation derives its data from the existing desktop section
 * links. Add, remove, or reorder those HTML links to update both navigations.
 */
(() => {
  const desktopNavigation = document.querySelector(".birdsong-section-nav");
  const hero = document.querySelector(".project-hero");

  if (!desktopNavigation || !hero) return;

  const desktopLinks = Array.from(desktopNavigation.querySelectorAll('a[href^="#"]'));
  const records = desktopLinks
    .map((link) => {
      const id = link.hash.slice(1);
      const target = id ? document.getElementById(id) : null;

      if (!target) {
        console.warn(`[project-mobile-section-nav] Skipped invalid section link: ${link.getAttribute("href")}`);
        return null;
      }

      return { id, label: link.textContent.trim(), target };
    })
    .filter(Boolean)
    .map((record, index) => ({ ...record, number: String(index + 1).padStart(2, "0") }));

  if (!records.length) return;

  const desktopLinkList = document.createElement("div");
  desktopLinkList.className = "birdsong-section-nav__links";
  desktopLinks.forEach((link) => desktopLinkList.append(link));
  desktopNavigation.append(desktopLinkList);

  const navigation = document.createElement("nav");
  navigation.className = "project-mobile-section-nav";
  navigation.setAttribute("aria-label", "项目章节");

  const toggle = document.createElement("button");
  toggle.className = "project-mobile-section-nav__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");

  const currentLabel = document.createElement("span");
  currentLabel.className = "project-mobile-section-nav__current";
  const hint = document.createElement("span");
  hint.className = "project-mobile-section-nav__hint";
  hint.textContent = "章节";
  const chevron = document.createElement("span");
  chevron.className = "project-mobile-section-nav__chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML = '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>';
  toggle.append(currentLabel, hint, chevron);

  const bar = document.createElement("div");
  bar.className = "project-mobile-section-nav__bar";

  const topButton = document.createElement("button");
  topButton.className = "project-mobile-section-nav__top";
  topButton.type = "button";
  topButton.setAttribute("aria-label", "返回页面顶部");
  topButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>';
  bar.append(toggle, topButton);

  const menu = document.createElement("div");
  menu.className = "project-mobile-section-nav__menu";
  menu.id = `project-mobile-section-menu-${Math.random().toString(36).slice(2, 8)}`;
  menu.setAttribute("aria-hidden", "true");
  toggle.setAttribute("aria-controls", menu.id);

  const list = document.createElement("ul");
  list.className = "project-mobile-section-nav__list";
  const mobileLinks = new Map();

  records.forEach((record) => {
    record.target.dataset.mobileSectionTarget = "";
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "project-mobile-section-nav__link";
    button.type = "button";
    button.textContent = `${record.number} / ${record.label}`;
    button.dataset.sectionId = record.id;
    item.append(button);
    list.append(item);
    mobileLinks.set(record.id, button);
  });

  menu.append(list);
  navigation.append(bar, menu);
  document.body.append(navigation);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopTopButton = document.createElement("button");
  desktopTopButton.className = "project-desktop-top";
  desktopTopButton.type = "button";
  desktopTopButton.setAttribute("aria-label", "返回页面顶部");
  desktopTopButton.title = "返回顶部";
  desktopTopButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17V5" /><path d="m7 10 5-5 5 5" /><path d="M5 20h14" /></svg>';
  document.body.append(desktopTopButton);

  const syncDesktopTopVisibility = () => {
    desktopTopButton.classList.toggle("is-visible", desktopNavigation.classList.contains("is-visible"));
  };

  const desktopNavigationObserver = new MutationObserver(syncDesktopTopVisibility);
  desktopNavigationObserver.observe(desktopNavigation, { attributes: true, attributeFilter: ["class"] });
  syncDesktopTopVisibility();

  let activeRecord = records[0];
  let expanded = false;
  let visible = false;
  let scrollFrame = 0;

  const setExpanded = (next) => {
    expanded = next;
    navigation.classList.toggle("is-expanded", next);
    toggle.setAttribute("aria-expanded", String(next));
    menu.setAttribute("aria-hidden", String(!next));
    if ("inert" in menu) menu.inert = !next;
  };

  const setActive = (record) => {
    if (!record) return;
    activeRecord = record;
    const number = document.createElement("span");
    number.className = "project-mobile-section-nav__number";
    number.textContent = record.number;
    currentLabel.replaceChildren(number, document.createTextNode(` / ${record.label}`));
    mobileLinks.forEach((link, id) => {
      const active = id === record.id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const updateActiveFromScroll = () => {
    scrollFrame = 0;
    const readingLine = Math.min(window.innerHeight * 0.34, 220);
    let next = records[0];

    records.forEach((record) => {
      if (record.target.getBoundingClientRect().top <= readingLine) next = record;
    });

    setActive(next);
  };

  const requestActiveUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateActiveFromScroll);
  };

  const setVisible = (next) => {
    visible = next;
    navigation.classList.toggle("is-visible", next);
    if (!next) setExpanded(false);
  };

  toggle.addEventListener("click", () => setExpanded(!expanded));

  topButton.addEventListener("click", () => {
    setExpanded(false);
    hero.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });

  desktopTopButton.addEventListener("click", () => {
    hero.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });

  mobileLinks.forEach((button, id) => {
    button.addEventListener("click", () => {
      const record = records.find((entry) => entry.id === id);
      if (!record) return;
      setActive(record);
      setExpanded(false);
      record.target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      history.pushState(null, "", `#${record.id}`);
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (expanded && !navigation.contains(event.target)) setExpanded(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && expanded) {
      setExpanded(false);
      toggle.focus();
    }
  });

  window.addEventListener("scroll", requestActiveUpdate, { passive: true });
  window.addEventListener("resize", requestActiveUpdate, { passive: true });
  window.addEventListener("hashchange", () => {
    const record = records.find((entry) => `#${entry.id}` === window.location.hash);
    if (record) setActive(record);
  });

  const heroObserver = new IntersectionObserver(([entry]) => {
    setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
  }, { threshold: 0 });

  setExpanded(false);
  const hashRecord = records.find((record) => `#${record.id}` === window.location.hash);
  setActive(hashRecord || records[0]);
  requestActiveUpdate();
  heroObserver.observe(hero);
})();
