import { Injectable } from '@nestjs/common';

export interface TmdbResult {
  id: number;
  title: string;
  year: number;
  overview: string;
  posterPath: string | null;
  mediaType: 'movie' | 'tv';
}

@Injectable()
export class TmdbService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  async search(query: string): Promise<TmdbResult[]> {
    if (!this.apiKey) return [];

    try {
      const res = await fetch(
        `${this.baseUrl}/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&page=1`,
      );
      const data = await res.json();

      return (data.results || [])
        .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 10)
        .map((r: any) => ({
          id: r.id,
          title: r.title || r.name,
          year: new Date(r.release_date || r.first_air_date || '').getFullYear() || null,
          overview: r.overview,
          posterPath: r.poster_path
            ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
            : null,
          mediaType: r.media_type,
        }));
    } catch (err) {
      console.error('TMDB search error:', err);
      return [];
    }
  }

  async getDetails(
    tmdbId: number,
    type: 'movie' | 'tv',
  ): Promise<TmdbResult | null> {
    if (!this.apiKey) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/${type}/${tmdbId}?api_key=${this.apiKey}`,
      );
      const r = await res.json();

      return {
        id: r.id,
        title: r.title || r.name,
        year:
          new Date(r.release_date || r.first_air_date || '').getFullYear() ||
          0,
        overview: r.overview,
        posterPath: r.poster_path
          ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
          : null,
        mediaType: type,
      };
    } catch {
      return null;
    }
  }

  parseFilename(filename: string): {
    title: string;
    year?: number;
    season?: number;
    episode?: number;
  } {
    const cleaned = filename
      .replace(/\.[^.]+$/, '')
      .replace(/[._]/g, ' ')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    // Try TV pattern: S01E02
    const tvMatch = cleaned.match(/(.+?)\s*[Ss](\d{1,2})\s*[Ee](\d{1,3})/);
    if (tvMatch) {
      return {
        title: tvMatch[1].trim(),
        season: parseInt(tvMatch[2]),
        episode: parseInt(tvMatch[3]),
      };
    }

    // Try year pattern
    const yearMatch = cleaned.match(/(.+?)\s*(\d{4})/);
    if (yearMatch && parseInt(yearMatch[2]) > 1900 && parseInt(yearMatch[2]) < 2100) {
      return {
        title: yearMatch[1].trim(),
        year: parseInt(yearMatch[2]),
      };
    }

    return { title: cleaned };
  }
}
