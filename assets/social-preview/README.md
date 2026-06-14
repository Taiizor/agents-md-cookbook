# Social preview

The repository's social media preview card (the image shown when the repo is
shared on GitHub, X, Slack, etc.).

- `social-card.html` — the source. Self-contained (inline CSS, no external
  fonts or assets). Edit this to change the card.
- `social-card.png` — the rendered card, exactly **1280×640** (GitHub's
  recommended size).

## Set it on GitHub

**Settings → General → Social preview → Edit → Upload an image…** and pick
`social-card.png` (or drag-and-drop it onto the box).

## Regenerate the PNG after editing the HTML

Render the HTML to an exact 1280×640 PNG with headless Chrome:

```bash
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1280,640 \
  --screenshot=assets/social-preview/social-card.png \
  "file://$PWD/assets/social-preview/social-card.html"
```

On Windows, point at the Chrome executable directly, e.g.
`"/c/Program Files/Google/Chrome/Application/chrome.exe"`. Any Chromium-based
browser (Edge, Brave) works with the same flags.
