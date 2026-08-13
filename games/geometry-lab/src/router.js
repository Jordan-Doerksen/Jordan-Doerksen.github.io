export function createRouter(render) {
  let cleanup = null;

  function currentRoute() {
    const hash = window.location.hash || "#/";
    if (hash === "#/experiment/circles") return { path: "#/experiment", slug: "circles" };
    if (hash === "#/chamber/tessellation-and-packing") return { path: "#/chamber", slug: "tessellation-and-packing" };
    if (hash === "#/" || hash === "#/atlas") return { path: hash };
    const match = hash.match(/^#\/topic\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    return match ? { path: "#/topic", slug: match[1] } : { path: "#/not-found" };
  }

  function update() {
    if (cleanup) cleanup();
    cleanup = render(currentRoute()) || null;
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  window.addEventListener("hashchange", update);
  update();
  return () => {
    window.removeEventListener("hashchange", update);
    if (cleanup) cleanup();
  };
}

export function navigate(hash) {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
