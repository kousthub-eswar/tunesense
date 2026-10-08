import { NavItem } from '../types/index.js';

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/home', iconName: 'Home' },
  { id: 'discover', label: 'Discover', path: '/discover', iconName: 'Compass' },
  { id: 'library', label: 'Library', path: '/library', iconName: 'Library' },
  { id: 'profile', label: 'Profile', path: '/profile', iconName: 'User' },
];

export const APP_INFO = {
  name: 'TuneSense',
  tagline: 'Music that understands your vibe.',
  academicTitle: 'TuneSense: A Personalized, Context-Aware and Explainable Music Recommendation System Using NoSQL',
  stage: 'Stage 1: Foundation, Architecture & Design System',
} as const;
