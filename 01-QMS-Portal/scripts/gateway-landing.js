(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = document.querySelectorAll("[data-reveal]");

  if (reduceMotion) {
    revealTargets.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  document.body.classList.add("motion-ready");

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  });

  revealTargets.forEach((node) => revealObserver.observe(node));

  const gateObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle(
        "is-active",
        entry.isIntersecting && entry.intersectionRatio > 0.32
      );
    });
  }, {
    threshold: [0.32, 0.55]
  });

  document.querySelectorAll(".gate-step").forEach((node) => gateObserver.observe(node));
})();
