// api/youtube-search.js
// Vercel Functions - YouTube Data API v3 プロキシ

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const {
    q,
    publishedAfter,
    maxResults = '20',
    pageToken,
  } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q,
      maxResults,
      order: 'relevance',
      regionCode: 'JP',
      relevanceLanguage: 'ja',
      key: apiKey,
    });

    if (publishedAfter) params.append('publishedAfter', publishedAfter);
    if (pageToken) params.append('pageToken', pageToken);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error('YouTube API error:', errData);
      return res.status(response.status).json({ error: 'YouTube API error', detail: errData });
    }

    const data = await response.json();

    const items = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      description: item.snippet.description,
    }));

    return res.status(200).json({
      items,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0,
    });
  } catch (err) {
    console.error('youtube-search handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
