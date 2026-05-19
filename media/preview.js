(function () {
  const vscode = acquireVsCodeApi();

  function showToast(text) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 1600);
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest("[data-command]");
    if (btn instanceof HTMLElement) {
      e.preventDefault();
      const command = btn.getAttribute("data-command");
      if (command) {
        vscode.postMessage({ type: "command", command });
      }
      return;
    }

    const link = target.closest('a[href^="command:"]');
    if (link instanceof HTMLAnchorElement) {
      e.preventDefault();
      const href = link.getAttribute("href") || "";
      const command = href.replace(/^command:/, "");
      vscode.postMessage({ type: "command", command });
    }
  });

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "toast" && typeof msg.text === "string") {
      showToast(msg.text);
    }
  });
})();
