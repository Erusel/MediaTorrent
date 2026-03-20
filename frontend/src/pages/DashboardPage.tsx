import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentMedia, setRecentMedia] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.getUserStats(user.id).then(setStats).catch(() => {});
      api.getMedia({ limit: '5' }).then((data) => setRecentMedia(data.items || [])).catch(() => {});
    }
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="grid grid-4 mb-4">
        <div className="card stat-card">
          <div className="stat-value">{stats?.totalUploads || 0}</div>
          <div className="stat-label">Your Uploads</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{formatBytes(stats?.totalUploadSize || 0)}</div>
          <div className="stat-label">Total Upload Size</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{recentMedia.length}</div>
          <div className="stat-label">Recent Items</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{user?.role || '-'}</div>
          <div className="stat-label">Your Role</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Recent Media</h2>
        {recentMedia.length === 0 ? (
          <div className="empty-state">No media yet. Upload something!</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uploader</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentMedia.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>
                    <span className="badge badge-info">
                      {item.mediaType === 'movie' ? 'Movie' : 'TV'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'ready'
                          ? 'badge-success'
                          : item.status === 'error'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.uploadedBy?.username || '-'}</td>
                  <td className="text-dim text-sm">
                    {new Date(item.createdAt).toLocaleDateString()}
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
