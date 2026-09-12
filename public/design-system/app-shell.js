// Keep legacy reference URLs usable while sharing the application's real header.
(() => {
  const kit = location.pathname.includes('/ui_kits/');
  if (new URLSearchParams(location.search).get('embed') !== '1') {
    location.replace('/design-system' + (kit ? '?view=kit' : ''));
    return;
  }
  const reportHeight = () => parent.postMessage({
    type: 'design-reference-height',
    height: document.body.getBoundingClientRect().height,
  }, location.origin);
  addEventListener('DOMContentLoaded', () => {
    new ResizeObserver(reportHeight).observe(document.body);
    reportHeight();
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link && !link.getAttribute('href')?.startsWith('#')) link.target = '_top';
    });
  });
})();
