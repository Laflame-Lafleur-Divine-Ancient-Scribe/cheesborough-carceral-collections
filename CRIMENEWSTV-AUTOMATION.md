# CrimeNewsTV daily editions

The `Update CrimeNewsTV twice daily` GitHub Actions workflow runs at **9:00 a.m. and 4:00 p.m. America/New_York**, including weekends. The timezone follows daylight saving time. GitHub may queue scheduled jobs; the public page updates after collection and Pages deployment finish.

Each run selects up to nine previously unused videos, with a maximum of 18 total videos per Eastern calendar day, including manually curated entries. Successful morning and afternoon runs are recorded separately; rerunning a completed slot does not add duplicates. If fewer than nine eligible videos exist, only eligible selections are published.

The collector reads the official YouTube feeds listed in `data/crimenewstv-sources.json`, prioritizes uploads from the past seven days, filters general-news channels for criminal justice topics, and limits repeated publishers and prominent cases. It preserves original titles and upload dates. It checks public visibility, nonzero duration, and embedding permission through the existing Railway YouTube metadata service before publishing. It does not generate case allegations or download video files. Videos open in the site's embedded YouTube player.

`data/crimenewstv-automation.json` stores additions and completed slots; `video-desk-auto.js` merges them with the existing catalog in both browse and watch pages. The bot commits those two files and explicitly calls the Pages deployment workflow, since commits made using GitHub's workflow token do not trigger another push workflow. All API credentials remain on Railway.

## Operation

- Review runs and errors under GitHub Actions → **Update CrimeNewsTV twice daily**.
- Use **Run workflow**, keeping **Preview selections without publishing** checked, to run a live preview. Uncheck it to publish the current morning/afternoon slot manually.
- Code changes run a preview automatically. They do not insert an extra edition.
- Disable this workflow in GitHub Actions to pause collection.
- Update the source list to change the news channels being monitored.
- If metadata verification is unavailable, the job fails and preserves the published catalog. No unverified videos are added. Review failed runs in GitHub Actions; subscriber notification preferences control GitHub failure emails.
- Publishers can change playback permission or availability after collection. The on-site player includes a reload control and the original source link.

Local checks: `python scripts/test-crimenewstv.py`, then `python scripts/collect-crimenewstv.py --dry-run`. Python needs IANA timezone data (preinstalled on the workflow's Ubuntu runner; install `tzdata` if a local Windows Python lacks it).
