# Named Transformations

Named transformations allow you to save transformation chains with a name (e.g., `t_thumbnail`) and reuse them across your application.

## When to Suggest Named Transformations

- Transformations used across multiple assets - Consistency and easy updates
- Complex transformation chains - Easier to maintain and read
- Saving money on expensive transformations - Named transformations are required for baseline transformations, which save processing time and cost by avoiding regeneration of shared transformation steps.

## Example

```
# Instead of repeating the same transformation:
NO c_thumb,g_face,h_200,w_200/r_max/e_sharpen/f_auto/q_auto

# Create named transformation "avatar":
OK t_avatar/f_auto/q_auto
```

## How to Reference Named Transformations

```
t_<name>                           # Use named transformation
t_<name>/c_scale,w_500            # Named transformation + additional changes
c_fill,w_300/t_<name>             # Transform first, then apply named transformation
```

## Limitations of Named Transformations

Automatic parameters don't work inside named transformations:
- NO `f_auto` - Automatic format selection
- NO `dpr_auto` - Automatic DPR matching
- NO `w_auto` - Automatic width matching (with Client Hints)

These parameters rely on runtime information from the client or CDN that isn't available when the named transformation is processed. Use them directly in the URL instead:

```
# NO Don't do this:
t_product_thumb   # where product_thumb includes f_auto

# OK Do this instead:
t_product_thumb/f_auto/q_auto
```

See [Limitations of named transformations](https://cloudinary.com/documentation/image_transformations#limitations_of_named_transformations.md) for complete details.

## Baseline Transformations

Baseline transformations (`bl_<named transformation>`) cache the result of a named transformation so it doesn't have to be regenerated when combined with other transformations. This saves processing time and cost.

### When to Use Baseline Transformations

Especially useful for:
- Expensive AI transformations (background removal, generative AI, upscaling) - Avoid re-processing
- Time-consuming operations that you'll apply variations to
- Transformations with special transformation counts (75-230 tx) that you need to reuse

Consider eagerly generating baselines:
- On upload using the [upload method](https://cloudinary.com/documentation/image_upload_api_reference#upload_method) or [upload preset](https://cloudinary.com/documentation/upload_presets)
- For existing assets using the [explicit method](https://cloudinary.com/documentation/image_upload_api_reference#explicit_method)

### Syntax

```
bl_<named transformation>/<additional transformations>
```

### Examples

Example 1: Background removal + grayscale baseline, then add effects
```
# Named transformation "bg_rem_gray_jxl" contains:
e_background_removal/f_jxl/q_100/e_grayscale

# Use as baseline:
bl_bg_rem_gray_jxl/e_cartoonify/f_auto/q_auto
```
Result: Background removed, grayscale applied once (cached), then cartoonify effect added.

Example 2: Same baseline, resize and add underlay
```
bl_bg_rem_gray_jxl/c_fill,h_150/u_docs:sky/c_fill,h_150/fl_layer_apply
```

Example 3: Video baseline with trimming
```
# Named transformation "first5_rotate" contains:
du_5/f_mp4/a_15

# Use as baseline:
bl_first5_rotate/e_loop:2/f_auto/q_auto
```
Result: Video trimmed to 5 seconds and rotated once (cached), then looped twice.

### Critical Rules

1. Baseline must be the first component in the transformation chain
2. Baseline must be the only transformation parameter in that component
   - OK `bl_bg_removed/c_scale,w_500`
   - NO `bl_bg_removed,c_scale,w_500`

3. Named transformation must include a format (`f_`)
   - Use a supported format transformation (e.g., `f_jxl`, `f_png`, `f_jpg`)
   - Cannot use `f_auto` in the named transformation (but you can use `f_auto` in subsequent components)

4. Prevent double lossy encoding
   - Consider using `f_jxl/q_100` in the baseline transformation to avoid quality loss
   - JXL is lossless at q_100, preventing degradation from double encoding

5. Variables must be defined in the named transformation if used in the baseline

6. Not supported for:
   - Fetched media (`/fetch/`)
   - Incoming transformations

### Cost Savings Example

Without baseline:
```
# Every URL regenerates the background removal (75 tx each time)
e_background_removal/c_scale,w_500/f_auto/q_auto     # 75 tx
e_background_removal/c_fill,h_300,w_400/f_auto/q_auto  # 75 tx
e_background_removal/e_grayscale/f_auto/q_auto       # 75 tx
```

With baseline:
```
# Named transformation "bg_removed" contains: e_background_removal/f_jxl/q_100
# Baseline is generated once, then reused (75 tx only once)
bl_bg_removed/c_scale,w_500/f_auto/q_auto           # 1 tx
bl_bg_removed/c_fill,h_300,w_400/f_auto/q_auto     # 1 tx
bl_bg_removed/e_grayscale/f_auto/q_auto            # 1 tx
```

Total savings: 225 tx -> 78 tx (75 tx for initial baseline + 3 tx for variations)

For more cost optimization strategies, see [transformation-costs.md](transformation-costs.md)

## Implementation Note

Named transformations are created in the Cloudinary Console or via API. When suggesting them to users, explain:
1. The transformation would be saved in their Cloudinary account with a name
2. They can then reference it using `t_<name>` in URLs
3. For expensive operations, they can generate a baseline transformation eagerly or use `bl_<name>` to cache results
