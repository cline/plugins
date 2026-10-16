# Advanced Features: Variables, Conditionals & Arithmetic

This reference covers advanced Cloudinary transformation capabilities for building dynamic, template-based, and conditional transformations.

## Variables

Variables allow you to reuse values across a transformation chain and create template transformations that adapt to asset properties.

### Basic Variable Syntax

Declaration and usage:
```
$varName_value/...use_$varName...
```

Rules:
- Variable names: alphanumeric only, must start with letter
- NO underscores in variable names (NO `$my_width` OK `$mywidth`)
- Values can be numeric or string (strings use `!` delimiters)
- Declare before use (left to right in URL)

### Numeric Variables

Simple value reuse:
```
$size_300/c_fill,h_$size,w_$size
```
Creates a 300x300 square. Change `$size_300` once to update both dimensions.

Multiple variables:
```
$width_800,$height_600/c_fill,h_$height,w_$width/f_auto/q_auto
```
Template for any dimensions.

Padding/offset consistency:
```
$pad_50/l_logo/c_scale,w_100/fl_layer_apply,g_north_west,x_$pad,y_$pad/f_auto/q_auto
```
Logo positioned with consistent 50px padding from edges.

### String Variables

Syntax: Use `!` delimiters for string values
```
$color_!blue!/b_$color,c_pad,w_1.0/f_auto/q_auto
$text_!Hello World!/l_text:Arial_40:$text/fl_layer_apply/f_auto/q_auto
```

Important: Spaces in string variables are preserved, no URL encoding needed in declaration.

Text interpolation: Use `$(varName)` syntax in text overlays
```
$date_25/co_white,l_text:Arial_60:Day%20$(date)/fl_layer_apply,g_center/f_auto/q_auto
```

### Asset Property Variables

Access original asset properties using predefined variables:

Dimension variables:
- `$iw` - Initial width (original width in pixels)
- `$ih` - Initial height (original height in pixels)
- `$ar` - Aspect ratio (width/height, e.g., 1.5 for 3:2 ratio)
- `$cp` - Current page/layer number (for PDFs, multi-page TIFFs)
- `$tags` - Asset tags (use in conditionals)

Examples:
```
$iw/w_$iw_div_2/f_auto/q_auto                    # Half original width
$iw,$ih/c_scale,w_$iw,h_$ih_div_2/f_auto/q_auto  # Half original height
$ar/c_fill,ar_$ar,w_800/f_auto/q_auto            # Maintain original aspect ratio
```

Use cases:
- Relative sizing: resize based on original dimensions
- Maintain proportions: preserve original aspect ratio while resizing
- Responsive templates: one URL adapts to any asset size

### Metadata and Context Variables

Structured metadata:
```
$title_!md:title!/co_white,l_text:Arial_50:$(title)/fl_layer_apply,g_north/f_auto/q_auto
```
Overlays text from asset's metadata field `title`.

Context variables:
```
$category_!ctx:category!/if_ctx:!category!_eq_!featured!/e_saturation:50/if_end/f_auto/q_auto
```
Conditional transformation based on context variable.

Common metadata fields:
- `md:title`, `md:description`, `md:price`, `md:stock`, `md:date`
- Must be set on asset via [structured metadata](https://cloudinary.com/documentation/structured_metadata.md)

### Variable Scope and Order

Variables are scoped left-to-right:
```
OK $size_300/c_fill,h_$size,w_$size              # Declared before use
NO c_fill,h_$size,w_$size/$size_300              # Used before declaration
```

Variables persist across components:
```
$brand_!0066ff!/bo_3px_solid_rgb:$brand,c_fill,h_400,w_600/co_rgb:$brand,l_text:Arial_40:Brand/fl_layer_apply/f_auto/q_auto
```
Brand color used in multiple components.

## Arithmetic Operations

Perform calculations on dimensions using asset properties or variables.

### Basic Operators

- `add` - Addition: `w_add_100` (width + 100px)
- `sub` - Subtraction: `h_sub_50` (height - 50px)
- `mul` - Multiplication: `w_mul_2` (width x 2)
- `div` - Division: `w_div_2` (width divided by 2)

Examples:
```
c_scale,w_iw_div_2/f_auto/q_auto                     # Half original width
c_crop,h_ih_sub_100,w_iw/f_auto/q_auto               # Crop 100px from height
c_scale,w_mul_1.5/f_auto/q_auto                      # 150% of original width
```

### Chaining Operations

Multiple operations in sequence:
```
c_scale,w_iw_div_2_mul_3/f_auto/q_auto               # (width divided by 2) x 3
c_scale,w_iw_sub_100_div_2/f_auto/q_auto             # (width - 100) divided by 2
```

Order of operations: Left to right, no precedence

### Practical Arithmetic Examples

Create responsive padding:
```
$pad_iw_mul_0.05/l_logo/fl_layer_apply,g_north_west,x_$pad,y_$pad/f_auto/q_auto
```
Logo padding is 5% of original width.

Maintain aspect ratio with constraints:
```
c_scale,w_800,h_800_div_ar/f_auto/q_auto
```
Width fixed at 800px, height calculated from aspect ratio.

Add borders relative to size:
```
$border_iw_div_100/bo_$(border)px_solid_black/f_auto/q_auto
```
Border thickness is 1% of image width.

### Using Arithmetic with Variables

```
$base_200/c_fill,h_$base,w_$base_mul_2/f_auto/q_auto
```
Creates 200x400 rectangle (height = $base, width = $base x 2).

```
$margin_iw_mul_0.1/l_badge/fl_layer_apply,g_north_east,x_$margin,y_$margin/f_auto/q_auto
```
Badge positioned with 10% margin relative to image width.

## Conditionals

Build responsive, adaptive transformations that change based on asset properties, tags, metadata, or context.

### Basic Conditional Syntax

```
if_<condition>/...transformations.../if_end
if_<condition>/...true_branch.../if_else/...false_branch.../if_end
```

Critical: Every `if_` must close with `if_end`

### Comparison Operators

- `eq` - Equal to
- `ne` - Not equal to
- `lt` - Less than
- `lte` - Less than or equal
- `gt` - Greater than
- `gte` - Greater than or equal

Examples:
```
if_w_gt_1000/c_scale,w_1000/if_end                   # Downsize large images
if_ar_eq_1.0/r_max/if_end                            # Circle if square
if_fc_gte_1/c_thumb,g_face,w_200/if_end              # Face-centered if face detected
```

### Logical Operators

AND - Both conditions must be true:
```
if_w_gt_800_and_h_gt_600/c_fill,h_600,w_800/if_end
```

OR - Either condition must be true:
```
if_w_gt_2000_or_h_gt_2000/c_limit,w_2000/if_end
```

Precedence: AND has higher precedence than OR
```
if_A_and_B_or_C     # Evaluates as: (A AND B) OR C
```

### Dimension-Based Conditionals

Width and height:
```
if_w_gt_1000/c_scale,w_1000/if_end                           # Limit max width
if_h_lt_500/c_fit,h_500,w_800/if_end                         # Ensure min height
if_w_gte_1920_and_h_gte_1080/q_90/if_else/q_auto/if_end     # Higher quality for large images
```

Aspect ratio:
```
if_ar_gt_1.0/c_fill,h_400,w_800/if_else/c_fill,h_800,w_400/if_end
```
Different crops for landscape (ar > 1.0) vs portrait (ar <= 1.0).

```
if_ar_gt_1.5/c_crop,ar_16:9/if_else/c_pad,ar_16:9,b_auto/if_end
```
Crop wide images to 16:9, pad narrower images.

### Tag-Based Conditionals

Check for tag presence:
```
if_!sale!_in_tags/l_sale_badge/fl_layer_apply,g_north_east/if_end/f_auto/q_auto
```

Check for tag absence:
```
if_!premium!_nin_tags/l_watermark/fl_layer_apply,g_center/if_end/f_auto/q_auto
```

Multiple tags (AND logic):
```
if_!sale:featured!_in_tags/e_saturation:50/if_end/f_auto/q_auto
```
Both "sale" AND "featured" tags must be present (colon = AND).

Important: Tag values must be wrapped in `!` delimiters.

### Face Count Conditionals

Face detection:
```
if_fc_gt_0/c_thumb,g_face,h_200,w_200/if_else/c_fill,g_auto,h_200,w_200/if_end/f_auto/q_auto
```
Uses face detection if faces found, otherwise smart crop.

```
if_fc_eq_1/c_thumb,g_face,h_300,w_300/if_else/c_fill,g_faces,h_300,w_400/if_end/f_auto/q_auto
```
Single face: square crop. Multiple faces: wider crop to include all.

### Metadata-Based Conditionals

Numeric metadata:
```
if_md:!price!_gt_100/l_premium_badge/fl_layer_apply,g_north_west/if_end/f_auto/q_auto
```

String metadata:
```
if_md:!category!_eq_!electronics!/e_sharpen:100/if_end/f_auto/q_auto
```

Combined conditions:
```
if_md:!stock!_gt_0_and_md:!featured!_eq_!true!/l_featured_badge/fl_layer_apply/if_end/f_auto/q_auto
```
Badge only if in stock AND featured.

### Context-Based Conditionals

Context variables (set at request time):
```
if_ctx:!theme!_eq_!dark!/e_brightness:20/if_end/f_auto/q_auto
```

Use cases:
- A/B testing: different transformations per variant
- Personalization: adapt to user preferences
- Multi-tenant: brand-specific overlays

### Nested Conditionals

Pattern: Conditionals can be nested for complex logic
```
if_w_gt_1000/if_ar_gt_1.5/c_crop,ar_16:9/if_else/c_scale,w_1000/if_end/if_end/f_auto/q_auto
```
If wide (>1000px), check aspect ratio and handle accordingly.

Best practice: Keep nesting shallow (2-3 levels max) for maintainability.

### Complex Conditional Examples

Art direction with fallback:
```
if_ar_gt_2.0/c_crop,ar_16:9/if_else/if_ar_lt_0.5/c_pad,ar_9:16,b_auto/if_else/c_scale,w_800/if_end/if_end/f_auto/q_auto
```
- Very wide (ar > 2.0): Crop to 16:9
- Very tall (ar < 0.5): Pad to 9:16 with blur
- Normal: Scale to 800px width

Quality optimization by size:
```
if_w_gt_2000_or_h_gt_2000/q_90/if_else/if_w_lt_500/q_70/if_else/q_auto/if_end/if_end/f_auto
```
- Large (>2000px): q_90
- Small (<500px): q_70
- Normal: q_auto

Face-aware with density check:
```
if_fc_eq_0/c_fill,g_auto,h_400,w_600/if_else/if_fc_lt_3/c_thumb,g_face,h_400,w_600/if_else/c_fill,g_faces,h_400,w_800/if_end/if_end/f_auto/q_auto
```
- No faces: Smart crop
- 1-2 faces: Face-centered crop
- 3+ faces: Wider crop to include all faces

## Arithmetic Expressions

Perform calculations on dimensions, positions, and other numeric parameters.

### Available Operators

- `add` - Addition
- `sub` - Subtraction
- `mul` - Multiplication
- `div` - Division
- `pow` - Power/exponent

### Basic Arithmetic

Division:
```
c_scale,w_div_2/f_auto/q_auto                        # Half width
w_iw_div_2                                           # Half of initial width
```

Multiplication:
```
c_scale,w_mul_1.5/f_auto/q_auto                      # 150% width
w_iw_mul_2                                           # Double initial width
```

Addition:
```
c_crop,h_add_100,w_800/f_auto/q_auto                 # Add 100px to height
w_iw_add_200                                         # Initial width + 200px
```

Subtraction:
```
c_crop,h_sub_50,w_800/f_auto/q_auto                  # Subtract 50px from height
h_ih_sub_100                                         # Initial height - 100px
```

### Chained Arithmetic

Multiple operations (left-to-right evaluation):
```
w_iw_div_2_mul_3                                     # (initial_width divided by 2) x 3
h_ih_sub_100_div_2                                   # (initial_height - 100) divided by 2
w_iw_mul_0.8_add_50                                  # (initial_width x 0.8) + 50
```

Order matters:
```
w_100_add_50_mul_2   # (100 + 50) x 2 = 300
w_100_mul_2_add_50   # (100 x 2) + 50 = 250
```

### Aspect Ratio Calculations

Calculate height from width:
```
c_scale,w_800,h_800_div_ar/f_auto/q_auto
```
Height = 800 divided by aspect_ratio (maintains proportions).

Calculate width from height:
```
c_scale,h_600,w_600_mul_ar/f_auto/q_auto
```
Width = 600 x aspect_ratio (maintains proportions).

Adjust aspect ratio:
```
c_crop,ar_ar_mul_1.5/f_auto/q_auto
```
Makes image 50% wider while maintaining height.

### Using Arithmetic with Variables

Combine variables and arithmetic:
```
$base_200/c_fill,h_$base,w_$base_mul_2/f_auto/q_auto
```
Creates 200x400 rectangle (width = base x 2).

Complex calculations:
```
$margin_iw_mul_0.05,$size_iw_mul_0.25/l_logo/c_scale,w_$size/fl_layer_apply,g_north_east,x_$margin,y_$margin/f_auto/q_auto
```
Logo size is 25% of image width, margin is 5% of image width.

Responsive overlay positioning:
```
$offset_iw_sub_200_div_2/l_badge/fl_layer_apply,g_north,x_$offset/f_auto/q_auto
```
Centers 200px badge horizontally: offset = (width - 200) divided by 2.

## Real-World Advanced Patterns

### Template Transformation with Multiple Variables

```
$w_800,$h_600,$brand_!0066ff!,$opacity_70/c_fill,h_$h,w_$w/bo_5px_solid_rgb:$brand,co_rgb:$brand,l_text:Arial_50_bold:$(brand)/fl_layer_apply,g_south,o_$opacity,y_30/f_auto/q_auto
```
Complete template: dimensions, brand color for border and text, custom opacity.

### Responsive Watermark Sizing

```
$wmsize_iw_mul_0.15/l_watermark/c_scale,fl_relative,w_$wmsize/fl_layer_apply,g_south_east,x_20,y_20/f_auto/q_auto
```
Watermark scales to 15% of image width (responsive to any size).

### Conditional Quality Based on Size

```
if_w_gt_2000_or_h_gt_2000/q_90/if_else/if_w_lt_400_or_h_lt_400/q_70/if_else/q_auto/if_end/if_end/f_auto
```
- Very large images: High quality (90)
- Very small images: Lower quality (70)
- Normal images: Automatic

### Dynamic Cropping Based on Orientation

```
$targetw_800,$targeth_600/if_ar_gt_ar_calc_$targetw_div_$targeth/c_fill,h_$targeth,w_$targetw/if_else/c_fit,h_$targeth,w_$targetw/if_end/f_auto/q_auto
```
Fill if aspect ratio matches target, otherwise fit.

### Smart Thumbnail Generation

```
$size_300/if_fc_gt_0/c_thumb,g_face,h_$size,w_$size/r_max/if_else/c_fill,g_auto,h_$size,w_$size/r_20/if_end/f_auto/q_auto
```
- Face detected: Circular face thumbnail
- No face: Rounded square with smart crop

### Responsive Text Overlay

```
$fontsize_iw_div_10/co_white,l_text:Arial_$(fontsize)_bold:SALE/b_red,fl_layer_apply,g_north/f_auto/q_auto
```
Font size scales to 10% of image width.

Note: Font size must be an integer. Use variables carefully with arithmetic to ensure valid values.

### Conditional Overlay Based on Tags

```
if_!watermark!_nin_tags/if_end/if_!premium!_in_tags/l_premium_badge/fl_layer_apply,g_north_east/if_end/f_auto/q_auto
```
- Skip everything if "watermark" tag present
- Add premium badge if "premium" tag present

### Aspect Ratio Preservation with Max Size

```
$maxdim_1200/if_w_gt_h/c_scale,w_$maxdim/if_else/c_scale,h_$maxdim/if_end/f_auto/q_auto
```
Scales longest dimension to 1200px while preserving aspect ratio.

### E-commerce Product Variations

```
$size_800/if_md:!category!_eq_!apparel!/c_pad,ar_3:4,b_white,h_$size,w_$size_mul_0.75/if_else/c_pad,ar_1:1,b_white,h_$size,w_$size/if_end/f_auto/q_auto
```
- Apparel products: 3:4 ratio (portrait)
- Other products: 1:1 ratio (square)

### Seasonal Overlay Based on Context

```
$season_!ctx:season!/if_ctx:!season!_eq_!winter!/l_snowflake/fl_layer_apply,g_north_west/if_else/if_ctx:!season!_eq_!summer!/l_sun/fl_layer_apply,g_north_west/if_end/if_end/f_auto/q_auto
```
Different seasonal icons based on context.

## Best Practices

### Variable Naming

Good names:
- OK `$width`, `$size`, `$margin`, `$brand`, `$opacity`
- OK Start with letter, descriptive, lowercase

Bad names:
- NO `$my_width` (underscores not allowed)
- NO `$1size` (must start with letter)
- NO `$w` (too cryptic, prefer `$width`)

### When to Use Variables

Use variables when:
- Same value used multiple times (DRY principle)
- Building reusable templates
- Calculating relative values (percentages, ratios)
- Simplifying complex transformation chains

Don't use variables when:
- Value only used once (unnecessary complexity)
- Simple static transformations

### When to Use Conditionals

Use conditionals when:
- Different transformations needed for different asset types
- Responsive behavior based on dimensions
- Tag-based variations (sale items, featured content)
- Metadata-driven transformations (pricing tiers, categories)
- Protecting against edge cases (very small/large images)

Don't use conditionals when:
- Simple static transformation works for all cases
- Can handle variation with single flexible transformation (e.g., `c_fit` vs complex conditional)

### Performance Considerations

Conditionals are evaluated at delivery time:
- No extra cost for conditional logic itself
- Only the executed branch counts toward transformation credits
- Good for reducing unnecessary transformations

Variables add minimal overhead:
- Negligible performance impact
- Improve maintainability of complex URLs
- Consider named transformations for frequently used variable combinations

## Debugging Advanced Features

### Variable Issues

Variable not working:
1. Check variable name has no underscores
2. Verify variable declared before use
3. Check syntax: `$name_value` for declaration, `$name` for reference
4. For strings: Ensure `!` delimiters used

Text interpolation not working:
1. Use `$(varName)` syntax in text overlays, not just `$varName`
2. Ensure URL encoding for rest of text: `Day%20$(date)`

### Conditional Issues

Conditional not applying:
1. Verify condition syntax matches operators exactly
2. Check for missing `if_end`
3. Verify tag/metadata delimiters (`!` for strings)
4. Test condition values (are they actually true?)

Nested conditionals not working:
1. Count `if_` and `if_end` pairs (must match)
2. Check `if_else` placement (between branches, not after `if_end`)
3. Simplify: Test each condition separately first

### Arithmetic Issues

Calculation not working:
1. Check operator spelling: `div` not `divide`
2. Verify asset property names: `iw`, `ih`, `ar` (not `width`, `height`)
3. Check order of operations (left-to-right)
4. Ensure result is valid for parameter (e.g., dimensions must be positive integers)

Division by zero:
```
NO w_10_div_0                    # Invalid
OK w_iw_div_2                    # Safe (iw is always > 0)
```

## Advanced Examples Library

### Responsive Image Grid

```
$cols_3,$gutter_20,$container_1200/c_fill,g_auto,w_$container_sub_$gutter_mul_$cols_add_1_div_$cols/if_ar_gt_1.0/ar_16:9/if_else/ar_1:1/if_end/f_auto/q_auto
```
Calculates grid item width: (container - (gutter x (cols + 1))) divided by cols

### Progressive Enhancement

```
if_w_gt_1920/c_scale,w_1920/q_90/if_else/if_w_gt_1200/c_scale,w_1200/q_85/if_else/c_scale,w_800/q_auto/if_end/if_end/f_auto
```
Tiered quality based on size.

### Smart Product Thumbnails

```
$size_400/if_fc_gt_0/c_crop,g_face,h_$size,w_$size/if_else/if_ar_gt_1.2/c_fill,g_auto,h_$size,w_$size_mul_1.3/if_else/if_ar_lt_0.8/c_fill,g_auto,h_$size_mul_1.3,w_$size/if_else/c_fill,g_auto,h_$size,w_$size/if_end/if_end/if_end/f_auto/q_auto
```
- Face: Face-centered square
- Landscape: Slightly wider
- Portrait: Slightly taller
- Square: Standard square

### Dynamic Watermark Placement

```
$wmw_iw_mul_0.3,$wmh_ih_mul_0.1,$xpos_iw_sub_$wmw_sub_30,$ypos_ih_sub_$wmh_sub_30/l_watermark/c_scale,h_$wmh,w_$wmw/fl_layer_apply,x_$xpos,y_$ypos/f_auto/q_auto
```
Watermark sized to 30% width x 10% height, positioned 30px from bottom-right.

### Conditional Padding Strategy

```
if_ar_gt_1.5/c_pad,ar_16:9,b_auto/if_else/if_ar_lt_0.67/c_pad,ar_9:16,b_auto/if_else/c_fit,w_800/if_end/if_end/f_auto/q_auto
```
- Wide images: Pad to 16:9 with blur
- Tall images: Pad to 9:16 with blur
- Normal: Fit to 800px

## Limitations and Gotchas

### Variable Limitations

1. No recursive references: Can't use a variable in its own definition
   ```
   NO $size_$size_mul_2    # Invalid
   ```

2. No string arithmetic: Can't perform math on string variables
   ```
   NO $text_!Hello!/$newtext_$text_add_!World!    # Invalid
   ```

3. Integer results: Some parameters require integers (font size, dimensions)
   ```
   Warning:  $fontsize_iw_div_7.5    # May produce decimals, font size needs integer
   ```

### Conditional Limitations

1. No else-if: Use nested conditionals instead
   ```
   NO if_A/X/else_if_B/Y/else/Z/if_end    # Not supported
   OK if_A/X/if_else/if_B/Y/if_else/Z/if_end/if_end    # Use nested
   ```

2. Evaluation order: AND has higher precedence than OR
   ```
   if_A_or_B_and_C    # Evaluates as: A OR (B AND C)
   ```

3. Max nesting depth: Keep practical (2-3 levels for readability)

### Arithmetic Limitations

1. Left-to-right only: No operator precedence
   ```
   w_100_add_50_mul_2   # (100 + 50) x 2, not 100 + (50 x 2)
   ```

2. Division truncates: Results are integers
   ```
   w_100_div_3          # Result: 33 (not 33.333...)
   ```

3. No parentheses: Can't group operations
   ```
   NO w_(100_add_50)_mul_2    # Not supported
   OK w_100_add_50_mul_2       # Left-to-right: (100 + 50) x 2
   ```

## When to Use Advanced Features

### Use Variables When:
- Building transformation templates for consistency
- Same value appears multiple times
- Calculating relative dimensions (responsive sizing)
- Simplifying complex overlay positioning

### Use Conditionals When:
- Asset properties vary widely (dimensions, aspect ratios)
- Tag-based variations needed (sales, featured items)
- Metadata-driven transformations (categories, pricing)
- Responsive transformations for different screen sizes
- Protecting against edge cases

### Use Arithmetic When:
- Resizing relative to original dimensions
- Calculating proportional overlays/padding
- Maintaining aspect ratios with constraints
- Creating responsive designs

### Consider Named Transformations Instead When:
- Transformation is static and reused frequently
- No dynamic values needed
- Simpler maintenance than complex variable/conditional chains

For named transformation details, see [named-transformations.md](named-transformations.md)

## Additional Resources

- [Conditional Transformations](https://cloudinary.com/documentation/conditional_transformations.md) - Complete conditional syntax
- [User-Defined Variables and Arithmetic](https://cloudinary.com/documentation/user_defined_variables.md) - Full variable reference
- [Structured Metadata](https://cloudinary.com/documentation/structured_metadata.md) - Using metadata in conditionals
- [Context Variables](https://cloudinary.com/documentation/user_defined_variables.md#context_variables) - Request-time variables
