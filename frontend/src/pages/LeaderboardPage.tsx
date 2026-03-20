import { useState, useEffect } from 'react';
import { api } from '../services/api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'totalUploads' | 'totalUploadSize'>('totalUploads');

  useEffect(() => {
    api.getLeaderboard(sortBy).then(setEntries).catch(() => {});
  }, [sortBy]);

  return (
    <div>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <div className="tabs" style={{ margin: 0 }}>
          <button
            className={`tab ${sortBy === 'totalUploads' ? 'active' : ''}`}
            onClick={() => setSortBy('totalUploads')}
          >
            By Uploads
          </button>
          <button
            className={`tab ${sortBy === 'totalUploadSize' ? 'active' : ''}`}
            onClick={() => setSortBy('totalUploadSize')}
          >
            By Size
          </button>
        </div>
      </div>

      <div className="card">
        {entries.length === 0 ? (
          <div className="empty-state">No entries yet</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Uploads</th>
                <th>Total Size</th>
                <th>Member Since</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color:
                          entry.rank === 1
                            ? '#ffd700'
                            : entry.rank === 2
                            ? '#c0c0c0'
                            : entry.rank === 3
                            ? '#cd7f32'
                            : 'var(--text-dim)',
                      }}
                    >
                      #{entry.rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{entry.username}</td>
                  <td>{entry.totalUploads}</td>
                  <td>{formatBytes(entry.totalUploadSize)}</td>
                  <td className="text-dim text-sm">
                    {new Date(entry.memberSince).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
