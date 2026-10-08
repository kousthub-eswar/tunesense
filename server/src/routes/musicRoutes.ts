import { Router } from 'express';
import {
  searchMusic,
  getPopularMusic,
  getTrack,
  getTrackStream,
  getArtist,
  getAlbum,
} from '../controllers/musicController.js';

export const musicRouter = Router();

musicRouter.get('/music/search', searchMusic);
musicRouter.get('/music/popular', getPopularMusic);
musicRouter.get('/music/tracks/:id', getTrack);
musicRouter.get('/music/tracks/:id/stream', getTrackStream);
musicRouter.get('/music/artists/:id', getArtist);
musicRouter.get('/music/albums/:id', getAlbum);
