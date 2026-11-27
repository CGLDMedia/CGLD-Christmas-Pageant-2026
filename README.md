# CGLD Christmas Pageant ’26 — Invitation & RSVP site

Static site (HTML/CSS/JS) for GitHub Pages. RSVPs go to a Google Sheet through Google Apps Script.

```
christmas-pageant/
├── index.html · style.css · script.js
├── christmas-poster.jpg      ← replace this file to change the poster
└── apps-script/Code.gs
```

## 1. Google Sheet + backend
1. Create a Google Sheet (name it e.g. "CGLD RSVPs"). Keep it private; share only with organisers.
2. **Extensions → Apps Script**. Delete the sample code and paste all of `apps-script/Code.gs`. Save.
3. Run `doGet` once from the toolbar and approve the permission prompt (it creates the `RSVPs` tab with the seven columns).
4. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the URL ending in `/exec`.
5. Open the `/exec` URL in a browser. You should see `{"ok":true,"registrations":0,"confirmedGuests":0}`.
6. Whenever you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**, or the old code keeps running.

## 2. GitHub Pages
1. Create a public GitHub repository, e.g. `christmas-pageant`.
2. Upload the contents of this folder (`index.html`, `style.css`, `script.js`, `christmas-poster.jpg`, `README.md`, `apps-script/`).
3. **Settings → Pages → Deploy from a branch → `main` / root → Save.** After a minute the URL appears: `https://<username>.github.io/christmas-pageant/`.
4. In `script.js`, set `CONFIG.APPS_SCRIPT_URL` (step 1.4). Commit.
5. The countdown targets 6PM on 11 December 2026 (from the poster), in each visitor's local time. Change `CONFIG.EVENT_DATE` if the time changes.

The Apps Script URL is public by design. It holds no password, and the Sheet itself stays private.

## 3. Replace the poster
Save the new image as `christmas-poster.jpg` in the same folder (the current one is 1080×1350, a 4:5 portrait) and commit. Other ratios still display uncropped. The blurred hero background uses the same file.

## 4. Corrections and duplicates
- Each submission carries a one-time ID, and the Registration ID is derived from it. A double-click, a refresh or a retry never adds a second row.
- Family members sharing a phone number are accepted. The limit is 5 submissions per number per 10 minutes.
- Every RSVP counts as attending (the form no longer asks). If someone later can't come, change the last column of their row to `Unable to attend`: they stay in Registrations but drop out of Confirmed Guests.
- To correct an RSVP, edit the row in the Sheet (headcount, food or attendance). To remove one, delete the row. Counters update within about 30 seconds.
- Keep the attendance values exactly `Attending` or `Unable to attend`, or the guest total will skip the row.

## 5. Limits you should know
A public Apps Script endpoint can't fully stop spam. This one uses server-side validation, a honeypot field, per-phone throttling and idempotency, which reduce abuse but don't eliminate it. Check the Sheet before the event and delete junk rows. Apps Script also has daily quotas, which are plenty for a single event.

## 6. Test checklist
Mark each item only after you have actually done it.
- [ ] `/exec` URL shows the JSON counts.
- [ ] Submit an RSVP with headcount 3: one new row, timestamp and `CGLD-…` ID present, counters show +1 registration and +3 guests.
- [ ] In the Sheet, set a row to `Unable to attend`: after ~30 s confirmed guests drop by its headcount, registrations stay.
- [ ] Double-click Send, or refresh right after sending: still one row.
- [ ] Empty form, bad phone (`12345`) and headcount 0 show errors.
- [ ] Two phones submitting at once both appear.
- [ ] Counter shows a friendly note if `APPS_SCRIPT_URL` is wrong.
- [ ] The gift shakes, bursts into confetti and shows a message; tapping again shows a different one.
- [ ] Countdown matches the event date. No horizontal scroll at 360, 768 and 1280 px. No console errors.
