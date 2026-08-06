---
name: rw-integrate-uploads
description: "Help users upload local files to Runway for use as inputs to generation models"
user-invocable: false
---

# Integrate Uploads

> PREREQUISITE: Run `rw-check-compatibility` first. Run `rw-fetch-api-reference` to load the latest API reference before integrating. Requires `rw-setup-api-key` for API credentials.

Help users upload local files (images, videos, audio) to Runway's ephemeral storage for use as inputs to generation models.

## When to Use Uploads

Use the Uploads API when:
- The user has a local file (not a public URL) they want to use as input
- The file exceeds data URI size limits (5 MB for images, 16 MB for video/audio)
- The file's URL doesn't meet Runway's URL requirements (HTTPS, proper headers, no redirects)

You do NOT need uploads when:
- The asset is already at a public HTTPS URL with proper headers
- The asset is small enough for a data URI (< 5 MB image, < 16 MB video)

## How It Works

1. Request an ephemeral upload slot -> get a presigned upload URL and form fields
2. Upload the file to the presigned URL
3. Use the returned `runway://` URI as input to any generation endpoint

`runway://` URIs are valid for 24 hours.

## SDK Upload (Recommended)

### Node.js

```javascript
import RunwayML from '@runwayml/sdk';
import fs from 'fs';

const client = new RunwayML();

// Upload from a file stream
const upload = await client.uploads.createEphemeral(
  fs.createReadStream('/path/to/image.jpg')
);

// Use the runway:// URI in any generation call
const task = await client.imageToVideo.create({
  model: 'gen4.5',
  promptImage: upload.runwayUri,
  promptText: 'The scene comes to life',
  ratio: '1280:720',
  duration: 5
}).waitForTaskOutput();
```

The Node.js SDK accepts:
- `fs.ReadStream` - file streams
- `File` objects - from web APIs
- `Blob` objects
- `Buffer` / `ArrayBuffer` / typed arrays
- `Response` objects - from `fetch()`
- Async iterables

### Python

```python
from runwayml import RunwayML
from pathlib import Path

client = RunwayML()

# Upload from a file path
upload = client.uploads.create_ephemeral(
    Path('/path/to/image.jpg')
)

# Use the runway:// URI
task = client.image_to_video.create(
    model='gen4.5',
    prompt_image=upload.runway_uri,
    prompt_text='The scene comes to life',
    ratio='1280:720',
    duration=5
).wait_for_task_output()
```

The Python SDK accepts:
- `pathlib.Path` objects
- `IOBase` objects (file-like objects)
- Two-tuples of `(filename, content)`

## REST API Upload (Manual)

If not using the SDK, the upload flow has three steps:

### Step 1: Create an upload slot

```javascript
const response = await fetch('https://api.dev.runwayml.com/v1/uploads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RUNWAYML_API_SECRET}`,
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: 'image.jpg',
    type: 'ephemeral'
  })
});

const { uploadUrl, fields, runwayUri } = await response.json();
```

### Step 2: Upload the file using the presigned URL

```javascript
const formData = new FormData();

// Add all presigned form fields first
for (const [key, value] of Object.entries(fields)) {
  formData.append(key, value);
}

// Add the file last
formData.append('file', fileBuffer, 'image.jpg');

await fetch(uploadUrl, {
  method: 'POST',
  body: formData
});
```

### Step 3: Use the `runway://` URI

```javascript
const task = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.RUNWAYML_API_SECRET}`,
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gen4.5',
    promptImage: runwayUri,
    promptText: 'Animate this scene',
    ratio: '1280:720',
    duration: 5
  })
});
```

## Upload Constraints

| Constraint | Value |
|-----------|-------|
| Minimum file size | 512 bytes |
| Maximum file size | 200 MB |
| URI validity | 24 hours |
| Requires credits | Yes (must have purchased credits) |

## Integration Pattern

### Express.js - Upload Endpoint with File Generation

```javascript
import RunwayML from '@runwayml/sdk';
import express from 'express';
import multer from 'multer';

const client = new RunwayML();
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/');
    cb(ok ? null : new Error('unsupported media type'), ok);
  }
});

app.post('/api/image-to-video', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file is required' });

    // Upload the user's file to Runway
    const runwayUpload = await client.uploads.createEphemeral(req.file.buffer);

    // Use the uploaded file for video generation
    const task = await client.imageToVideo.create({
      model: 'gen4.5',
      promptImage: runwayUpload.runwayUri,
      promptText: req.body.prompt || 'Animate this image',
      ratio: '1280:720',
      duration: 5
    }).waitForTaskOutput();

    res.json({ videoUrl: task.output[0] });
  } catch (error) {
    console.error('Generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js - Upload + Generate

```typescript
// app/api/image-to-video/route.ts
import RunwayML from '@runwayml/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new RunwayML();
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const imageFile = formData.get('image') as File;
  const prompt = formData.get('prompt') as string;

  try {
    if (!imageFile) throw new Error('image file is required');
    if (imageFile.size > MAX_UPLOAD_BYTES) throw new Error('file is too large');
    if (!ALLOWED_MIME_PREFIXES.some((prefix) => imageFile.type.startsWith(prefix))) {
      throw new Error('unsupported media type');
    }

    // Upload file to Runway
    const upload = await client.uploads.createEphemeral(imageFile);

    // Generate video from the uploaded image
    const task = await client.imageToVideo.create({
      model: 'gen4.5',
      promptImage: upload.runwayUri,
      promptText: prompt || 'Animate this image',
      ratio: '1280:720',
      duration: 5
    }).waitForTaskOutput();

    return NextResponse.json({ videoUrl: task.output[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
```

### FastAPI - Upload + Generate

```python
from fastapi import FastAPI, UploadFile, Form, HTTPException
from runwayml import RunwayML

app = FastAPI()
client = RunwayML()
MAX_UPLOAD_BYTES = 200 * 1024 * 1024
ALLOWED_MIME_PREFIXES = ("image/", "video/", "audio/")

@app.post("/api/image-to-video")
async def image_to_video(image: UploadFile, prompt: str = Form("Animate this image")):
    try:
        if not image.content_type or not image.content_type.startswith(ALLOWED_MIME_PREFIXES):
            raise HTTPException(status_code=400, detail="unsupported media type")

        # Upload to Runway
        content = await image.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="file is too large")

        upload = client.uploads.create_ephemeral((image.filename, content))

        # Generate video
        task = client.image_to_video.create(
            model="gen4.5",
            prompt_image=upload.runway_uri,
            prompt_text=prompt,
            ratio="1280:720",
            duration=5
        ).wait_for_task_output()

        return {"video_url": task.output[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Tips

- Always upload local files before passing them to generation endpoints. Don't try to pass local file paths - they won't work.
- `runway://` URIs expire after 24 hours. If you need to re-use an asset, upload it again.
- The SDK handles the presigned URL flow automatically - prefer the SDK over manual REST calls.
- For models requiring image/video input (image-to-video, video-to-video, character performance), upload the asset first, then pass the `runway://` URI.
- Maximum 200 MB per file via uploads - larger than URL (16 MB) or data URI (5 MB) limits.
