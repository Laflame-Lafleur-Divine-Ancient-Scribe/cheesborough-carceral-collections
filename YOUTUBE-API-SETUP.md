# YouTube Data API Setup

CrimeNewsTV requests public video metadata through the Railway service. The API key stays on Railway and is never sent to a visitor's browser.

1. In Google Cloud Console, create or select the project that will own this integration.
2. Enable **YouTube Data API v3** for that project.
3. Create an API key and restrict it to the YouTube Data API v3. Keep the key server-side; do not add it to an HTML or JavaScript file.
4. In Railway, open the service that deploys `server.js` and add the variable `YOUTUBE_API_KEY` with that key's value.
5. Redeploy the service, then open `/api/youtube/videos?ids=Gl4sV4aXgKQ` on the Railway domain. A configured response includes video metadata and an `embeddable` flag.

The site keeps its curated video names and descriptions. The API refreshes thumbnails, channel names, publication metadata, duration, and embedding availability. If a publisher does not allow embeds, the watch page gives the reader a direct **Watch on YouTube** option.

Public `videos.list` requests use an API key. OAuth is not needed unless the service later needs to access or modify a private YouTube account.
