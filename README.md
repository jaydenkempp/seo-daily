# SEO Daily

A daily technical SEO quiz for the team: 10 questions a day, a weekday SEO news feed, streaks, XP and a shared leaderboard.

- **Play:** https://jaydenkempp.github.io/seo-daily/
- **Progress** saves in each player's browser (like Wordle).
- **Leaderboard** is stored in a Google Sheet via an Apps Script web app (`SHEET_URL` in `index.html`; the script is in `Code.gs`).
- **Reset everyone's progress:** in the Sheet's Apps Script editor, run `resetLeaderboard`.
- **News & news questions** are refreshed on weekday mornings by a scheduled Claude task.
