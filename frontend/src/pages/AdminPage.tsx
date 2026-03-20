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

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'users' | 'media' | 'torrents' | 'logs'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [torrents, setTorrents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadTabData();
  }, [tab, user]);

  const loadTabData = async () => {
    try {
      switch (tab) {
        case 'users':
          setUsers(await api.admin.getUsers());
          break;
        case 'media': {
          const data = await api.getMedia({ limit: '50' });
          setMedia(data.items || []);
          break;
        }
        case 'torrents':
          setTorrents(await api.admin.getTorrents());
          break;
        case 'logs': {
          const data = await api.admin.getActivity({ limit: '100' });
          setLogs(data.items || []);
          break;
        }
      }
    } catch {}
  };

  if (user?.role !== 'admin') {
    return <div className="card empty-state">Access denied. Admin only.</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="tabs">
        {(['users', 'media', 'torrents', 'logs'] as const).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Uploads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td className="text-dim">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.isBanned ? (
                      <span className="badge badge-danger">Banned</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>{u.totalUploads}</td>
                  <td>
                    <div className="flex gap-2">
                      {u.id !== user?.id && (
                        <>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={async () => {
                              if (u.isBanned) {
                                await api.admin.unbanUser(u.id);
                              } else {
                                await api.admin.banUser(u.id);
                              }
                              loadTabData();
                            }}
                          >
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={async () => {
                              const newRole = u.role === 'admin' ? 'user' : 'admin';
                              await api.admin.updateUser(u.id, { role: newRole });
                              loadTabData();
                            }}
                          >
                            Toggle Admin
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={async () => {
                              if (confirm(`Delete user ${u.username}?`)) {
                                await api.admin.deleteUser(u.id);
                                loadTabData();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Media */}
      {tab === 'media' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Upload Type</th>
                <th>Status</th>
                <th>Size</th>
                <th>Uploader</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {media.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.title}</td>
                  <td><span className="badge badge-info">{m.mediaType}</span></td>
                  <td>{m.uploadType}</td>
                  <td>
                    <span className={`badge ${m.status === 'ready' ? 'badge-success' : m.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>{formatBytes(m.fileSize || 0)}</td>
                  <td>{m.uploadedBy?.username || '-'}</td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={async () => {
                        if (confirm(`Delete "${m.title}" and its files?`)) {
                          await api.deleteMedia(m.id);
                          loadTabData();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Torrents */}
      {tab === 'torrents' && (
        <div className="card">
          {torrents.length === 0 ? (
            <div className="empty-state">No active torrents</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {torrents.map((t) => (
                  <tr key={t.hash}>
                    <td style={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </td>
                    <td>{Math.round(t.progress * 100)}%</td>
                    <td><span className="badge badge-info">{t.state}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => api.admin.pauseTorrent(t.hash).then(loadTabData)}
                        >
                          Pause
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => api.admin.resumeTorrent(t.hash).then(loadTabData)}
                        >
                          Resume
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => {
                            if (confirm('Delete torrent and files?')) {
                              api.admin.deleteTorrent(t.hash, true).then(loadTabData);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="card">
          {logs.length === 0 ? (
            <div className="empty-state">No activity logs</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-dim text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.user?.username || '-'}</td>
                    <td><span className="badge badge-info">{log.action}</span></td>
                    <td className="text-dim text-sm" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
