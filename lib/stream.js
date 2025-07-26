import axios from "axios";
import cheerio from "cheerio";

const referer = "https://allmovieland.ac/";
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36";

// Axios instance with common headers
const axiosInstance = axios.create({
  headers: {
    referer,
    "user-agent": userAgent,
    "accept-language": "en-US,en;q=0.9",
    accept: "text/html,application/xhtml+xml",
  },
  timeout: 10000,
});

/**
 * Retry wrapper
 */
async function tryRequest(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.warn(`Retrying request: ${err.message}`);
      await new Promise((r) => setTimeout(r, 500));
      return tryRequest(fn, retries - 1);
    } else {
      throw err;
    }
  }
}

export default async function getStreamData(fullPath) {
  const [mainId, seasonParam, episodeParam] = fullPath.split("/");
  const playUrl = `https://heily367ltt.com/play/${mainId}`;

  // 1. Fetch player HTML page
  let html;
  try {
    const res = await tryRequest(() => axiosInstance.get(playUrl));
    html = res.data;
  } catch (err) {
    throw new Error(`Failed to fetch player page: ${err.message}`);
  }

  // 2. Extract config using Cheerio (cleaner than regex)
  const $ = cheerio.load(html);
  const scriptContent = $("script")
    .toArray()
    .map((el) => $(el).html())
    .find((s) => s && (s.includes("let pc") || s.includes("HDVBPlayer")));
  const movieMatch = html.match(/let\s+pc\s*=\s*(\{[\s\S]*?\});/);
  const tvMatch = html.match(/new\s+HDVBPlayer\(\s*(\{[\s\S]*?\})\s*\)/);
  const jsonString = movieMatch?.[1] || tvMatch?.[1];
  if (!jsonString) throw new Error("Player config not found");

  const pc = JSON.parse(jsonString);
  const csrfToken = pc.key;
  const fileApi = pc.file.replace(/\\/g, "");
  const isTV = !/^https?:\/\//.test(pc.file);

  const results = [];
  // 3. TV Series Handling
  if (isTV) {
    const seriesUrl = `https://heily367ltt.com${fileApi}`;
    let seriesJson;

    try {
      const res = await tryRequest(() =>
        axios.post(
          seriesUrl,
          {},
          {
            headers: {
              referer,
              "x-csrf-token": csrfToken,
              "content-type": "application/json",
            },
          }
        )
      );
      seriesJson = res.data;
    } catch (err) {
      throw new Error(`Failed to fetch series list: ${err.message}`);
    }

    for (const season of seriesJson || []) {
      if (seasonParam && seasonParam !== season.id?.toString()) continue;

      for (const episode of season.folder || []) {
        if (episodeParam && episodeParam !== episode.episode?.toString())
          continue;

        for (const lang of episode.folder || []) {
          if (!lang?.file) continue;
          const cleanedFile = lang.file.replace(/^~/, "");
          const streamUrl = `https://heily367ltt.com/playlist/${encodeURIComponent(
            cleanedFile
          )}.txt`;

          try {
            const res = await tryRequest(() =>
              axios.post(
                streamUrl,
                {},
                {
                  headers: {
                    referer,
                    "x-csrf-token": csrfToken,
                    "content-type": "application/json",
                  },
                }
              )
            );
            const m3u8Url = res.data;
            if (typeof m3u8Url === "string" && m3u8Url.startsWith("http")) {
              results.push({ server: lang.title || "Unknown", file: m3u8Url });
            }
          } catch (err) {
            console.warn(
              `Error fetching stream for ${lang.title || "Unknown"}: ${
                err.message
              }`
            );
          }
        }

        if (seasonParam && episodeParam) return results;
      }

      if (seasonParam && !episodeParam) return results;
    }

    return results;
  }

  // 4. Movie Handling
  try {
    const res = await tryRequest(() =>
      axios.post(
        fileApi,
        {},
        {
          headers: {
            referer,
            "x-csrf-token": csrfToken,
            "content-type": "application/json",
          },
        }
      )
    );

    const langList = res.data;

    for (const lang of langList) {
      if (!lang?.file) continue;
      const cleanedFile = lang.file.replace(/^~/, "");
      const streamUrl = `https://heily367ltt.com/playlist/${encodeURIComponent(
        cleanedFile
      )}.txt`;

      try {
        const streamRes = await tryRequest(() =>
          axios.post(
            streamUrl,
            {},
            {
              headers: {
                referer,
                "x-csrf-token": csrfToken,
                "content-type": "application/json",
              },
            }
          )
        );
        const m3u8Url = streamRes.data;
        if (typeof m3u8Url === "string" && m3u8Url.startsWith("http")) {
          results.push({ server: lang.title || "Unknown", file: m3u8Url });
        }
      } catch (err) {
        console.warn(
          `Error fetching movie stream for ${lang.title || "Unknown"}: ${
            err.message
          }`
        );
      }
    }

    return results;
  } catch (err) {
    throw new Error(`Failed to fetch movie streams: ${err.message}`);
  }
}
