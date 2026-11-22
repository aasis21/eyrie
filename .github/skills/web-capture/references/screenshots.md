# Screenshots

## Single shots

With the sanitizer installed and the page settled:

```js
async (page) => {
  const f = page.frames().find(x => /app\.example\.com/.test(x.url())) || page.mainFrame();
  await page.waitForTimeout(1500);                       // let streamed text settle
  await f.locator('[role=dialog]').last().screenshot({   // an element, or page.screenshot for the viewport
    path: '<out>/shots/step-1.png' });                   // absolute path to the task's output folder
  return 'ok';
}
```

- Element screenshots crop cleanly to a dialog, card or table; viewport shots
  show context. Pick one per docs page and keep it consistent.
- PNG for docs (crisp text). JPEG only for video frames.
- Move the cursor off the subject (`page.mouse.move(5, 5)`) unless it points
  at something.

## A screenshot set for a docs page

1. Explore the flow once and list the states to show (empty list, form
   filled, result, list after).
2. Script the set as one run that captures each state in order, stopping
   **before** any Save that would change a live system, unless the user
   approved it on test resources.
3. Name files after the target docs' convention (for example
   `static/img/screenshots/<feature>-<state>.png`).
4. Audit every image ([capture-audit](capture-audit.md)), then hand the set to
   the caller.

## Notes

- Dark and light themes differ; match the docs you are writing for.
- Wait for skeleton loaders and toasts to clear before shooting a list.
