(() => {
  const SITE = "https://hosting.gestontech.online";

  const pages = {
    "/": {
      title: "Geston Hosting | Hébergement web, Bots WhatsApp & Déploiement",
      description:
        "Geston Hosting est une plateforme d'hébergement web et de déploiement pour sites, applications, bots WhatsApp, panels Pterodactyl et projets de développeurs au Congo et en RDC.",
    },

    "/features": {
      title: "Fonctionnalités | Geston Hosting",
      description:
        "Découvrez les fonctionnalités de Geston Hosting : bots WhatsApp, panels Pterodactyl, déploiement et outils pour développeurs.",
    },

    "/services/bots": {
      title: "Bots WhatsApp | Geston Hosting",
      description:
        "Déployez et gérez vos bots WhatsApp avec Geston Hosting. Configuration et déploiement simplifiés.",
    },

    "/services/panels": {
      title: "Panels Pterodactyl | Geston Hosting",
      description:
        "Découvrez les panels Pterodactyl de Geston Hosting et leurs ressources pour vos applications et serveurs.",
    },

    "/docs": {
      title: "Documentation | Geston Hosting",
      description:
        "Consultez la documentation Geston Hosting pour comprendre les services, le déploiement et les outils disponibles.",
    },

    "/tutorials": {
      title: "Tutoriels | Geston Hosting",
      description:
        "Suivez les tutoriels Geston Hosting pour apprendre à utiliser les services et déployer vos projets.",
    },

    "/contact": {
      title: "Contact | Geston Hosting",
      description:
        "Contactez l'équipe Geston Hosting pour obtenir de l'aide sur votre compte, vos services ou vos déploiements.",
    },

    "/ai-chat": {
      title: "Assistant IA | Geston Hosting",
      description:
        "Utilisez l'assistant IA de Geston Hosting pour obtenir de l'aide sur les services, le déploiement et votre compte.",
    },
  };

  function setMeta(name, content) {
    let el = document.head.querySelector(
      `meta[name="${name}"]`
    );

    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }

    el.setAttribute("content", content);
  }

  function setProperty(property, content) {
    let el = document.head.querySelector(
      `meta[property="${property}"]`
    );

    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }

    el.setAttribute("content", content);
  }

  function setCanonical(url) {
    let el = document.head.querySelector(
      'link[rel="canonical"]'
    );

    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }

    el.setAttribute("href", url);
  }

  function updateSeo() {
    const path =
      window.location.pathname.replace(/\/+$/, "") || "/";

    const page = pages[path];

    if (!page) {
      setMeta("robots", "noindex, follow");
      return;
    }

    const canonical =
      SITE + (path === "/" ? "/" : path);

    document.title = page.title;

    setMeta(
      "description",
      page.description
    );

    setMeta(
      "robots",
      "index, follow, max-image-preview:large"
    );

    setMeta(
      "googlebot",
      "index, follow, max-image-preview:large"
    );

    setCanonical(canonical);

    setProperty(
      "og:type",
      "website"
    );

    setProperty(
      "og:url",
      canonical
    );

    setProperty(
      "og:title",
      page.title
    );

    setProperty(
      "og:description",
      page.description
    );

    setProperty(
      "og:site_name",
      "Geston Hosting"
    );

    setProperty(
      "og:locale",
      "fr_FR"
    );

    setMeta(
      "twitter:card",
      "summary_large_image"
    );

    setMeta(
      "twitter:title",
      page.title
    );

    setMeta(
      "twitter:description",
      page.description
    );
  }

  const originalPushState =
    history.pushState;

  history.pushState = function (...args) {
    const result =
      originalPushState.apply(
        this,
        args
      );

    updateSeo();

    return result;
  };

  const originalReplaceState =
    history.replaceState;

  history.replaceState = function (...args) {
    const result =
      originalReplaceState.apply(
        this,
        args
      );

    updateSeo();

    return result;
  };

  window.addEventListener(
    "popstate",
    updateSeo
  );

  window.addEventListener(
    "hashchange",
    updateSeo
  );

  updateSeo();
})();
