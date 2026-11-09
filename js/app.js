/* 作品集前台逻辑 ---------------------------------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const STATIC_MODE =
  document.querySelector('meta[name="portfolio-mode"]')?.getAttribute("content") === "static";
const DATA_URLS = STATIC_MODE
  ? { site: "api/site.json", works: "api/works.json" }
  : { site: "/api/site", works: "/api/works" };

const state = {
  site: null,
  works: [],
  categories: [],
  view: [],
  category: "全部",
  query: "",
  active: -1,
  lastFocus: null,
  revealObserver: null,
  closeTimer: 0,
};

const els = {};
let toastTimer = 0;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindTheme();
  bindLightbox();
  bindControls();

  if (STATIC_MODE) {
    document.documentElement.classList.add("static-mode");
    $$(".nav-manage, .about-manage, [data-admin-only]").forEach((element) => element.remove());
  }

  try {
    const [site, payload] = await Promise.all([
      fetchJSON(DATA_URLS.site),
      fetchJSON(DATA_URLS.works),
    ]);
    state.site = site;
    state.works = Array.isArray(payload.works) ? payload.works : [];
    state.categories = Array.isArray(payload.categories) ? payload.categories : [];

    applySite(site);
    updateHeroStats();
    renderFilters();
    createRevealObserver();
    applyFilters();
  } catch (error) {
    showLoadError(error);
  }
}

function cacheElements() {
  els.brandTitle = $("#brandTitle");
  els.brandLabel = $("#brandLabel");
  els.heroLabel = $("#heroLabel");
  els.heroYear = $("#heroYear");
  els.heroTitle = $("#heroTitle");
  els.heroTagline = $("#heroTagline");
  els.heroIntro = $("#heroIntro");
  els.heroNote = $("#heroNote");
  els.workCount = $("#workCount");
  els.categoryCount = $("#categoryCount");
  els.lastUpdated = $("#lastUpdated");
  els.worksCountText = $("#worksCountText");
  els.gallery = $("#gallery");
  els.emptyState = $("#emptyState");
  els.emptyTitle = $("#emptyTitle");
  els.emptyText = $("#emptyText");
  els.emptyAction = $("#emptyAction");
  els.resetFilters = $("#resetFilters");
  els.filters = $("#filters");
  els.search = $("#search");
  els.aboutBio = $("#aboutBio");
  els.aboutOwner = $("#aboutOwner");
  els.aboutOwnerSign = $("#aboutOwnerSign");
  els.aboutSign = $("#aboutSign");
  els.aboutLocation = $("#aboutLocation");
  els.locationRow = $("#locationRow");
  els.aboutEmail = $("#aboutEmail");
  els.emailRow = $("#emailRow");
  els.aboutSocials = $("#aboutSocials");
  els.footerNote = $("#footerNote");
  els.toast = $("#toast");
  els.lightbox = $("#lightbox");
  els.lbImage = $("#lbImage");
  els.lbStage = $("#lbStage");
  els.lbLoader = $("#lbLoader");
  els.lbCounter = $("#lbCounter");
  els.lbTitle = $("#lbTitle");
  els.lbCategory = $("#lbCategory");
  els.lbDesc = $("#lbDesc");
  els.lbTags = $("#lbTags");
  els.lbDate = $("#lbDate");
  els.lbSize = $("#lbSize");
  els.lbFull = $("#lbFull");
  els.lbClose = $("#lbClose");
  els.lbPrev = $("#lbPrev");
  els.lbNext = $("#lbNext");
  els.themeToggle = $("#themeToggle");
  els.toTop = $("#toTop");
}

async function fetchJSON(url) {
  const response = await fetch(url, { cache: STATIC_MODE ? "default" : "no-store" });
  if (!response.ok) {
    let message = "";
    try {
      const data = await response.json();
      message = data && data.error ? data.error : "";
    } catch (error) {
      /* ignore */
    }
    throw new Error(message || `加载失败（${response.status}）`);
  }
  return response.json();
}

/* -------------------------------------------------------------------------
   站点文案
   ------------------------------------------------------------------------- */

function applySite(site) {
  const title = site.title || "作品集";
  const label = site.label || "PORTFOLIO";
  const owner = site.owner || "未署名";
  const year = new Date().getFullYear();

  document.title = `${title} · ${label}`;
  if (site.tagline) {
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute("content", site.tagline);
  }

  els.brandTitle.textContent = title;
  els.brandLabel.textContent = label;
  els.heroLabel.textContent = label;
  els.heroTitle.textContent = title;
  els.heroTitle.classList.toggle("is-long", title.length > 6);
  els.heroTagline.textContent = site.tagline || "";
  els.heroIntro.textContent = site.intro || "";
  els.heroNote.textContent = `${label} · 慢慢更新`;
  els.heroYear.textContent = String(year);

  els.aboutBio.textContent = site.bio || "";
  els.aboutOwner.textContent = owner;
  els.aboutOwnerSign.textContent = owner;
  els.aboutSign.hidden = !owner;
  els.worksCountText.textContent = "正在加载…";

  els.locationRow.hidden = !site.location;
  els.aboutLocation.textContent = site.location || "";

  els.emailRow.hidden = !site.email;
  if (site.email) {
    els.aboutEmail.textContent = site.email;
    els.aboutEmail.href = `mailto:${site.email}`;
  }

  els.aboutSocials.innerHTML = "";
  (site.socials || []).forEach((social) => {
    if (!social || !social.label || !social.url) return;
    const link = document.createElement("a");
    link.className = "social-link";
    link.href = social.url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = social.label;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    link.append(arrow);
    els.aboutSocials.append(link);
  });

  const footer = (site.footerNote || "").trim();
  els.footerNote.textContent =
    footer || `© ${year} ${owner} · 本站作品版权归作者所有，未经许可请勿转载。`;
}

function updateHeroStats() {
  const works = state.works;
  const total = works.length;
  els.workCount.textContent = String(total).padStart(2, "0");
  els.categoryCount.textContent = String(state.categories.length).padStart(2, "0");

  const latest = works.reduce((max, work) => {
    const value = work.date || "";
    return value > max ? value : max;
  }, "");

  els.lastUpdated.textContent = latest ? latest.slice(0, 7).replace("-", ".") : "—";
}

/* -------------------------------------------------------------------------
   分类与筛选
   ------------------------------------------------------------------------- */

function renderFilters() {
  els.filters.innerHTML = "";

  const items = [{ name: "全部", count: state.works.length }].concat(
    state.categories.map((category) => ({
      name: category.name,
      count: category.count,
    }))
  );

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.dataset.category = item.name;
    button.setAttribute("aria-pressed", item.name === state.category ? "true" : "false");

    const label = document.createElement("span");
    label.textContent = item.name;
    const count = document.createElement("span");
    count.className = "filter-count";
    count.textContent = String(item.count).padStart(2, "0");

    button.append(label, count);
    if (item.name === state.category) button.classList.add("is-active");

    button.addEventListener("click", () => {
      if (state.category === item.name) return;
      state.category = item.name;
      $$(".filter-btn", els.filters).forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
      applyFilters();
    });

    els.filters.append(button);
  });
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();

  state.view = state.works.filter((work) => {
    if (state.category !== "全部" && (work.category || "未分类") !== state.category) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      work.title || "",
      work.description || "",
      work.category || "",
      ...(Array.isArray(work.tags) ? work.tags : []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  renderGallery();

  const total = state.works.length;
  if (state.view.length === total) {
    els.worksCountText.textContent = `${String(total).padStart(2, "0")} 件作品`;
  } else {
    els.worksCountText.textContent = `${String(state.view.length).padStart(2, "0")} / ${String(
      total
    ).padStart(2, "0")} 件作品`;
  }

  updateEmptyState();
}

function updateEmptyState() {
  const noWorks = state.works.length === 0;
  const noResults = !noWorks && state.view.length === 0;

  els.emptyState.hidden = !(noWorks || noResults);
  if (!noWorks && !noResults) return;

  if (noWorks) {
    if (STATIC_MODE) {
      els.emptyTitle.textContent = "作品正在整理中";
      els.emptyText.textContent = "这里还没有放上作品，过一阵再来看看。";
      els.emptyAction.hidden = true;
    } else {
      els.emptyTitle.textContent = "这里还是一张白纸";
      els.emptyText.textContent = "上传第一件作品，让这个页面开始生长。";
      els.emptyAction.hidden = false;
      els.emptyAction.textContent = "上传第一件作品";
      els.emptyAction.href = "/manage#upload";
    }
    els.resetFilters.hidden = true;
  } else {
    els.emptyTitle.textContent = "没有找到相关作品";
    els.emptyText.textContent = "换个关键词，或者清除筛选再看看。";
    els.emptyAction.hidden = true;
    els.resetFilters.hidden = false;
  }
}

/* -------------------------------------------------------------------------
   画廊渲染
   ------------------------------------------------------------------------- */

function renderGallery() {
  els.gallery.innerHTML = "";

  state.view.forEach((work, index) => {
    els.gallery.append(buildCard(work, index));
  });

  if (state.revealObserver) {
    $$(".card", els.gallery).forEach((card) => state.revealObserver.observe(card));
  } else {
    $$(".card", els.gallery).forEach((card) => card.classList.add("is-in"));
  }
}

function buildCard(work, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.style.setProperty("--i", String(Math.min(index, 10)));

  const button = document.createElement("button");
  button.type = "button";
  button.className = "card-open";
  button.setAttribute("aria-label", `查看作品：${work.title || "未命名作品"}`);

  const media = document.createElement("div");
  media.className = "card-media";
  if (work.color) media.style.setProperty("--tint", work.color);

  const image = document.createElement("img");
  image.loading = "lazy";
  image.decoding = "async";
  image.src = work.thumbUrl || work.image || "";
  image.alt = work.title || "作品图片";
  if (work.width > 0 && work.height > 0) {
    image.width = work.width;
    image.height = work.height;
  }
  image.addEventListener("error", () => {
    image.remove();
    const fallback = document.createElement("span");
    fallback.className = "media-fallback";
    fallback.textContent = "图片加载失败";
    media.append(fallback);
  });

  const number = document.createElement("span");
  number.className = "card-no";
  number.textContent = String(index + 1).padStart(2, "0");

  const view = document.createElement("span");
  view.className = "card-view";
  view.textContent = "查看作品 ↗";

  media.append(image, number, view);

  const caption = document.createElement("div");
  caption.className = "card-caption";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = work.title || "未命名作品";
  if (work.demo) {
    const badge = document.createElement("span");
    badge.className = "demo-badge";
    badge.textContent = "示例";
    title.append(badge);
  }

  const meta = document.createElement("p");
  meta.className = "card-meta";
  const year = (work.date || "").slice(0, 4);
  meta.textContent = [work.category || "", year].filter(Boolean).join(" · ");

  caption.append(title, meta);
  button.append(media, caption);
  button.addEventListener("click", () => openLightbox(index));
  card.append(button);
  return card;
}

function createRevealObserver() {
  if (!("IntersectionObserver" in window)) {
    $$(".card", els.gallery).forEach((card) => card.classList.add("is-in"));
    return;
  }
  state.revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        state.revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
  );
  $$(".card", els.gallery).forEach((card) => state.revealObserver.observe(card));
}

/* -------------------------------------------------------------------------
   灯箱
   ------------------------------------------------------------------------- */

function bindLightbox() {
  els.lbImage.addEventListener("load", () => {
    els.lbImage.classList.add("is-loaded");
    els.lbStage.classList.add("has-image");
  });
  els.lbImage.addEventListener("error", () => {
    if (els.lightbox.hidden) return;
    els.lbStage.classList.remove("has-image");
    showToast("这张图片加载失败了，请回到管理页检查。", true);
  });

  els.lbClose.addEventListener("click", closeLightbox);
  els.lbPrev.addEventListener("click", () => stepLightbox(-1));
  els.lbNext.addEventListener("click", () => stepLightbox(1));
  $$("[data-close]", els.lightbox).forEach((element) => {
    element.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (els.lightbox.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  });

  let swipeStartX = 0;
  let swipeStartY = 0;
  els.lbStage.addEventListener("pointerdown", (event) => {
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
  });
  els.lbStage.addEventListener("pointerup", (event) => {
    const dx = event.clientX - swipeStartX;
    const dy = event.clientY - swipeStartY;
    if (Math.abs(dx) > 55 && Math.abs(dy) < 70) {
      stepLightbox(dx > 0 ? -1 : 1);
    }
  });
}

function openLightbox(index) {
  if (index < 0 || index >= state.view.length) return;
  window.clearTimeout(state.closeTimer);
  state.lastFocus = document.activeElement;
  state.active = index;

  els.lightbox.hidden = false;
  document.body.classList.add("is-locked");
  requestAnimationFrame(() => {
    els.lightbox.classList.add("is-open");
    els.lbClose.focus({ preventScroll: true });
  });

  populateLightbox();
}

function populateLightbox() {
  const work = state.view[state.active];
  if (!work) return;

  const total = state.view.length;
  const pad = (value) => String(value).padStart(2, "0");
  els.lbCounter.textContent = `${pad(state.active + 1)} / ${pad(total)}`;

  els.lbImage.classList.remove("is-loaded");
  els.lbStage.classList.remove("has-image");
  els.lbImage.src = work.image || work.thumbUrl || "";
  els.lbImage.alt = work.title || "作品图片";

  els.lbTitle.textContent = work.title || "未命名作品";
  els.lbCategory.textContent = work.category || "未分类";
  els.lbDesc.textContent = work.description || "";

  els.lbTags.innerHTML = "";
  (Array.isArray(work.tags) ? work.tags : []).forEach((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    els.lbTags.append(item);
  });

  els.lbDate.textContent = formatDate(work.date);
  els.lbSize.textContent =
    work.width > 0 && work.height > 0 ? `${work.width} × ${work.height}` : "";
  els.lbSize.hidden = !els.lbSize.textContent;

  if (work.image) {
    els.lbFull.hidden = false;
    els.lbFull.href = work.image;
  } else {
    els.lbFull.hidden = true;
  }

  els.lbPrev.disabled = total <= 1;
  els.lbNext.disabled = total <= 1;

  preloadNeighbours();
}

function preloadNeighbours() {
  const total = state.view.length;
  if (total <= 1) return;
  [-1, 1].forEach((offset) => {
    const next = state.view[(state.active + offset + total) % total];
    if (!next || !next.image) return;
    const image = new Image();
    image.src = next.image;
  });
}

function stepLightbox(direction) {
  const total = state.view.length;
  if (total <= 1) return;
  state.active = (state.active + direction + total) % total;
  populateLightbox();
}

function closeLightbox() {
  if (els.lightbox.hidden) return;
  els.lightbox.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  const focusTarget = state.lastFocus;
  state.closeTimer = window.setTimeout(() => {
    els.lightbox.hidden = true;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }
    state.active = -1;
  }, 260);
}

function trapFocus(event) {
  const focusable = $$(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    els.lightbox
  ).filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* -------------------------------------------------------------------------
   其他交互
   ------------------------------------------------------------------------- */

function bindControls() {
  let searchTimer = 0;
  els.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = els.search.value;
      applyFilters();
    }, 160);
  });

  els.resetFilters.addEventListener("click", () => {
    state.query = "";
    state.category = "全部";
    els.search.value = "";
    $$(".filter-btn", els.filters).forEach((button) => {
      const active = button.dataset.category === "全部";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    applyFilters();
  });

  els.toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function bindTheme() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const current = document.documentElement.dataset.theme || (media.matches ? "dark" : "light");
  setTheme(current, false);

  els.themeToggle.addEventListener("click", () => {
    const next =
      (document.documentElement.dataset.theme || "light") === "dark" ? "light" : "dark";
    setTheme(next, true);
  });

  media.addEventListener("change", (event) => {
    let saved = null;
    try {
      saved = localStorage.getItem("portfolio-theme");
    } catch (error) {
      /* ignore */
    }
    if (!saved) setTheme(event.matches ? "dark" : "light", false);
  });
}

function setTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch (error) {
      /* ignore */
    }
  }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#141310" : "#f3ede3");
  if (els.themeToggle) {
    els.themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "切换浅色模式" : "切换深色模式"
    );
  }
}

function formatDate(value) {
  if (!value) return "";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function showLoadError(error) {
  els.worksCountText.textContent = "加载失败";
  els.emptyState.hidden = false;
  els.emptyTitle.textContent = STATIC_MODE ? "作品数据加载失败" : "没能连上本地服务";
  els.emptyText.textContent = STATIC_MODE
    ? "请刷新页面重试；如果刚部署，请确认 api/site.json 与 api/works.json 已上传。"
    : "请确认 start.bat 的窗口还开着，然后刷新页面。";
  els.emptyAction.hidden = true;
  els.resetFilters.hidden = true;
  els.gallery.innerHTML = "";
  showToast(error && error.message ? error.message : "内容加载失败", true);
}

function showToast(message, isError = false) {
  if (!els.toast) return;
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.toggle("is-error", Boolean(isError));
  els.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 3600);
}
