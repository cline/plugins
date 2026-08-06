# LCP Debugging Snippets

Use these JavaScript snippets with the `evaluate_script` tool to extract deep insights from the page.

## 1. Identify LCP Element

Use this snippet to identify the LCP element and get raw timing data from the Performance API.

```javascript
async () => {
  const formatEntry = entry => {
    if (!entry) {
      return {
        found: false,
        reason:
          'No Largest Contentful Paint entry is available yet. Run this after page load or record a performance trace.',
      };
    }

    return {
      found: true,
      element: entry.element?.tagName,
      id: entry.element?.id,
      className:
        typeof entry.element?.className === 'string'
          ? entry.element.className
          : entry.element?.className?.baseVal,
      url: entry.url,
      startTime: entry.startTime,
      renderTime: entry.renderTime,
      loadTime: entry.loadTime,
      size: entry.size,
    };
  };

  const existing = performance.getEntriesByType('largest-contentful-paint');
  if (existing.length) {
    return formatEntry(existing[existing.length - 1]);
  }

  return await new Promise(resolve => {
    const timeout = setTimeout(() => resolve(formatEntry(null)), 1000);
    try {
      new PerformanceObserver(list => {
        clearTimeout(timeout);
        const entries = list.getEntries();
        resolve(formatEntry(entries[entries.length - 1]));
      }).observe({type: 'largest-contentful-paint', buffered: true});
    } catch {
      clearTimeout(timeout);
      resolve(formatEntry(null));
    }
  });
};
```

## 2. Audit Common Issues

Use this snippet to check for common DOM-based LCP issues (lazy loading, priority).

```javascript
() => {
  const issues = [];

  // Check for lazy-loaded images in viewport
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      issues.push({
        issue: 'lazy-loaded image in viewport',
        element: img.outerHTML.substring(0, 200),
        fix: 'Remove loading="lazy" from this image - it is in the initial viewport and may be the LCP element',
      });
    }
  });

  // Check for LCP-candidate images missing fetchpriority
  document.querySelectorAll('img:not([fetchpriority])').forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.width * rect.height > 50000) {
      issues.push({
        issue: 'large viewport image without fetchpriority',
        element: img.outerHTML.substring(0, 200),
        fix: 'Add fetchpriority="high" to this image - it is large and visible in the initial viewport',
      });
    }
  });

  // Check for render-blocking scripts in head
  document
    .querySelectorAll(
      'head script:not([async]):not([defer]):not([type="module"])',
    )
    .forEach(script => {
      if (script.src) {
        issues.push({
          issue: 'render-blocking script in head',
          element: script.outerHTML.substring(0, 200),
          fix: 'Add async or defer attribute, or move to end of body',
        });
      }
    });

  return {issueCount: issues.length, issues};
};
```
