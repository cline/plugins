# Responsive Images & Client Hints

Comprehensive guide to creating responsive images with Cloudinary, including `dpr_auto`, `w_auto`, and Client Hints configuration.

## Overview

Cloudinary provides several approaches for responsive images:
1. Client Hints (`dpr_auto`, `w_auto`) - Automatic adaptation (Chromium-only)
2. Explicit DPR values (`dpr_2.0`) - Universal browser support
3. JavaScript solutions - Dynamic responsive images
4. Responsive breakpoints (`w_auto:breakpoints`) - Multiple image sizes

## Device Pixel Ratio (DPR)

### Understanding DPR

DPR represents the ratio between physical pixels and CSS pixels on a device:
- 1x displays: Standard screens (DPR = 1.0)
- 2x displays: Retina/HiDPI screens (DPR = 2.0)
- 3x displays: High-end mobile devices (DPR = 3.0)

Why it matters: A 400px wide image needs to be 800px actual size on 2x displays to look sharp.

### `dpr_auto` Parameter

Syntax:
```
c_scale,w_400/dpr_auto/f_auto/q_auto
```

What it does: Automatically multiplies dimensions by the device's DPR
- On 1x display: Delivers 400px image
- On 2x display: Delivers 800px image
- On 3x display: Delivers 1200px image

### Browser Compatibility

OK Works on Chromium-based browsers:
- Google Chrome
- Microsoft Edge
- Opera
- Samsung Internet
- Brave

NO Does NOT work on:
- Firefox
- Safari (macOS and iOS)
- Other non-Chromium browsers

Fallback behavior: When Client Hints unavailable, treats request as `dpr_1.0`

### Named Transformation Limitation

`dpr_auto` does NOT work inside named transformations (similar to `f_auto` and `w_auto`).

Why: Client Hints information isn't available when named transformation is processed. The CDN needs to "see" `dpr_auto` directly in the URL to adapt it.

NO Don't do this:
```
# Named transformation "product_thumb" contains: c_fill,w_300,h_300/dpr_auto/f_auto
t_product_thumb
```

OK Do this instead:
```
# Named transformation "product_thumb" contains: c_fill,w_300,h_300
t_product_thumb/dpr_auto/f_auto/q_auto
```

## Enabling Client Hints

Client Hints must be enabled for `dpr_auto` and `w_auto` to work.

### HTML Configuration

Add these `<meta>` tags to your HTML `<head>` before any `<link>`, `<style>`, or `<script>` elements:

```html
<meta http-equiv="Accept-CH" content="DPR, Viewport-Width, Width">
<meta http-equiv="Delegate-CH" content="DPR https://res.cloudinary.com; Viewport-Width https://res.cloudinary.com; Width https://res.cloudinary.com">
```

What these do:
- `Accept-CH`: Requests browser to send DPR, Viewport-Width, and Width hints
- `Delegate-CH`: Tells browser to include hints for Cloudinary domain

### HTTP Header Configuration

Alternatively, configure via server HTTP headers:

```http
Accept-CH: DPR, Viewport-Width, Width
Delegate-CH: DPR https://res.cloudinary.com; Viewport-Width https://res.cloudinary.com; Width https://res.cloudinary.com
```

Use when:
- You control the web server configuration
- Want to avoid adding meta tags to every page
- Using a CDN with header configuration support

### Verification

Check if Client Hints are working:

Browser DevTools:
1. Open DevTools -> Network tab
2. Load page with Cloudinary images
3. Find image request
4. Check Request Headers for: `DPR`, `Viewport-Width`, `Width`

If headers are missing: Client Hints aren't enabled or browser doesn't support them.

## Automatic Width (`w_auto`)

### Basic Usage

Syntax:
```
c_fill,g_auto,w_auto/f_auto/q_auto
```

What it does: Uses `Width` Client Hint to deliver image sized for container width.

Requirements:
- Client Hints enabled (same as `dpr_auto`)
- Chromium-based browser
- `Width` hint sent by browser

### Breakpoints

Automatic breakpoints:
```
c_fill,g_auto,w_auto:breakpoints/f_auto/q_auto
```
Cloudinary generates optimal breakpoint set.

Custom breakpoint range:
```
c_fill,g_auto,w_auto:100:1600:80/f_auto/q_auto
```
Creates breakpoints from 100px to 1600px in 80px increments.

Syntax: `w_auto:min:max:step`
- `min`: Minimum width (default 100)
- `max`: Maximum width (default 3840)
- `step`: Width increment (default calculated by Cloudinary)

Use cases:
- Responsive hero images
- Gallery thumbnails that adapt to grid width
- Product images in flexible layouts

### Combining `dpr_auto` and `w_auto`

```
c_fill,g_auto,w_auto:breakpoints/dpr_auto/f_auto/q_auto
```

Result: Delivers optimal size for both container width AND device DPR.
- 400px container on 2x display: ~800px image delivered

Important: Both require Client Hints; fallback to standard behavior without them.

## Alternative Approaches

### 1. Explicit DPR Values (Universal Browser Support)

Best for: Critical images that must look sharp on Retina displays

```
c_scale,w_400/dpr_2.0/f_auto/q_auto
```

Pros:
- OK Works in all browsers
- OK Predictable image size
- OK No Client Hints required

Cons:
- NO Same 2x image delivered to 1x displays (larger file than needed)
- NO Not adaptive to 3x displays

Best practice: Use for hero images, logos, and critical visuals where sharpness matters.

### 2. Multiple Image Variants with `<picture>` Element

Best for: Art direction and format flexibility

```html
<picture>
  <source
    media="(min-width: 1200px)"
    srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_1200/f_auto/q_auto/hero.jpg 1x,
            https://res.cloudinary.com/demo/image/upload/c_fill,w_2400/f_auto/q_auto/hero.jpg 2x">
  <source
    media="(min-width: 768px)"
    srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_768/f_auto/q_auto/hero.jpg 1x,
            https://res.cloudinary.com/demo/image/upload/c_fill,w_1536/f_auto/q_auto/hero.jpg 2x">
  <img
    src="https://res.cloudinary.com/demo/image/upload/c_fill,w_400/f_auto/q_auto/hero.jpg"
    srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_800/f_auto/q_auto/hero.jpg 2x"
    alt="Hero image">
</picture>
```

Pros:
- OK Works in all browsers
- OK Different crops per viewport (art direction)
- OK Explicit control over breakpoints

Cons:
- NO More verbose HTML
- NO Manual breakpoint management

### 3. JavaScript-Based Responsive Images

Best for: Dynamic, framework-integrated solutions

Cloudinary JavaScript SDK:
```javascript
import { Cloudinary } from '@cloudinary/url-gen';

const cld = new Cloudinary({ cloud: { cloudName: 'demo' }});
const image = cld.image('sample')
  .resize(fill().width('auto').gravity('auto'))
  .format('auto')
  .quality('auto');
```

React example:
```jsx
import { AdvancedImage, responsive } from '@cloudinary/react';

<AdvancedImage
  cldImg={myImage}
  plugins={[responsive({ steps: [800, 1200, 1600] })]}
/>
```

Pros:
- OK Works in all browsers
- OK Framework integration
- OK Dynamic adaptation
- OK Lazy loading support

Cons:
- NO Requires JavaScript
- NO Additional library dependency

### 4. Conditional Transformations (No JS Required)

Best for: Server-side or URL-based responsive logic

```
if_w_gt_2000/c_scale,w_2000/if_else/if_w_gt_1000/c_scale,w_1000/if_else/c_scale,w_800/if_end/if_end/f_auto/q_auto
```

Adapts to original image size without client-side detection.

Pros:
- OK No JavaScript required
- OK Works in all browsers
- OK Based on actual asset dimensions

Cons:
- NO Not based on viewport/device
- NO URL can become complex

## Comparison Matrix

| Approach | Browser Support | Client Hints Required | Named Transform Compatible | Complexity |
|----------|----------------|----------------------|---------------------------|------------|
| `dpr_auto` | Chromium only | Yes | No | Low |
| `w_auto` | Chromium only | Yes | No | Low |
| Explicit DPR | All browsers | No | Yes | Low |
| `<picture>` element | All browsers | No | Yes | Medium |
| JavaScript SDK | All browsers | No | Yes | Medium |
| Conditionals | All browsers | No | Yes | Medium-High |

## Best Practices

### When to Use Client Hints (`dpr_auto`, `w_auto`)

Use when:
- Target audience primarily uses Chrome/Edge
- Want simplest possible implementation
- Can accept graceful degradation for other browsers
- Not using named transformations for these parameters

Don't use when:
- Safari/Firefox users are significant portion of audience
- Need predictable behavior across all browsers
- Using within named transformations
- SEO/crawler rendering is critical (many crawlers don't support Client Hints)

### Recommended Hybrid Approach

For critical images:
```html
<img
  src="https://res.cloudinary.com/demo/image/upload/c_fill,w_400/dpr_2.0/f_auto/q_auto/hero.jpg"
  srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_400/dpr_2.0/f_auto/q_auto/hero.jpg 2x,
          https://res.cloudinary.com/demo/image/upload/c_fill,w_400/dpr_3.0/f_auto/q_auto/hero.jpg 3x">
```
Works everywhere, looks sharp on all displays.

For content images (where Client Hints acceptable):
```html
<img src="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/dpr_auto/f_auto/q_auto/content.jpg">
```
Simple implementation, graceful fallback.

### Performance Tips

1. Combine with lazy loading:
   ```html
   <img loading="lazy" src="...dpr_auto..." />
   ```

2. Use `q_auto` with DPR:
   ```
   dpr_2.0/f_auto/q_auto
   ```
   Cloudinary adjusts quality to balance sharpness and file size.

3. Consider bandwidth:
   - `dpr_3.0` images are 9x larger than `dpr_1.0` (3^2 = 9)
   - Most users don't notice difference between 2x and 3x
   - Consider capping at `dpr_2.0` for better performance

4. Cache optimization:
   - Limit DPR/breakpoint combinations to reduce cache variations
   - More variations = more unique cached assets

## Debugging Client Hints

### Issue: `dpr_auto` Not Working

Check:
1. Browser compatibility: Only Chromium-based browsers support Client Hints
2. Meta tags present: Verify `<meta http-equiv="Accept-CH">` in HTML
3. Request headers: Check DevTools -> Network -> Request Headers for `DPR` header
4. Named transformation: Ensure `dpr_auto` is in URL, not inside named transformation

Common causes:
- Using Firefox or Safari (not supported)
- Meta tags missing or in wrong location
- Meta tags after `<link>` or `<script>` tags
- `dpr_auto` inside named transformation

### Issue: Different Image Sizes Than Expected

Remember: `dpr_auto` multiplies your specified dimensions
```
w_400/dpr_auto on 2x display = 800px actual width
```

To get 400px CSS width:
- Specify `w_400` in transformation
- Browser will display at 400px CSS (800px physical on 2x)

### Issue: Large File Sizes with `dpr_auto`

Cause: Higher DPR = larger images (quadratic growth)
- `dpr_1.0`: 400x300 = 120,000 pixels
- `dpr_2.0`: 800x600 = 480,000 pixels (4x larger)
- `dpr_3.0`: 1200x900 = 1,080,000 pixels (9x larger)

Solutions:
1. Use `q_auto` to optimize quality based on dimensions
2. Consider `q_auto:eco` for 2x+ displays
3. Limit max DPR: Use explicit `dpr_2.0` instead of `dpr_auto`
4. Use format optimization: `f_auto` delivers WebP to supported browsers

## Responsive Breakpoints

### Automatic Breakpoint Generation

```
c_fill,g_auto,w_auto:breakpoints/f_auto/q_auto
```

What it does: Cloudinary analyzes image and generates optimal breakpoint set
- Typically 5-10 breakpoints
- Balanced between number of variants and file size optimization
- Adapts to image content (more breakpoints for detailed images)

Use when:
- You don't know ideal breakpoint sizes
- Want Cloudinary to optimize automatically
- Content images with varying dimensions

### Custom Breakpoint Range

```
w_auto:100:1600:80
```

Syntax: `w_auto:min:max:step`
- min: Minimum width in pixels (default 100)
- max: Maximum width in pixels (default 3840)
- step: Increment between breakpoints (default: calculated by Cloudinary)

Examples:
```
w_auto:200:1200:100        # 200, 300, 400... 1200 (11 breakpoints)
w_auto:320:1920:320        # 320, 640, 960, 1280, 1600, 1920 (6 breakpoints)
w_auto:100:2000            # Let Cloudinary calculate step size
```

Use when:
- You know your layout breakpoints
- Want to match CSS media queries
- Need specific image sizes

### Combining with DPR

```
c_fill,g_auto,w_auto:breakpoints/dpr_auto/f_auto/q_auto
```

Result: Adapts to BOTH container width AND device DPR
- 600px container on 2x display: ~1200px image
- 800px container on 1x display: ~800px image

Trade-off: Creates many cached variations (breakpoints x DPR values)

## Client Hints Headers Reference

### Request Headers (Browser -> Server)

When Client Hints are enabled, browsers send:

DPR Header:
```
DPR: 2.0
```
Indicates device pixel ratio.

Width Header:
```
Width: 800
```
Indicates layout width of image in CSS pixels.

Viewport-Width Header:
```
Viewport-Width: 1920
```
Indicates viewport width in CSS pixels.

### Using in Server-Side Rendering

Access Client Hints in server code:

Node.js/Express:
```javascript
app.get('/image', (req, res) => {
  const dpr = req.headers.dpr || '1.0';
  const width = req.headers.width || '800';

  const imageUrl = `https://res.cloudinary.com/demo/image/upload/c_scale,w_${width}/dpr_${dpr}/f_auto/q_auto/sample.jpg`;

  res.send(`<img src="${imageUrl}">`);
});
```

Why: Server can generate optimal image URLs based on actual device capabilities.

## Real-World Patterns

### Pattern 1: Progressive Enhancement

Base: Works everywhere
```html
<img src="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/dpr_2.0/f_auto/q_auto/product.jpg">
```

Enhanced: Better for Chrome/Edge users
```html
<meta http-equiv="Accept-CH" content="DPR">
<img src="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/dpr_auto/f_auto/q_auto/product.jpg">
```

### Pattern 2: Responsive Grid

```html
<meta http-equiv="Accept-CH" content="Width, DPR">

<div class="grid">
  <img src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_auto:200:800:100/dpr_auto/f_auto/q_auto/img1.jpg">
  <img src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_auto:200:800:100/dpr_auto/f_auto/q_auto/img2.jpg">
</div>
```

Each image adapts to grid cell width and device DPR.

### Pattern 3: Named Transformation + Auto Parameters

```
# Named transformation "product_square":
c_fill,g_auto,h_800,w_800

# Usage:
t_product_square/dpr_auto/f_auto/q_auto
```

Combines reusable named transformation with auto parameters.

### Pattern 4: Art Direction with Client Hints

```html
<picture>
  <source
    media="(min-width: 1200px)"
    srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,ar_21:9/dpr_auto/f_auto/q_auto/hero.jpg">
  <source
    media="(min-width: 768px)"
    srcset="https://res.cloudinary.com/demo/image/upload/c_fill,w_768,ar_16:9/dpr_auto/f_auto/q_auto/hero.jpg">
  <img
    src="https://res.cloudinary.com/demo/image/upload/c_fill,w_400,ar_4:3/dpr_auto/f_auto/q_auto/hero.jpg">
</picture>
```

Different aspect ratios per viewport + DPR adaptation.

## Framework Integration

### React with Cloudinary SDK

```jsx
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage, responsive } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';

const cld = new Cloudinary({ cloud: { cloudName: 'demo' }});

const MyImage = () => {
  const img = cld.image('sample')
    .resize(fill().width(800).gravity(autoGravity()))
    .format('auto')
    .quality('auto');

  return <AdvancedImage
    cldImg={img}
    plugins={[responsive({ steps: [400, 800, 1200, 1600] })]}
  />;
};
```

### Vue with Cloudinary SDK

```vue
<template>
  <cld-image
    cloudName="demo"
    publicId="sample"
    :responsive
    :plugins="[responsivePlugin]">
    <cld-transformation
      crop="fill"
      width="800"
      gravity="auto" />
  </cld-image>
</template>

<script>
import { responsive } from '@cloudinary/vue';

export default {
  data() {
    return {
      responsivePlugin: responsive({ steps: [400, 800, 1200] })
    };
  }
};
</script>
```

### Next.js with Cloudinary Loader

```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/demo/image/upload/',
  },
};
```

```jsx
import Image from 'next/image';

<Image
  src="sample.jpg"
  width={800}
  height={600}
  alt="Sample"
/>
```

Next.js automatically generates responsive variants.

## Migration from Static to Responsive

### Step 1: Audit Current Implementation

Identify static image URLs:
```html
<!-- Static (non-responsive) -->
<img src="https://res.cloudinary.com/demo/image/upload/w_800/product.jpg">
```

### Step 2: Add Client Hints

Add meta tags to HTML `<head>`:
```html
<meta http-equiv="Accept-CH" content="DPR, Viewport-Width, Width">
<meta http-equiv="Delegate-CH" content="DPR https://res.cloudinary.com; Viewport-Width https://res.cloudinary.com">
```

### Step 3: Update URLs

Option A: Simple DPR adaptation (works for Chromium)
```html
<img src="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/dpr_auto/f_auto/q_auto/product.jpg">
```

Option B: Full responsive (works for Chromium)
```html
<img src="https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_auto:200:1600/dpr_auto/f_auto/q_auto/product.jpg">
```

Option C: Universal browser support
```html
<img
  src="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/f_auto/q_auto/product.jpg"
  srcset="https://res.cloudinary.com/demo/image/upload/c_scale,w_800/dpr_2.0/f_auto/q_auto/product.jpg 2x">
```

### Step 4: Test

Test in multiple browsers:
- Chrome (Client Hints should work)
- Safari (should fallback gracefully)
- Mobile devices (check 2x/3x displays)

Check DevTools:
- Network tab: Verify image sizes delivered
- Request headers: Confirm DPR/Width hints sent (Chrome)
- Rendered size: Images should look sharp

## Performance Monitoring

### Metrics to Track

1. Image byte size: Should decrease for 1x displays when using `dpr_auto`
2. LCP (Largest Contentful Paint): Responsive images should improve load times
3. Cache hit rate: Too many variations can reduce cache effectiveness

### Optimization Tips

1. Limit breakpoint count: 5-8 breakpoints is usually sufficient
2. Use `q_auto`: Automatically optimizes quality based on dimensions
3. Consider CDN caching: More variations = more cached assets
4. Monitor Client Hints adoption: Track browser usage to assess benefit

## Troubleshooting

### Images Too Large on Mobile

Check:
- Is `w_auto` working? (requires Client Hints + Chromium)
- Did you set max width in `w_auto:min:max` range?
- Consider using explicit `<picture>` element for better control

Fix:
```
<!-- Add max width -->
c_fill,g_auto,w_auto:100:1000/dpr_auto/f_auto/q_auto
```

### Images Blurry on Retina Displays

Check:
- Is `dpr_auto` in the URL?
- Are Client Hints enabled and working?
- Is browser Chromium-based?

Fix for all browsers:
```html
<img
  srcset="url/dpr_1.0/... 1x,
          url/dpr_2.0/... 2x">
```

### Too Many Cached Variations

Cause: Many breakpoints x DPR values = cache fragmentation

Solutions:
1. Reduce breakpoint count
2. Use fewer DPR values (cap at 2.0)
3. Use named transformations to share common processing
4. Consider single 2x image for simpler caching

## Additional Resources

- [Responsive Images using Client Hints](https://cloudinary.com/documentation/responsive_server_side_client_hints.md)
- [Responsive Images Overview](https://cloudinary.com/documentation/responsive_images.md)
- [Responsive images using HTML and dynamic image transformations](https://cloudinary.com/documentation/responsive_html.md)
- [Responsive images using JavaScript frontend frameworks](https://cloudinary.com/documentation/responsive_client_side_fe_frameworks.md)
- [Responsive images using the cloudinary-core JS library](https://cloudinary.com/documentation/responsive_client_side_js.md)
- [Cloudinary SDKs](https://cloudinary.com/documentation/cloudinary_sdks.md)
- [React SDK Documentation](https://cloudinary.com/documentation/react_integration.md)
