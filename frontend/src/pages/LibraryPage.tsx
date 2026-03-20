import { useState, useEffect } from 'react';
import { api } from '../services/api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function LibraryPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadMedia();
  }, [page, filter]);

  const loadMedia = async () => {
    const params: Record<string, string> = {
      page: String(page),
      limit: '20',
      status: 'ready',
    };
    if (search) params.search = search;
    if (filter) params.mediaType = filter;

    try {
      const data = await api.getMedia(params);
      setMedia(data.items || []);
      setTotal(data.total || 0);
    } catch {}
  };

  const handleSearch = () => {
    setPage(1);
    loadMedia();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <h1>Media Library</h1>
        <span className="text-dim">{total} items</span>
      </div>

      <div className="search-bar">
        <input
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto' }}
        >
          <option value="">All Types</option>
          <option value="movie">Movies</option>
          <option value="tv_series">TV Series</option>
        </select>
        <button className="btn-primary" onClick={handleSearch}>Search</button>
      </div>

      {media.length === 0 ? (
        <div className="card empty-state">No media found</div>
      ) : (
        <div className="grid grid-4">
          {media.map((item) => (
            <div key={item.id} className="card media-card" style={{ padding: 12 }}>
              {item.posterUrl ? (
                <img src={item.posterUrl} alt={item.title} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '2/3',
                    background: 'var(--bg-input)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                  }}
                >
                  {item.mediaType === 'movie' ? '\u{1F3AC}' : '\u{1F4FA}'}
                </div>
              )}
              <div className="media-card-info">
                <div className="media-card-title">{item.title}</div>
                <div className="media-card-meta">
                  {item.year && `${item.year} \u00B7 `}
                  {item.mediaType === 'movie' ? 'Movie' : 'TV'} \u00B7{' '}
                  {formatBytes(item.fileSize || 0)}
                </div>
                {item.uploadedBy && (
                  <div className="media-card-meta">
                    by {item.uploadedBy.username}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-center gap-2 mt-4">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-dim">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
