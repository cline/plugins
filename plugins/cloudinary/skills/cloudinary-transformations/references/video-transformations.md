# Video-Specific Transformations

## Important: Format Parameter for Videos

Critical: When using `f_auto` on video URLs, you must specify `f_auto:video` to ensure a video is returned (not an image thumbnail):

```
f_auto:video                   # Returns video in optimal format (NOT an image)
f_auto                         # May return an image Warning:
```

Always use `f_auto:video` or a specific video format (`f_mp4`, `f_webm`, etc.) when transforming videos.

## Video Codec (`vc_`)

```
vc_auto                        # Automatic codec selection (recommended)
vc_h264:high:4.1               # H.264 with profile and level
vc_h265, vc_vp8, vc_vp9, vc_av1  # Other codecs
vc_none                        # Remove video, keep audio only
```

Key options: h264 profiles (`baseline`, `main`, `high`), levels (`3.0`-`5.2`)

## Trimming Videos (`so_`, `eo_`, `du_`)

```
so_6.5                         # Start at 6.5 seconds
eo_10                          # End at 10 seconds
du_15                          # Duration of 15 seconds
so_10p, eo_90p, du_30p         # Percentage-based (0p-100p)
```

Value formats: Seconds (float) or percentage (`10p`)

## Audio Control (`ac_`)

```
ac_none                        # Remove audio track (for autoplay)
ac_aac, ac_mp3, ac_vorbis, ac_opus  # Audio codecs
```

## Frame Rate (`fps_`)

```
fps_30                         # Set FPS (ensures audio sync)
fps_20-25                      # FPS range
```

## Video Concatenation (`fl_splice`)

Pattern:
1. Declare: `fl_splice,l_video:<public_id>`
2. Transform overlay (optional)
3. Apply: `fl_layer_apply` (with `so_0` to splice at beginning)

```
c_fill,h_300,w_450/du_5/fl_splice,l_video:second_clip/c_fill,h_300,w_450/du_5/fl_layer_apply
```

Important: Both videos should be resized to matching dimensions before splicing

## Common Video Patterns

```
du_5/vc_auto/f_auto:video/q_auto                             # 5-second video preview
ac_none/vc_h264/f_mp4/q_auto                                 # Silent video (autoplay)
c_limit,h_720/vc_auto/f_auto:video/q_auto                    # 720p cap with auto format
```
