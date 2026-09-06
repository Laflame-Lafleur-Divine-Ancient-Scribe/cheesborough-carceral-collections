# CrimeNewsTV daily editions

The `Update CrimeNewsTV twice daily` GitHub Actions workflow runs at **9:00 a.m. and 4:00 p.m. America/New_York**, including weekends. The timezone follows daylight saving time. GitHub may queue scheduled jobs; the public page updates after collection and Pages deployment finish.

Each run selects up to nine previously unused videos, with a maximum of 18 total videos per Eastern calendar day, including manually curated entries. Successful morning and afternoon runs are recorded separately; rerunning a completed slot does not add duplicates. If fewer than nine eligible videos exist, only eligible selections are published.

The collector reads the official YouTube feeds listed in `data/crimenewstv-sources.json` and searches YouTube for trending crime stories and court trials. `data/crimenewstv-trending.json` holds discovery queries and priority topics, currently including Nolan Wells. Search results must come from configured publishers; commentary remains attributed to its original publisher. Priority-topic matches rank first, then trending-search discoveries, then other relevant recent uploads. "Trending" is a CrimeNewsTV editorial category, not a claim that YouTube assigned a global trending rank. Already-used videos are excluded even for priority topics; absent a new eligible update, other coverage fills the available slots.

Selections must have uploads from the past seven days. General-news channels are filtered for criminal justice topics, with limits on repeated publishers and prominent cases. The collector preserves original titles and upload dates and checks public visibility, nonzero duration, and embedding permission through the existing Railway YouTube metadata service before publishing. It does not generate case allegations or download video files. Videos open in the site's embedded YouTube player.

`data/crimenewstv-automation.json` stores additions and completed slots; `video-desk-auto.js` merges them with the existing catalog in both browse and watch pages. The bot commits those two files and explicitly calls the Pages deployment workflow, since commits made using GitHub's workflow token do not trigger another push workflow. All API credentials remain on Railway.

## Operation

- Review runs and errors under GitHub Actions → **Update CrimeNewsTV twice daily**.
- Use **Run workflow**, keeping **Preview selections without publishing** checked, to preview the next nine eligible selections even if today's quota is full. Uncheck it to publish the current morning/afternoon slot manually; real publishing always enforces slot and daily limits.
- Code changes run a preview automatically. They do not insert an extra edition.
- Disable this workflow in GitHub Actions to pause collection.
- Update the source list to change the news channels being monitored.
- If metadata verification is unavailable, the job fails and preserves the published catalog. No unverified videos are added. Review failed runs in GitHub Actions; subscriber notification preferences control GitHub failure emails.
- Publishers can change playback permission or availability after collection. The on-site player includes a reload control and the original source link.

Local checks: `python scripts/test-crimenewstv.py`, then `python scripts/collect-crimenewstv.py --dry-run`. Python needs IANA timezone data (preinstalled on the workflow's Ubuntu runner; install `tzdata` if a local Windows Python lacks it).
