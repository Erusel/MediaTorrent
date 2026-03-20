const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Users
  getProfile: () => request<any>('/users/me'),
  getUserStats: (id: string) => request<any>(`/users/${id}/stats`),

  // Media
  getMedia: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/media${qs}`);
  },

  deleteMedia: (id: string) =>
    request<any>(`/media/${id}`, { method: 'DELETE' }),

  // Torrents
  addMagnet: (data: { magnetLink: string; title?: string; mediaType?: string; tmdbId?: number }) =>
    request<any>('/torrents/magnet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addTorrentFile: (formData: FormData) =>
    request<any>('/torrents/file', { method: 'POST', body: formData }),

  getTorrents: () => request<any[]>('/torrents'),
  searchTmdb: (q: string) => request<any[]>(`/torrents/tmdb/search?q=${encodeURIComponent(q)}`),

  // Uploads
  initUpload: (data: {
    filename: string;
    totalChunks: number;
    totalSize: number;
    title?: string;
    mediaType?: string;
    tmdbId?: number;
  }) =>
    request<{ uploadId: string }>('/uploads/init', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadChunk: (formData: FormData) =>
    request<{ received: number; total: number; complete: boolean }>(
      '/uploads/chunk',
      { method: 'POST', body: formData },
    ),

  getActiveUploads: () => request<any[]>('/uploads/active'),

  // Leaderboard
  getLeaderboard: (sortBy?: string) => {
    const qs = sortBy ? `?sortBy=${sortBy}` : '';
    return request<any[]>(`/leaderboard${qs}`);
  },

  // Admin
  admin: {
    getUsers: () => request<any[]>('/admin/users'),
    createUser: (data: any) =>
      request<any>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: any) =>
      request<any>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    banUser: (id: string) =>
      request<any>(`/admin/users/${id}/ban`, { method: 'POST' }),
    unbanUser: (id: string) =>
      request<any>(`/admin/users/${id}/unban`, { method: 'POST' }),
    getActivity: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/admin/activity${qs}`);
    },
    getTorrents: () => request<any[]>('/admin/torrents'),
    deleteTorrent: (hash: string, deleteFiles?: boolean) =>
      request<any>(
        `/admin/torrents/${hash}?deleteFiles=${deleteFiles || false}`,
        { method: 'DELETE' },
      ),
    pauseTorrent: (hash: string) =>
      request<any>(`/admin/torrents/${hash}/pause`, { method: 'POST' }),
    resumeTorrent: (hash: string) =>
      request<any>(`/admin/torrents/${hash}/resume`, { method: 'POST' }),
  },
};
