export type UserRole = 'admin' | 'editor' | 'viewer' | 'custom';

export interface UserPermissions {
  canViewMedia: boolean;
  canAddMedia: boolean;
  canEditMedia: boolean;
  canDeleteMedia: boolean;
  canManageLoans: boolean;
  canManageApiKeys: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  permissions: UserPermissions;
  avatar: string;
  pin?: string;
  disabled?: boolean;
  createdAt: string;
}

export type MediaType = 'movie' | 'tv' | 'game' | 'anime';

export type PhysicalFormat = 
  | '4K Ultra-HD'
  | 'Steelbook 4K'
  | 'Blu-Ray 1080p'
  | 'Steelbook Blu-Ray'
  | '3D Blu-Ray'
  | 'DVD'
  | 'Box Set'
  | 'VHS'
  | 'PlayStation 5'
  | 'PlayStation 4'
  | 'Xbox Series X/S'
  | 'Xbox One'
  | 'Nintendo Switch'
  | 'Retro Disc/Cartridge'
  | 'PC Disc';

export type Condition = 'Mint' | 'Like New' | 'Good' | 'Fair' | 'Poor';

export interface LoanStatus {
  isLentOut: boolean;
  lentTo?: string;
  lentDate?: string;
  dueDate?: string;
  notes?: string;
  lentItems?: string[];
}

export interface Episode {
  id?: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  runtimeMinutes?: number;
  stillUrl?: string;
  voteAverage?: number;
  isWatched?: boolean;
}

export interface Season {
  id?: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  airDate?: string;
  episodeCount: number;
  episodes?: Episode[];
  ownedInVault?: boolean;

  // Season Specific Physical Specs (for non-complete boxsets)
  format?: PhysicalFormat;
  edition?: string;
  discsCount?: number;
  condition?: Condition;
  shelfLocation?: string;
  purchasePrice?: number;
  purchaseRetailer?: string;
  purchaseDate?: string;
  barcode?: string;
  notes?: string;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  barcode?: string;
  type: MediaType;
  animeType?: 'movie' | 'tv';
  title: string;
  originalTitle?: string;
  releaseYear: number;
  posterUrl: string;
  backdropUrl?: string;
  overview: string;
  genres: string[];
  rating: number; // 0 to 10
  runtimeMinutes?: number;
  numberOfSeasons?: number; // For TV
  numberOfEpisodes?: number; // For TV
  seasons?: Season[]; // For TV Shows
  isCompleteSeries?: boolean; // For TV Shows
  tvCollectionType?: 'complete' | 'seasons' | 'individual';
  director?: string;
  cast?: string[];
  studio?: string;
  
  // Physical Collection Details
  format: PhysicalFormat;
  edition?: string; // e.g., "Criterion Collection", "Steelbook Edition", "Director's Cut"
  discsCount: number;
  condition: Condition;
  shelfLocation: string; // e.g., "Vault A - Shelf 2"
  purchasePrice?: number;
  purchaseRetailer?: string; // e.g. "HMV", "Zavvi UK", "Amazon UK", "Arrow Video"
  purchaseDate?: string;
  digitalCodeRedeemed: boolean;
  notes?: string;
  
  addedByUserId: string;
  addedByUserName: string;
  addedAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  isWishlist?: boolean;
  loanStatus?: LoanStatus;
}

export interface ApiConfig {
  id: string;
  name: string;
  type: 'tmdb' | 'omdb' | 'upc_lookup' | 'custom';
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  isPrimary: boolean;
  headers?: Record<string, string>;
}

export interface TMDBSearchResult {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  popularity?: number;
}

export interface BarcodeLookupResult {
  barcode: string;
  title: string;
  type: MediaType;
  format: PhysicalFormat;
  tmdbId?: number;
  posterUrl?: string;
  year?: number;
  overview?: string;
  suggestedGenres?: string[];
}

export type ViewCategory = 
  | 'movies-all'
  | 'movies-4k'
  | 'movies-bluray'
  | 'movies-dvd'
  | 'movies-special'
  | 'tv-all'
  | 'tv-4k'
  | 'tv-bluray'
  | 'tv-dvd'
  | 'tv-boxsets'
  | 'anime-all'
  | 'anime-movies'
  | 'anime-tv'
  | 'games-all'
  | 'games-ps'
  | 'games-xbox'
  | 'games-nintendo'
  | 'games-pc'
  | 'loans'
  | 'wishlist'
  | 'stats'
  | 'add-media'
  | 'api-settings'
  | 'user-management'
  | (string & {});

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'every_12h' | 'every_6h';
  backupTime: string;
  retentionCount: number;
  autoDownload: boolean;
  lastBackupAt?: string;
  nextBackupAt?: string;
  backupLocation: string;
}

export interface BackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  mediaCount: number;
  userCount: number;
}
