// Applies the theme chosen on this device before the first paint, so the page never flashes the wrong one,
// and keeps following the system while the choice is "Sistema". Adapted from Orbis.
// It is a file, not an inline script, because the Content-Security-Policy only allows scripts from the origin.
// shell/theme/use-theme.ts reads the same key and keeps doing this while the app runs.
(() => {
  const media = matchMedia('(prefers-color-scheme: dark)');
  // The --bg of each theme, for the browser bars.
  const barColors = { light: '#FDFDFE', dark: '#13161C' };
  const apply = () => {
    let choice = 'system';
    try {
      choice = localStorage.getItem('tinyfold:theme') || 'system';
    } catch {
      // Storage blocked: follow the system.
    }
    const theme = choice === 'light' || choice === 'dark' ? choice : media.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = barColors[theme];
  };
  apply();
  media.addEventListener('change', apply);
})();
