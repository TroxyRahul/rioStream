// lib/streamService.js

async function safeFetch(url, options = {}, retries = 2, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (retries > 0) {
      console.warn(`Retrying fetch for ${url} (${retries} left):`, err.message);
      await new Promise(res => setTimeout(res, 500)); // slight delay
      return safeFetch(url, options, retries - 1, timeoutMs);
    } else {
      throw err;
    }
  }
}

export default async function getStreamData(fullPath) {
  const [mainId, seasonParam, episodeParam] = fullPath.split('/');
  const referer = 'https://allmovieland.ac/';
  const playUrl = `https://heily367ltt.com/play/${mainId}`;

  let html;
  try {
    const htmlRes = await safeFetch(playUrl, {
      headers: {
        referer,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    html = await htmlRes.text();
  } catch (err) {
    throw new Error(`Failed to fetch player page: ${err.message}`);
  }

  const movieMatch = html.match(/let\s+pc\s*=\s*(\{[\s\S]*?\});/);
  const tvMatch = html.match(/new\s+HDVBPlayer\(\s*(\{[\s\S]*?\})\s*\)/);
  const jsonString = movieMatch?.[1] || tvMatch?.[1];
  if (!jsonString) throw new Error('Player config not found');

  const pc = JSON.parse(jsonString);
  const csrfToken = pc.key;
  const fileApi = pc.file.replace(/\\/g, '');
  const isTV = !/^https?:\/\//.test(pc.file);

  const results = [];

  if (isTV) {
    const seriesUrl = `https://heily367ltt.com${fileApi}`;

    let seriesJson;
    try {
      const seriesRes = await safeFetch(seriesUrl, {
        method: 'POST',
        headers: {
          referer,
          'x-csrf-token': csrfToken,
          'content-type': 'application/json',
        },
        body: '{}',
      });
      seriesJson = await seriesRes.json();
    } catch (err) {
      throw new Error(`Failed to fetch series list: ${err.message}`);
    }

    for (const season of seriesJson || []) {
      const seasonId = season.id?.toString();
      if (seasonParam && seasonParam !== seasonId) continue;

      for (const episode of season.folder || []) {
        const epNum = episode.episode?.toString();
        if (episodeParam && episodeParam !== epNum) continue;

        for (const lang of episode.folder || []) {
          if (!lang?.file) continue;
          const cleanedFile = lang.file.replace(/^~/, '');
          const streamUrl = `https://heily367ltt.com/playlist/${encodeURIComponent(cleanedFile)}.txt`;

          try {
            const streamRes = await safeFetch(streamUrl, {
              method: 'POST',
              headers: {
                referer,
                'x-csrf-token': csrfToken,
                'content-type': 'application/json',
              },
              body: '{}',
            });

            const m3u8Url = await streamRes.text();
            if (m3u8Url.startsWith('http')) {
              results.push({ server: lang.title || 'Unknown', file: m3u8Url });
            }
          } catch (err) {
            console.warn(`Error fetching stream for ${lang.title || 'Unknown'}: ${err.message}`);
          }
        }

        if (seasonParam && episodeParam) return results;
      }

      if (seasonParam && !episodeParam) return results;
    }

    return results;
  } else {
    let langList;
    try {
      const langRes = await safeFetch(fileApi, {
        method: 'POST',
        headers: {
          referer,
          'x-csrf-token': csrfToken,
          'content-type': 'application/json',
        },
        body: '{}',
      });

      langList = await langRes.json();
    } catch (err) {
      throw new Error(`Failed to fetch movie streams: ${err.message}`);
    }

    for (const lang of langList) {
      if (!lang?.file) continue;
      const cleanedFile = lang.file.replace(/^~/, '');
      const streamUrl = `https://heily367ltt.com/playlist/${encodeURIComponent(cleanedFile)}.txt`;

      try {
        const streamRes = await safeFetch(streamUrl, {
          method: 'POST',
          headers: {
            referer,
            'x-csrf-token': csrfToken,
            'content-type': 'application/json',
          },
          body: '{}',
        });

        const m3u8Url = await streamRes.text();
        if (m3u8Url.startsWith('http')) {
          results.push({ server: lang.title, file: m3u8Url });
        }
      } catch (err) {
        console.warn(`Error fetching movie stream for ${lang.title || 'Unknown'}: ${err.message}`);
      }
    }

    return results;
  }
}
