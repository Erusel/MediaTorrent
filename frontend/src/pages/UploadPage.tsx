import { useState, useRef, DragEvent } from 'react';
import { api } from '../services/api';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const [tab, setTab] = useState<'file' | 'torrent'>('file');
  const [magnetLink, setMagnetLink] = useState('');
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState('movie');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [selectedTmdb, setSelectedTmdb] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const torrentInputRef = useRef<HTMLInputElement>(null);

  const searchTmdb = async (query: string) => {
    if (query.length < 2) { setTmdbResults([]); return; }
    try {
      const results = await api.searchTmdb(query);
      setTmdbResults(results);
    } catch { setTmdbResults([]); }
  };

  const selectTmdb = (item: any) => {
    setSelectedTmdb(item);
    setTitle(item.title);
    setMediaType(item.mediaType === 'tv' ? 'tv_series' : 'movie');
    setTmdbResults([]);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setMessage('');

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const { uploadId } = await api.initUpload({
        filename: file.name,
        totalChunks,
        totalSize: file.size,
        title: title || undefined,
        mediaType: mediaType as any,
        tmdbId: selectedTmdb?.id,
      });

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk, `chunk_${i}`);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', String(i));

        await api.uploadChunk(formData);
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setMessage('Upload complete! File is being processed.');
      setTitle('');
      setSelectedTmdb(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleTorrentFile = async (file: File) => {
    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      formData.append('mediaType', mediaType);
      if (selectedTmdb) formData.append('tmdbId', String(selectedTmdb.id));

      await api.addTorrentFile(formData);
      setMessage('Torrent added! Check the progress page.');
      setTitle('');
      setSelectedTmdb(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleMagnetSubmit = async () => {
    if (!magnetLink.trim()) return;
    setUploading(true);
    setMessage('');
    try {
      await api.addMagnet({
        magnetLink,
        title: title || undefined,
        mediaType: mediaType as any,
        tmdbId: selectedTmdb?.id,
      });
      setMessage('Magnet link added! Check the progress page.');
      setMagnetLink('');
      setTitle('');
      setSelectedTmdb(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setUploading(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (tab === 'torrent' && file.name.endsWith('.torrent')) {
      handleTorrentFile(file);
    } else if (tab === 'file') {
      handleFileUpload(file);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Upload</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'file' ? 'active' : ''}`} onClick={() => setTab('file')}>
          Direct File Upload
        </button>
        <button className={`tab ${tab === 'torrent' ? 'active' : ''}`} onClick={() => setTab('torrent')}>
          Torrent Upload
        </button>
      </div>

      {/* Metadata section */}
      <div className="card mb-4">
        <h3 style={{ marginBottom: 12 }}>Media Info</h3>
        <div className="form-group">
          <label>Search TMDB</label>
          <input
            type="text"
            placeholder="Search for movie or TV show..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              searchTmdb(e.target.value);
            }}
          />
          {tmdbResults.length > 0 && (
            <div className="card mt-2" style={{ padding: 0, maxHeight: 200, overflow: 'auto' }}>
              {tmdbResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => selectTmdb(r)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  {r.posterPath && (
                    <img src={r.posterPath} alt="" style={{ width: 30, height: 45, borderRadius: 4 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="text-dim text-sm">
                      {r.year} - {r.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedTmdb && (
            <div className="flex gap-2 mt-2" style={{ alignItems: 'center' }}>
              <span className="badge badge-success">Selected: {selectedTmdb.title} ({selectedTmdb.year})</span>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelectedTmdb(null)}>
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>Media Type</label>
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
            <option value="movie">Movie</option>
            <option value="tv_series">TV Series</option>
          </select>
        </div>
      </div>

      {/* Upload area */}
      {tab === 'file' && (
        <div className="card">
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F4C1}'}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Drop a video file here or click to browse
            </div>
            <div className="text-dim text-sm mt-2">
              Supported: MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, TS
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv,.avi,.ts,.srt,.sub,.ass,.ssa,.vtt"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          {uploading && (
            <div className="mt-4">
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'torrent' && (
        <div className="card">
          <div className="form-group">
            <label>Magnet Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="magnet:?xt=urn:btih:..."
                value={magnetLink}
                onChange={(e) => setMagnetLink(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleMagnetSubmit}
                disabled={uploading || !magnetLink.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                Add Magnet
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-dim)' }}>
            - or -
          </div>
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => torrentInputRef.current?.click()}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F9F2}'}</div>
            <div style={{ fontWeight: 600 }}>Drop a .torrent file here or click to browse</div>
          </div>
          <input
            ref={torrentInputRef}
            type="file"
            accept=".torrent"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTorrentFile(file);
            }}
          />
        </div>
      )}

      {message && (
        <div className={`card mt-4 ${message.startsWith('Error') ? '' : ''}`}
          style={{
            borderColor: message.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
            color: message.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
