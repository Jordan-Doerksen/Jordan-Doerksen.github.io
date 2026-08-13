import { createAtlasIndex } from "./core/atlas-index.js";
import { createRouter, navigate } from "./router.js";
import { mountHome } from "./views/home.js?v=0.14.0";
// Same specifier string as home.js so the browser keeps one module instance.
import { mountStage } from "./views/stage.js?v=0.14.0";
import { mountTopic } from "./views/topic.js?v=0.17.0";
import { mountTessellationChamber } from "./views/tessellation-chamber.js?v=0.13.0";

const app = document.querySelector("#app");

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} request failed: ${response.status}`);
  return response.json();
}

async function start() {
  try {
    const [atlas, config, recursionConfig, mathematicsConfig, chamberConfig, narrative] = await Promise.all([
      loadJson("data/public-atlas.json"),
      loadJson("config/interaction.json"),
      loadJson("config/recursion.json"),
      loadJson("config/mathematics.json"),
      loadJson("config/tessellation-chamber.json"),
      // The narrative layer is editorial, not structural: if it is absent the
      // topic pages must still render, so this one fetch degrades to null.
      loadJson("data/topic-narrative.json?v=0.13.0").catch((error) => {
        console.warn("Topic narrative unavailable; topic pages render without it.", error);
        return null;
      })
    ]);
    const index = createAtlasIndex(atlas);

    createRouter((route) => {
      if (route.path === "#/experiment") {
        document.title = "Two circles — Geometry Lab";
        return mountStage(app, { config, atlas, index, navigate });
      }
      // #/atlas keeps working because it was published (D-034): the old catalogue
      // route resolves to the same front door instead of breaking.
      if (route.path === "#/" || route.path === "#/atlas") {
        document.title = "Geometry Lab";
        return mountHome(app, { atlas, config, index, navigate });
      }
      if (route.path === "#/chamber") {
        document.title = "Five tiling questions — Geometry Lab";
        return mountTessellationChamber(app, { config: chamberConfig, index });
      }
      if (route.path === "#/topic") {
        const topic = index.topicsBySlug.get(route.slug);
        if (topic?.published) {
          document.title = `${topic.title} — Geometry Lab`;
          return mountTopic(app, { topic, atlas, index, navigate, recursionConfig, mathematicsConfig, narrative });
        }
      }
      document.title = "Not found — Geometry Lab";
      app.innerHTML = `<section class="not-found"><h1>That page is not here.</h1><p><a href="#/">Back to the start</a></p></section>`;
      return null;
    });
  } catch (error) {
    app.innerHTML = `<section class="load-error"><h1>This page could not load.</h1><p>It reads its data over HTTP. Serve the <code>web</code> directory with a local server, then reload.</p></section>`;
    console.error(error);
  }
}

start();
