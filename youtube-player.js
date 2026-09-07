/* Shared CrimeNewsTV player: observe playback failures, not just iframe loads. */
(() => {
  let apiRequest;
  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiRequest) return apiRequest;
    apiRequest = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const previous = window.onYouTubeIframeAPIReady;
      const timer = setTimeout(() => { script.remove(); reject(new Error('Player connection timed out')); }, 15000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        resolve(window.YT);
        if (typeof previous === 'function') previous();
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Player connection unavailable')); };
      document.head.append(script);
    }).catch((error) => { apiRequest = null; throw error; });
    return apiRequest;
  }

  window.CCCYouTubePlayer = {
    mount(container, film) {
      let player, timer, generation = 0;
      const watchURL = `https://www.youtube.com/watch?v=${encodeURIComponent(film.embed)}`;
      const clearPlayer = () => {
        clearTimeout(timer);
        if (player) { player.destroy(); player = null; }
      };
      const showFallback = (message) => {
        generation++;
        clearPlayer();
        const panel = document.createElement('div');
        panel.className = 'player-recovery';
        panel.setAttribute('role', 'status');
        const heading = document.createElement('strong');
        heading.textContent = 'Watch this video on YouTube';
        const detail = document.createElement('p');
        detail.textContent = message;
        const watch = document.createElement('a');
        watch.className = 'action-btn';
        watch.textContent = 'Watch on YouTube ↗';
        watch.href = watchURL;
        watch.target = '_blank';
        watch.rel = 'noopener';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'action-btn secondary';
        retry.textContent = 'Try player again';
        retry.addEventListener('click', start);
        panel.append(heading, detail, watch, retry);
        container.replaceChildren(panel);
      };
      async function start() {
        const attempt = ++generation;
        clearPlayer();
        if (film.embeddable === false) {
          showFallback('The publisher does not allow this video to play on other websites.');
          return;
        }
        const loading = document.createElement('div');
        loading.className = 'player-recovery';
        loading.textContent = 'Connecting to YouTube…';
        loading.setAttribute('role', 'status');
        container.replaceChildren(loading);
        try {
          const YT = await loadAPI();
          if (attempt !== generation || !container.isConnected) return;
          // Set the referrer policy before navigation; origin alone is not a Referer header.
          const frame = document.createElement('iframe');
          frame.className = 'youtube-player-mount';
          frame.title = `${film.title} - embedded video`;
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          frame.allowFullscreen = true;
          const params = new URLSearchParams({ enablejsapi: '1', origin: location.origin, rel: '0', playsinline: '1' });
          frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.embed)}?${params}`;
          container.replaceChildren(frame);
          timer = setTimeout(() => {
            if (attempt === generation) showFallback('The player could not connect. Open the original video on YouTube, or try again.');
          }, 20000);
          player = new YT.Player(frame, {
            events: {
              onReady: () => { if (attempt === generation) clearTimeout(timer); },
              onError: (event) => {
                if (attempt !== generation) return;
                const code = Number(event.data);
                const message = [101, 150].includes(code)
                  ? 'The publisher does not allow this video to play on other websites.'
                  : code === 100
                    ? 'This video is unavailable here. Check the original video for its current availability.'
                    : code === 153
                      ? 'This browser could not identify the embedded player to YouTube. Open the video directly to continue watching.'
                      : 'YouTube could not play this video here. Open the original video, or try the player again.';
                showFallback(message);
              }
            }
          });
        } catch {
          if (attempt === generation) showFallback('The player could not connect. Open the original video on YouTube, or try again.');
        }
      }
      start();
      return { reload: start, destroy() { generation++; clearPlayer(); } };
    }
  };
})();
