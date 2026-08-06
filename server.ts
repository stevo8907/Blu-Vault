import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { MediaItem, User, UserPermissions, UserRole, ApiConfig, PhysicalFormat, MediaType, Condition, Season, Episode } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure data folder exists for database persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bluvault-db.json');

export interface UserWithAuth extends User {
  passwordHash?: string;
}

interface DatabaseSchema {
  users: UserWithAuth[];
  media: MediaItem[];
  apiConfigs: ApiConfig[];
}

// Initial Seed Users - Empty by default for brand new OOBE setup
const DEFAULT_USERS: UserWithAuth[] = [];

// Initial Seed APIs
const DEFAULT_APIS: ApiConfig[] = [
  {
    id: 'api-tmdb',
    name: 'The Movie Database (TMDB)',
    type: 'tmdb',
    baseUrl: 'https://api.themoviedb.org/3',
    apiKey: process.env.TMDB_API_KEY || '',
    enabled: true,
    isPrimary: true
  },
  {
    id: 'api-upc',
    name: 'Open Barcode UPC Lookup',
    type: 'upc_lookup',
    baseUrl: 'https://api.upcitemdb.com/prod/trial/lookup',
    apiKey: '',
    enabled: true,
    isPrimary: false
  },
  {
    id: 'api-omdb',
    name: 'OMDb Movie API (Optional Backup)',
    type: 'omdb',
    baseUrl: 'https://www.omdbapi.com/',
    apiKey: '',
    enabled: false,
    isPrimary: false
  }
];

// Initial Physical Media Collection - Empty by default
const SEED_MEDIA: MediaItem[] = [];

// Auth & Permissions Helpers
function getDefaultPermissions(role: UserRole): UserPermissions {
  if (role === 'admin') {
    return {
      canViewMedia: true,
      canAddMedia: true,
      canEditMedia: true,
      canDeleteMedia: true,
      canManageLoans: true,
      canManageApiKeys: true,
      canManageUsers: true
    };
  }
  if (role === 'editor') {
    return {
      canViewMedia: true,
      canAddMedia: true,
      canEditMedia: true,
      canDeleteMedia: false,
      canManageLoans: true,
      canManageApiKeys: false,
      canManageUsers: false
    };
  }
  return {
    canViewMedia: true,
    canAddMedia: false,
    canEditMedia: false,
    canDeleteMedia: false,
    canManageLoans: false,
    canManageApiKeys: false,
    canManageUsers: false
  };
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_bluvault_salt_2026').digest('hex');
}

function sanitizeUser(user: UserWithAuth): User {
  const { passwordHash, ...rest } = user;
  if (!rest.permissions) {
    rest.permissions = getDefaultPermissions(rest.role || 'admin');
  }
  return rest;
}

// Helper to load or initialize database
function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        users: [],
        media: SEED_MEDIA,
        apiConfigs: DEFAULT_APIS
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data) as DatabaseSchema;
    
    if (!parsed.users) parsed.users = [];
    if (!parsed.media) parsed.media = SEED_MEDIA;
    if (!parsed.apiConfigs || parsed.apiConfigs.length === 0) parsed.apiConfigs = DEFAULT_APIS;

    // Guarantee unique IDs across all media items
    const seenMediaIds = new Set<string>();
    parsed.media.forEach((item, idx) => {
      if (!item.id || seenMediaIds.has(item.id)) {
        item.id = `bv-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      }
      seenMediaIds.add(item.id);
    });

    // Auto-migrate users missing permissions object
    parsed.users.forEach(u => {
      if (!u.permissions) {
        u.permissions = getDefaultPermissions(u.role || 'admin');
      }
    });

    return parsed;
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      users: [],
      media: SEED_MEDIA,
      apiConfigs: DEFAULT_APIS
    };
  }
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

// REST API ROUTES

// --- AUTHENTICATION ROUTES ---

// Check server status & OOBE status
app.get('/api/auth/status', (req, res) => {
  const db = getDatabase();
  const isOobeRequired = db.users.length === 0;
  res.json({ success: true, isOobeRequired, totalUsers: db.users.length });
});

// Out-Of-Box Experience (OOBE) Initial Setup
app.post('/api/auth/oobe-setup', (req, res) => {
  const db = getDatabase();
  if (db.users.length > 0) {
    return res.status(400).json({ success: false, message: 'Out-of-box setup has already been completed.' });
  }

  const { username, password, avatar } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
  }

  const adminUser: UserWithAuth = {
    id: `usr-${Date.now()}`,
    username: username.trim(),
    passwordHash: hashPassword(password),
    role: 'admin',
    permissions: getDefaultPermissions('admin'),
    avatar: avatar || '🛡️',
    createdAt: new Date().toISOString()
  };

  db.users.push(adminUser);
  saveDatabase(db);

  res.json({
    success: true,
    message: 'Master Administrator account created successfully! Please log in.',
    user: sanitizeUser(adminUser)
  });
});

// Login Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }

  const db = getDatabase();
  // Strictly case-sensitive username lookup ("A" !== "a")
  const user = db.users.find(u => u.username === username.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  if (user.passwordHash) {
    if (!password || hashPassword(password) !== user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
  }

  const token = crypto.randomBytes(24).toString('hex');

  res.json({
    success: true,
    message: 'Login successful',
    user: sanitizeUser(user),
    token
  });
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// --- USER MANAGEMENT ROUTES ---

app.get('/api/users', (req, res) => {
  const db = getDatabase();
  const sanitizedUsers = db.users.map(sanitizeUser);
  res.json({ success: true, users: sanitizedUsers });
});

app.post('/api/users', (req, res) => {
  const { username, password, role, permissions, avatar, pin } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  const db = getDatabase();
  if (db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Username already exists' });
  }

  const userRole: UserRole = role || 'editor';
  const userPermissions = permissions || getDefaultPermissions(userRole);

  const newUser: UserWithAuth = {
    id: `usr-${Date.now()}`,
    username: username.trim(),
    passwordHash: password ? hashPassword(password) : undefined,
    role: userRole,
    permissions: userPermissions,
    avatar: avatar || '👤',
    pin: pin || undefined,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDatabase(db);

  res.json({ success: true, user: sanitizeUser(newUser) });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, role, permissions, avatar, pin } = req.body;

  const db = getDatabase();
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const user = db.users[userIndex];

  if (username && username.trim()) user.username = username.trim();
  if (role) user.role = role;
  if (avatar) user.avatar = avatar;
  if (pin !== undefined) user.pin = pin || undefined;
  if (permissions) user.permissions = permissions;
  if (password && password.trim()) user.passwordHash = hashPassword(password.trim());

  db.users[userIndex] = user;
  saveDatabase(db);

  res.json({ success: true, user: sanitizeUser(user) });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const admins = db.users.filter(u => u.role === 'admin');
  const targetUser = db.users.find(u => u.id === id);

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (targetUser.role === 'admin' && admins.length <= 1) {
    return res.status(400).json({ success: false, message: 'Cannot delete the sole Administrator account' });
  }

  db.users = db.users.filter(u => u.id !== id);
  saveDatabase(db);

  res.json({ success: true, message: 'User deleted successfully' });
});

// Media Collection endpoints
app.get('/api/media', (req, res) => {
  const db = getDatabase();
  const { search, type, format, shelf, lent, favorite, sort } = req.query;

  let result = [...db.media];

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    result = result.filter(m => 
      m.title.toLowerCase().includes(q) ||
      (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
      (m.director && m.director.toLowerCase().includes(q)) ||
      (m.cast && m.cast.some(c => c.toLowerCase().includes(q))) ||
      (m.barcode && m.barcode.includes(q)) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(q))) ||
      m.shelfLocation.toLowerCase().includes(q)
    );
  }

  if (type && typeof type === 'string' && type !== 'all') {
    result = result.filter(m => m.type === type);
  }

  if (format && typeof format === 'string' && format !== 'all') {
    result = result.filter(m => m.format === format);
  }

  if (shelf && typeof shelf === 'string') {
    result = result.filter(m => m.shelfLocation.toLowerCase().includes(shelf.toLowerCase()));
  }

  if (lent === 'true') {
    result = result.filter(m => m.loanStatus?.isLentOut);
  }

  if (favorite === 'true') {
    result = result.filter(m => m.isFavorite);
  }

  // Sorting
  if (sort === 'year-desc') {
    result.sort((a, b) => b.releaseYear - a.releaseYear);
  } else if (sort === 'year-asc') {
    result.sort((a, b) => a.releaseYear - b.releaseYear);
  } else if (sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'title') {
    result.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default newest added first
    result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }

  res.json({ success: true, count: result.length, media: result });
});

app.get('/api/media/:id', (req, res) => {
  const db = getDatabase();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Media item not found' });
  }
  res.json({ success: true, item });
});

app.post('/api/media', (req, res) => {
  const db = getDatabase();
  const body = req.body;

  if (!body.title || !body.type || !body.format) {
    return res.status(400).json({ success: false, message: 'Title, type, and format are required' });
  }

  // Check if merging into existing TV show entry
  if (body.type === 'tv' && body.mergeIntoId) {
    const existingIndex = db.media.findIndex(m => m.id === body.mergeIntoId);
    if (existingIndex !== -1) {
      const existing = db.media[existingIndex];
      const newSeasons: Season[] = body.seasons || [];
      const currentSeasons: Season[] = existing.seasons || [];

      // Merge new seasons into current seasons without duplicating season numbers
      newSeasons.forEach(newSeason => {
        const foundIdx = currentSeasons.findIndex(s => s.seasonNumber === newSeason.seasonNumber);
        if (foundIdx !== -1) {
          currentSeasons[foundIdx] = { ...currentSeasons[foundIdx], ...newSeason, ownedInVault: true };
        } else {
          currentSeasons.push({ ...newSeason, ownedInVault: true });
        }
      });

      currentSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

      existing.seasons = currentSeasons;
      existing.numberOfSeasons = currentSeasons.length;
      if (body.isCompleteSeries) existing.isCompleteSeries = true;
      existing.discsCount = (existing.discsCount || 0) + (Number(body.discsCount) || 1);
      existing.updatedAt = new Date().toISOString();

      saveDatabase(db);
      return res.json({ success: true, item: existing, merged: true });
    }
  }

  const newItem: MediaItem = {
    id: `bv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    tmdbId: body.tmdbId ? Number(body.tmdbId) : undefined,
    barcode: body.barcode || undefined,
    type: body.type,
    title: body.title,
    originalTitle: body.originalTitle || body.title,
    releaseYear: body.releaseYear ? Number(body.releaseYear) : new Date().getFullYear(),
    posterUrl: body.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80',
    backdropUrl: body.backdropUrl || undefined,
    overview: body.overview || '',
    genres: Array.isArray(body.genres) ? body.genres : (body.genres ? [body.genres] : []),
    rating: body.rating ? Number(body.rating) : 7.0,
    runtimeMinutes: body.runtimeMinutes ? Number(body.runtimeMinutes) : undefined,
    numberOfSeasons: body.numberOfSeasons ? Number(body.numberOfSeasons) : (body.seasons ? body.seasons.length : undefined),
    numberOfEpisodes: body.numberOfEpisodes ? Number(body.numberOfEpisodes) : undefined,
    seasons: Array.isArray(body.seasons) ? body.seasons : [],
    isCompleteSeries: Boolean(body.isCompleteSeries),
    director: body.director || undefined,
    cast: Array.isArray(body.cast) ? body.cast : [],
    studio: body.studio || undefined,
    
    format: body.format,
    edition: body.edition || 'Standard Edition',
    discsCount: body.discsCount ? Number(body.discsCount) : 1,
    condition: body.condition || 'Mint',
    shelfLocation: body.shelfLocation || 'Main Vault Shelf',
    purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) : undefined,
    purchaseDate: body.purchaseDate || new Date().toISOString().split('T')[0],
    digitalCodeRedeemed: Boolean(body.digitalCodeRedeemed),
    notes: body.notes || '',
    
    addedByUserId: body.addedByUserId || 'usr-1',
    addedByUserName: body.addedByUserName || 'Vault Master',
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: Boolean(body.isFavorite),
    isWishlist: Boolean(body.isWishlist),
    loanStatus: body.loanStatus || { isLentOut: false }
  };

  db.media.unshift(newItem);
  saveDatabase(db);

  res.json({ success: true, item: newItem });
});

// Update single season on a TV show
app.post('/api/media/:id/seasons', (req, res) => {
  const db = getDatabase();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'TV show item not found' });
  }

  const { season } = req.body as { season: Season };
  if (!season || season.seasonNumber === undefined) {
    return res.status(400).json({ success: false, message: 'Valid season object is required' });
  }

  if (!item.seasons) item.seasons = [];
  const existingSeasonIdx = item.seasons.findIndex(s => s.seasonNumber === season.seasonNumber);

  if (existingSeasonIdx !== -1) {
    item.seasons[existingSeasonIdx] = {
      ...item.seasons[existingSeasonIdx],
      ...season
    };
  } else {
    item.seasons.push(season);
  }

  item.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
  item.numberOfSeasons = item.seasons.length;
  item.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, item });
});

// Toggle watched status on an episode
app.post('/api/media/:id/episodes/toggle-watched', (req, res) => {
  const db = getDatabase();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item || !item.seasons) {
    return res.status(404).json({ success: false, message: 'TV show or seasons not found' });
  }

  const { seasonNumber, episodeNumber, isWatched } = req.body;
  const targetSeason = item.seasons.find(s => s.seasonNumber === Number(seasonNumber));
  if (!targetSeason || !targetSeason.episodes) {
    return res.status(404).json({ success: false, message: 'Season or episodes not found' });
  }

  const ep = targetSeason.episodes.find(e => e.episodeNumber === Number(episodeNumber));
  if (ep) {
    ep.isWatched = isWatched !== undefined ? Boolean(isWatched) : !ep.isWatched;
    item.updatedAt = new Date().toISOString();
    saveDatabase(db);
  }

  res.json({ success: true, item });
});

app.put('/api/media/:id', (req, res) => {
  const db = getDatabase();
  const index = db.media.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  const existing = db.media[index];
  const updated: MediaItem = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  db.media[index] = updated;
  saveDatabase(db);

  res.json({ success: true, item: updated });
});

app.delete('/api/media/:id', (req, res) => {
  const db = getDatabase();
  const initialLength = db.media.length;
  db.media = db.media.filter(m => m.id !== req.params.id);

  if (db.media.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Media item removed from collection' });
});

// Loan status management
app.post('/api/media/:id/loan', (req, res) => {
  const db = getDatabase();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  const { isLentOut, lentTo, dueDate, notes, lentItems } = req.body;
  item.loanStatus = {
    isLentOut: Boolean(isLentOut),
    lentTo: isLentOut ? (lentTo || 'Friend') : undefined,
    lentDate: isLentOut ? new Date().toISOString().split('T')[0] : undefined,
    dueDate: isLentOut ? (dueDate || '') : undefined,
    notes: notes || '',
    lentItems: isLentOut ? (Array.isArray(lentItems) ? lentItems : (lentItems ? [lentItems] : [])) : undefined
  };
  item.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, item });
});

// Favorite toggle
app.post('/api/media/:id/favorite', (req, res) => {
  const db = getDatabase();
  const item = db.media.find(m => m.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  item.isFavorite = !item.isFavorite;
  item.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ success: true, isFavorite: item.isFavorite });
});

// TMDB API PROXY & SEARCH ENGINE
app.get('/api/tmdb/search', async (req, res) => {
  const query = req.query.q as string;
  const mediaType = (req.query.type as string) || 'multi'; // 'movie', 'tv', or 'multi'

  if (!query || !query.trim()) {
    return res.json({ success: true, results: [] });
  }

  const db = getDatabase();
  const tmdbConfig = db.apiConfigs.find(a => a.type === 'tmdb' && a.enabled);
  const apiKey = tmdbConfig?.apiKey || process.env.TMDB_API_KEY;

  if (apiKey) {
    try {
      const endpoint = mediaType === 'movie' ? 'search/movie' : mediaType === 'tv' ? 'search/tv' : 'search/multi';
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results) {
        return res.json({
          success: true,
          source: 'tmdb-api',
          results: data.results.map((item: any) => ({
            id: item.id,
            media_type: item.media_type || (mediaType === 'tv' ? 'tv' : 'movie'),
            title: item.title || item.name,
            original_title: item.original_title || item.original_name,
            overview: item.overview || 'No overview available.',
            poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
            release_date: item.release_date || item.first_air_date || '',
            vote_average: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 7.0,
            popularity: item.popularity
          }))
        });
      }
    } catch (err) {
      console.warn('TMDB API fetch error, falling back to smart catalog search:', err);
    }
  }

  // Fallback / Built-in TMDB simulated catalog search when TMDB key is not provided or network offline
  const mockCatalog = [
    {
      id: 872585,
      media_type: 'movie',
      title: 'Oppenheimer',
      original_title: 'Oppenheimer',
      overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.',
      poster_path: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGvC3P2R48q.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/fm6K3133A22CwA2vvS21R3m9L3E.jpg',
      release_date: '2023-07-19',
      vote_average: 8.9,
      popularity: 120
    },
    {
      id: 693134,
      media_type: 'movie',
      title: 'Dune: Part Two',
      original_title: 'Dune: Part Two',
      overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLPoL3VFiBvbdD2PCh39RVIW.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/xOM08Go8DFB9yL9X39o211d.jpg',
      release_date: '2024-02-27',
      vote_average: 8.6,
      popularity: 150
    },
    {
      id: 155,
      media_type: 'movie',
      title: 'The Dark Knight',
      original_title: 'The Dark Knight',
      overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and Harvey Dent.',
      poster_path: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/nMK98Fi1sA3B3332S1c55c5s.jpg',
      release_date: '2008-07-16',
      vote_average: 9.0,
      popularity: 110
    },
    {
      id: 27205,
      media_type: 'movie',
      title: 'Inception',
      original_title: 'Inception',
      overview: 'Cobb, a skilled thief who steals valuable secrets from within the subconscious during the dream state.',
      poster_path: 'https://image.tmdb.org/t/p/w500/oYu231B98B29C132S1c.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/s3T13289091c.jpg',
      release_date: '2010-07-15',
      vote_average: 8.8,
      popularity: 95
    },
    {
      id: 157336,
      media_type: 'movie',
      title: 'Interstellar',
      original_title: 'Interstellar',
      overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
      poster_path: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/p1L13290s333.jpg',
      release_date: '2014-11-05',
      vote_average: 8.7,
      popularity: 130
    },
    {
      id: 569094,
      media_type: 'movie',
      title: 'Spider-Man: Across the Spider-Verse',
      original_title: 'Spider-Man: Across the Spider-Verse',
      overview: 'Miles Morales is catapulted across the Multiverse, where he encounters a team of Spider-People.',
      poster_path: 'https://image.tmdb.org/t/p/w500/8Vt6mR9B333.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/4XM8333.jpg',
      release_date: '2023-05-31',
      vote_average: 8.4,
      popularity: 105
    },
    {
      id: 1396,
      media_type: 'tv',
      title: 'Breaking Bad',
      original_title: 'Breaking Bad',
      overview: 'A high school chemistry teacher turned methamphetamine producer.',
      poster_path: 'https://image.tmdb.org/t/p/w500/zt2a3m3i0Gv7C6rT5R.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/tsRy63MuSseBDK3viA23333.jpg',
      release_date: '2008-01-20',
      vote_average: 9.5,
      popularity: 140
    },
    {
      id: 100088,
      media_type: 'tv',
      title: 'The Last of Us',
      original_title: 'The Last of Us',
      overview: 'Joel and Ellie travel across a post-apocalyptic United States.',
      poster_path: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyve43313.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/uDgy633339912.jpg',
      release_date: '2023-01-15',
      vote_average: 8.7,
      popularity: 115
    },
    {
      id: 94605,
      media_type: 'tv',
      title: 'Arcane',
      original_title: 'Arcane',
      overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war.',
      poster_path: 'https://image.tmdb.org/t/p/w500/fq293021.jpg',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/arc333.jpg',
      release_date: '2021-11-06',
      vote_average: 9.0,
      popularity: 90
    }
  ];

  const qLower = query.toLowerCase();
  let filtered = mockCatalog.filter(m => 
    m.title.toLowerCase().includes(qLower) || 
    m.overview.toLowerCase().includes(qLower)
  );

  // If search term is custom, generate a candidate result
  if (filtered.length === 0) {
    filtered = [
      {
        id: Math.floor(Math.random() * 900000) + 100000,
        media_type: mediaType === 'tv' ? 'tv' : 'movie',
        title: query,
        original_title: query,
        overview: `Information for "${query}". You can review and customize physical details before saving into your Blu-Vault library.`,
        poster_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
        backdrop_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&auto=format&fit=crop&q=80',
        release_date: '2024-01-01',
        vote_average: 8.2,
        popularity: 50
      }
    ];
  }

  res.json({ success: true, source: 'fallback-catalog', results: filtered });
});

app.get('/api/tmdb/details', async (req, res) => {
  const tmdbId = req.query.id;
  const type = (req.query.type as string) || 'movie';

  if (!tmdbId) {
    return res.status(400).json({ success: false, message: 'TMDB ID required' });
  }

  const db = getDatabase();
  const tmdbConfig = db.apiConfigs.find(a => a.type === 'tmdb' && a.enabled);
  const apiKey = tmdbConfig?.apiKey || process.env.TMDB_API_KEY;

  if (apiKey) {
    try {
      const endpoint = type === 'tv' ? `tv/${tmdbId}` : `movie/${tmdbId}`;
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&append_to_response=credits`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.id) {
        const directors = data.credits?.crew
          ? data.credits.crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name).join(', ')
          : '';
        const cast = data.credits?.cast
          ? data.credits.cast.slice(0, 6).map((c: any) => c.name)
          : [];

        const formattedSeasons = (data.seasons || [])
          .filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            id: s.id,
            seasonNumber: s.season_number,
            name: s.name || `Season ${s.season_number}`,
            overview: s.overview || '',
            posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : undefined,
            airDate: s.air_date || '',
            episodeCount: s.episode_count || 0,
            ownedInVault: true
          }));

        return res.json({
          success: true,
          details: {
            id: data.id,
            title: data.title || data.name,
            originalTitle: data.original_title || data.original_name,
            overview: data.overview,
            posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
            releaseYear: data.release_date || data.first_air_date ? new Date(data.release_date || data.first_air_date).getFullYear() : 2023,
            genres: data.genres ? data.genres.map((g: any) => g.name) : ['Drama'],
            rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : 8.0,
            runtimeMinutes: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : undefined),
            numberOfSeasons: data.number_of_seasons || formattedSeasons.length,
            numberOfEpisodes: data.number_of_episodes,
            seasons: formattedSeasons,
            director: directors,
            cast,
            studio: data.production_companies?.[0]?.name || ''
          }
        });
      }
    } catch (err) {
      console.warn('TMDB Details fetch error:', err);
    }
  }

  // Fallback response for TV or Movie details if API key is missing or error
  const numSeasons = type === 'tv' ? 3 : undefined;
  const fallbackSeasons = type === 'tv' ? [
    { seasonNumber: 1, name: 'Season 1', episodeCount: 8, ownedInVault: true },
    { seasonNumber: 2, name: 'Season 2', episodeCount: 10, ownedInVault: true },
    { seasonNumber: 3, name: 'Season 3', episodeCount: 10, ownedInVault: true }
  ] : undefined;

  res.json({
    success: true,
    details: {
      id: Number(tmdbId),
      title: type === 'tv' ? 'TV Show Series' : 'Media Details',
      overview: 'Detailed physical copy information in Blu-Vault.',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
      releaseYear: 2023,
      genres: ['Action', 'Drama'],
      rating: 8.5,
      numberOfSeasons: numSeasons,
      seasons: fallbackSeasons
    }
  });
});

// TMDB Season & Episode fetch endpoint
app.get('/api/tmdb/season', async (req, res) => {
  const tvId = req.query.tvId;
  const seasonNumber = Number(req.query.seasonNumber || 1);

  if (!tvId) {
    return res.status(400).json({ success: false, message: 'tvId is required' });
  }

  const db = getDatabase();
  const tmdbConfig = db.apiConfigs.find(a => a.type === 'tmdb' && a.enabled);
  const apiKey = tmdbConfig?.apiKey || process.env.TMDB_API_KEY;

  if (apiKey) {
    try {
      const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.season_number !== undefined) {
        return res.json({
          success: true,
          season: {
            id: data.id,
            seasonNumber: data.season_number,
            name: data.name || `Season ${seasonNumber}`,
            overview: data.overview || '',
            posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
            airDate: data.air_date || '',
            episodeCount: data.episodes ? data.episodes.length : 0,
            episodes: (data.episodes || []).map((ep: any) => ({
              id: ep.id,
              episodeNumber: ep.episode_number,
              seasonNumber: ep.season_number,
              name: ep.name,
              overview: ep.overview || 'Episode synopsis.',
              airDate: ep.air_date || '',
              runtimeMinutes: ep.runtime || 45,
              stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
              voteAverage: ep.vote_average ? Math.round(ep.vote_average * 10) / 10 : 8.0,
              isWatched: false
            }))
          }
        });
      }
    } catch (err) {
      console.warn('TMDB Season fetch error:', err);
    }
  }

  // Fallback realistic episode generator if TMDB key is not set
  const epCount = seasonNumber === 1 ? 8 : 10;
  const mockEpisodes = Array.from({ length: epCount }, (_, i) => ({
    episodeNumber: i + 1,
    seasonNumber,
    name: `Episode ${i + 1}`,
    overview: `Key plot developments and story arcs unfold in Episode ${i + 1} of Season ${seasonNumber}.`,
    airDate: `2023-0${(seasonNumber % 9) + 1}-15`,
    runtimeMinutes: 45 + (i % 12),
    stillUrl: `https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80`,
    voteAverage: 8.2 + (i % 8) * 0.1,
    isWatched: false
  }));

  res.json({
    success: true,
    season: {
      seasonNumber,
      name: `Season ${seasonNumber}`,
      overview: `Episodes for Season ${seasonNumber}`,
      episodeCount: mockEpisodes.length,
      episodes: mockEpisodes
    }
  });
});

// Barcode Lookup route
app.get('/api/barcode/lookup', async (req, res) => {
  const code = (req.query.code as string || '').trim();
  if (!code) {
    return res.status(400).json({ success: false, message: 'Barcode is required' });
  }

  const db = getDatabase();

  // Check if item with this barcode already exists in user's vault!
  const existingInVault = db.media.find(m => m.barcode === code);
  if (existingInVault) {
    return res.json({
      success: true,
      foundInVault: true,
      item: existingInVault,
      message: 'Barcode matched an existing item in your physical vault!'
    });
  }

  // Known hardcoded sample UPC mappings for instant demo barcode scans
  const KNOWN_UPCS: Record<string, any> = {
    '025192067082': {
      barcode: '025192067082',
      title: 'Oppenheimer',
      type: 'movie',
      format: 'Steelbook 4K',
      tmdbId: 872585,
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGvC3P2R48q.jpg',
      year: 2023,
      overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb.',
      suggestedGenres: ['Drama', 'History']
    },
    '088392902096': {
      barcode: '088392902096',
      title: 'The Dark Knight',
      type: 'movie',
      format: '4K Ultra-HD',
      tmdbId: 155,
      posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      year: 2008,
      overview: 'Batman raises the stakes in his war on crime in Gotham City.',
      suggestedGenres: ['Action', 'Crime']
    },
    '883929813987': {
      barcode: '883929813987',
      title: 'Dune: Part Two',
      type: 'movie',
      format: 'Steelbook 4K',
      tmdbId: 693134,
      posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLPoL3VFiBvbdD2PCh39RVIW.jpg',
      year: 2024,
      overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge.',
      suggestedGenres: ['Sci-Fi', 'Adventure']
    },
    '031398240212': {
      barcode: '031398240212',
      title: 'Breaking Bad: Complete Series',
      type: 'tv',
      format: 'Box Set',
      tmdbId: 1396,
      posterUrl: 'https://image.tmdb.org/t/p/w500/zt2a3m3i0Gv7C6rT5R.jpg',
      year: 2008,
      overview: 'High school chemistry teacher turns to drug manufacturing.',
      suggestedGenres: ['Drama', 'Crime']
    },
    '088392913917': {
      barcode: '088392913917',
      title: 'Inception',
      type: 'movie',
      format: '4K Ultra-HD',
      tmdbId: 27205,
      posterUrl: 'https://image.tmdb.org/t/p/w500/oYu231B98B29C132S1c.jpg',
      year: 2010,
      overview: 'Cobb, a skilled thief who steals secrets from within the subconscious.',
      suggestedGenres: ['Sci-Fi', 'Action']
    },
    '088392945765': {
      barcode: '088392945765',
      title: 'Interstellar',
      type: 'movie',
      format: 'Steelbook 4K',
      tmdbId: 157336,
      posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      year: 2014,
      overview: 'Explorers travel through a wormhole in space to ensure humanity’s survival.',
      suggestedGenres: ['Sci-Fi', 'Drama']
    },
    '043396631891': {
      barcode: '043396631891',
      title: 'Spider-Man: Across the Spider-Verse',
      type: 'movie',
      format: '4K Ultra-HD',
      tmdbId: 569094,
      posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mR9B333.jpg',
      year: 2023,
      overview: 'Miles Morales is catapulted across the Multiverse.',
      suggestedGenres: ['Animation', 'Action']
    },
    '088392980182': {
      barcode: '088392980182',
      title: 'The Last of Us: Season 1',
      type: 'tv',
      format: '4K Ultra-HD',
      tmdbId: 100088,
      posterUrl: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyve43313.jpg',
      year: 2023,
      overview: 'Joel and Ellie travel across a post-apocalyptic United States.',
      suggestedGenres: ['Drama', 'Sci-Fi']
    }
  };

  if (KNOWN_UPCS[code]) {
    return res.json({
      success: true,
      foundInVault: false,
      result: KNOWN_UPCS[code]
    });
  }

  // Attempt public free UPC lookup via UPC Item DB
  try {
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
    if (upcRes.ok) {
      const upcData = await upcRes.json();
      if (upcData?.items?.[0]?.title) {
        const rawTitle = upcData.items[0].title;
        // Clean title for TMDB search
        const cleanTitle = rawTitle
          .replace(/\[.*?\]|\(.*?\)/g, '')
          .replace(/4k|ultra hd|uhd|blu-ray|bluray|dvd|steelbook|collector's edition|box set/gi, '')
          .trim();

        if (cleanTitle.length > 2) {
          // Attempt TMDB lookup
          const tmdbConfig = db.apiConfigs.find(a => a.type === 'tmdb' && a.enabled);
          const activeTmdbApiKey = tmdbConfig?.apiKey || process.env.TMDB_API_KEY;
          
          if (activeTmdbApiKey) {
            const tmdbSearchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${activeTmdbApiKey}&query=${encodeURIComponent(cleanTitle)}`);
            if (tmdbSearchRes.ok) {
              const tmdbData = await tmdbSearchRes.json();
              const firstResult = tmdbData.results?.[0];
              if (firstResult) {
                const mediaType = firstResult.media_type === 'tv' ? 'tv' : 'movie';
                const releaseYear = firstResult.release_date || firstResult.first_air_date
                  ? new Date(firstResult.release_date || firstResult.first_air_date).getFullYear()
                  : 2023;

                return res.json({
                  success: true,
                  foundInVault: false,
                  result: {
                    barcode: code,
                    title: firstResult.title || firstResult.name || cleanTitle,
                    type: mediaType,
                    format: '4K Ultra-HD',
                    tmdbId: firstResult.id,
                    posterUrl: firstResult.poster_path ? `https://image.tmdb.org/t/p/w500${firstResult.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
                    year: releaseYear,
                    overview: firstResult.overview || upcData.items[0].description || `Scanned Barcode #${code}`,
                    suggestedGenres: ['Physical Media']
                  }
                });
              }
            }
          }
        }

        // Return upc item db title if TMDB search didn't find exact match
        return res.json({
          success: true,
          foundInVault: false,
          result: {
            barcode: code,
            title: cleanTitle || rawTitle,
            type: 'movie',
            format: '4K Ultra-HD',
            posterUrl: upcData.items[0].images?.[0] || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
            year: 2023,
            overview: upcData.items[0].description || `Scanned Barcode #${code}`,
            suggestedGenres: [upcData.items[0].brand || 'Physical Media']
          }
        });
      }
    }
  } catch (err) {
    console.warn('Free UPC lookup warning:', err);
  }

  // Attempt lookup via user-configured UPC API if enabled
  const upcConfig = db.apiConfigs.find(a => a.type === 'upc_lookup' && a.enabled);
  if (upcConfig) {
    try {
      const upcRes = await fetch(`${upcConfig.baseUrl}?s=${code}`);
      const upcData = await upcRes.json();
      if (upcData?.items?.[0]) {
        const item = upcData.items[0];
        return res.json({
          success: true,
          foundInVault: false,
          result: {
            barcode: code,
            title: item.title,
            type: item.category?.toLowerCase().includes('game') ? 'game' : item.category?.toLowerCase().includes('tv') ? 'tv' : 'movie',
            format: '4K Ultra-HD',
            posterUrl: item.images?.[0] || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
            year: 2023,
            overview: item.description || `Scanned Barcode #${code}`,
            suggestedGenres: [item.brand || 'Physical Media']
          }
        });
      }
    } catch (err) {
      console.warn('Custom UPC API error:', err);
    }
  }

  // Un-cataloged barcode fallback - return clear signal so AddMediaModal opens search step with barcode attached
  res.json({
    success: true,
    foundInVault: false,
    result: {
      barcode: code,
      title: '',
      isUnknownBarcode: true,
      message: `Scanned barcode #${code}`
    }
  });
});

// API Settings Endpoints
app.get('/api/settings/apis', (req, res) => {
  const db = getDatabase();
  res.json({ success: true, apiConfigs: db.apiConfigs });
});

app.post('/api/settings/apis', (req, res) => {
  const { apiConfigs } = req.body;
  if (!Array.isArray(apiConfigs)) {
    return res.status(400).json({ success: false, message: 'Invalid API configurations' });
  }

  const db = getDatabase();
  db.apiConfigs = apiConfigs;
  saveDatabase(db);

  res.json({ success: true, message: 'API settings updated successfully', apiConfigs: db.apiConfigs });
});

app.post('/api/settings/apis/test', async (req, res) => {
  const { type, apiKey, baseUrl } = req.body;
  if (type === 'tmdb') {
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API Key is required to test TMDB' });
    }
    try {
      const response = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${apiKey}`);
      const data = await response.json();
      if (data.success) {
        return res.json({ success: true, message: 'TMDB API Connection Successful! Key verified.' });
      } else {
        return res.status(400).json({ success: false, message: data.status_message || 'TMDB API key validation failed.' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: `Connection failed: ${err.message}` });
    }
  }

  res.json({ success: true, message: `Connection test endpoint ready for ${type || 'Custom API'}.` });
});

// Backup & Database Export/Import
app.get('/api/backup/export', (req, res) => {
  const db = getDatabase();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=bluvault-backup-${new Date().toISOString().split('T')[0]}.json`);
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/backup/import', (req, res) => {
  const { users, media, apiConfigs } = req.body;
  if (!Array.isArray(media)) {
    return res.status(400).json({ success: false, message: 'Invalid backup format. Media array is required.' });
  }

  const db = getDatabase();
  if (Array.isArray(users) && users.length > 0) db.users = users;
  if (Array.isArray(media)) db.media = media;
  if (Array.isArray(apiConfigs) && apiConfigs.length > 0) db.apiConfigs = apiConfigs;

  saveDatabase(db);
  res.json({ success: true, message: `Successfully imported ${media.length} media items into Blu-Vault!`, mediaCount: media.length });
});

// System Factory Reset (Admin Only)
app.post('/api/system/reset', (req, res) => {
  const { userId, password } = req.body;
  const db = getDatabase();

  // If database is already empty, allow reset directly
  if (db.users.length === 0) {
    const freshDb: DatabaseSchema = {
      users: [],
      media: [],
      apiConfigs: DEFAULT_APIS
    };
    saveDatabase(freshDb);
    return res.json({ success: true, message: 'System has been reset to default initial setup state.' });
  }

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required to authorize factory reset.' });
  }

  const user = db.users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
  if (!user) {
    return res.status(404).json({ success: false, message: 'User account not found.' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Only Administrator accounts can perform a factory reset.' });
  }

  if (user.passwordHash) {
    if (!password || hashPassword(password) !== user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid administrator password.' });
    }
  }

  // Perform full factory reset
  const freshDb: DatabaseSchema = {
    users: [],
    media: [],
    apiConfigs: DEFAULT_APIS
  };

  saveDatabase(freshDb);
  res.json({ success: true, message: 'System reset completed! Blu-Vault has been restored to factory defaults.' });
});

// System Restart Endpoint
app.post('/api/system/restart', (req, res) => {
  const { userId, password } = req.body;
  const db = getDatabase();

  if (db.users.length > 0) {
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required to authorize restart.' });
    }
    const user = db.users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Administrator accounts can restart the server.' });
    }
    if (user.passwordHash) {
      if (!password || hashPassword(password) !== user.passwordHash) {
        return res.status(401).json({ success: false, message: 'Invalid administrator password.' });
      }
    }
  }

  res.json({ success: true, message: 'System restart sequence initiated. Blu-Vault service is restarting...' });

  // Schedule process restart
  setTimeout(() => {
    console.log('--- RESTARTING SYSTEM PROCESS ---');
    process.exit(0);
  }, 1000);
});

// System Power Off Endpoint
app.post('/api/system/poweroff', (req, res) => {
  const { userId, password } = req.body;
  const db = getDatabase();

  if (db.users.length > 0) {
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required to authorize power off.' });
    }
    const user = db.users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Administrator accounts can power off the server.' });
    }
    if (user.passwordHash) {
      if (!password || hashPassword(password) !== user.passwordHash) {
        return res.status(401).json({ success: false, message: 'Invalid administrator password.' });
      }
    }
  }

  res.json({ success: true, message: 'System shutdown sequence initiated. Powering off Blu-Vault...' });

  // Schedule process termination
  setTimeout(() => {
    console.log('--- SYSTEM POWERED OFF ---');
    process.exit(0);
  }, 1000);
});

// VITE MIDDLEWARE SETUP
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blu-Vault Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
