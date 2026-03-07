// Register the service worker
export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered:", reg.scope);

          // Check for updates periodically
          setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
        })
        .catch((err) => {
          console.log("SW registration failed:", err);
        });
    });
  }
}
