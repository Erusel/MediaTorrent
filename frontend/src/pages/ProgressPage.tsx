import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || seconds === 8640000) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ProgressPage() {
  const { socket } = useSocket();
  const [torrents, setTorrents] = useState<any[]>([]);
  const [activeUploads, setActiveUploads] = useState<any[]>([]);
  const [torrentProgress, setTorrentProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('torrent:progress', (data: any) => {
      setTorrentProgress((prev) => ({ ...prev, [data.mediaId]: data }));
    });
    return () => { socket.off('torrent:progress'); };
  }, [socket]);

  const loadData = async () => {
    try {
      const [t, u] = await Promise.all([
        api.getTorrents().catch(() => []),
        api.getActiveUploads().catch(() => []),
      ]);
      setTorrents(t);
      setActiveUploads(u);
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h1>Download & Upload Progress</h1>
      </div>

      {/* Active file uploads */}
      {activeUploads.length > 0 && (
        <div className="card mb-4">
          <h3 style={{ marginBottom: 16 }}>Active File Uploads</h3>
          {activeUploads.map((u) => (
            <div key={u.uploadId} style={{ marginBottom: 16 }}>
              <div className="flex" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{u.filename}</span>
                <span>{u.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${u.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Torrent downloads */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Torrent Downloads</h3>
        {torrents.length === 0 ? (
          <div className="empty-state">No active torrents</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Progress</th>
                <th>Down Speed</th>
                <th>Up Speed</th>
                <th>ETA</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {torrents.map((t) => {
                const p = torrentProgress[t.hash] || {};
                const progress = Math.round((p.progress ?? t.progress ?? 0) * (p.progress !== undefined ? 1 : 100));
                return (
                  <tr key={t.hash}>
                    <td style={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-sm">{progress}%</span>
                      </div>
                    </td>
                    <td>{formatSpeed(p.downloadSpeed ?? t.dlspeed ?? 0)}</td>
                    <td>{formatSpeed(p.uploadSpeed ?? t.upspeed ?? 0)}</td>
                    <td>{formatEta(p.eta ?? t.eta ?? 0)}</td>
                    <td>
                      <span
                        className={`badge ${
                          (p.state ?? t.state) === 'downloading'
                            ? 'badge-info'
                            : (p.state ?? t.state) === 'pausedDL'
                            ? 'badge-warning'
                            : (p.state ?? t.state)?.includes('UP') || (p.state ?? t.state) === 'uploading'
                            ? 'badge-success'
                            : 'badge-info'
                        }`}
                      >
                        {p.state ?? t.state ?? 'unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
