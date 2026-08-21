# Self-hosted SearXNG

This project can use a local SearXNG instance for online search results without a commercial API key.

## Requirements

- Docker Desktop with Docker Compose enabled
- Node.js 18 or newer

## Start SearXNG

From the project directory:

```powershell
docker compose up -d
```

SearXNG will be available at `http://localhost:8888`.

## Start the website

In a second terminal:

```powershell
npm start
```

Open `http://localhost:8080/SEARCH.html?q=divorce`.

Local archive results appear first. SearXNG results appear below them, with direct links to the original pages. The site requests up to 30 SearXNG pages and displays at most 300 deduplicated results.

## Stop SearXNG

```powershell
docker compose down
```

When SearXNG is stopped, the search page keeps its direct Google, DuckDuckGo, CourtListener, GovInfo, Google Scholar, Justia, and official-government-PDF fallback links.
