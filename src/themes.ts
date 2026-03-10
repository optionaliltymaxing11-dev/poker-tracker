export interface Theme {
  id: string;
  name: string;
  category: 'light' | 'dark' | 'cypherpunk';
  colors: {
    primary: string;
    'primary-dark': string;
    'primary-light': string;
    bg: string;
    'card-bg': string;
    text: string;
    'text-secondary': string;
    profit: string;
    loss: string;
    border: string;
    'section-bg': string;
    'input-bg': string;
    hover: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'teal-classic',
    name: 'Teal Classic',
    category: 'light',
    colors: {
      primary: '#00796B',
      'primary-dark': '#004D40',
      'primary-light': '#B2DFDB',
      bg: '#ffffff',
      'card-bg': '#ffffff',
      text: '#111827',
      'text-secondary': '#6b7280',
      profit: '#2E7D32',
      loss: '#D32F2F',
      border: '#e5e7eb',
      'section-bg': '#B2DFDB',
      'input-bg': '#ffffff',
      hover: '#f9fafb',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    category: 'light',
    colors: {
      primary: '#1565C0',
      'primary-dark': '#0D47A1',
      'primary-light': '#BBDEFB',
      bg: '#F5F9FF',
      'card-bg': '#ffffff',
      text: '#1a1a2e',
      'text-secondary': '#546e7a',
      profit: '#2E7D32',
      loss: '#D32F2F',
      border: '#bbdefb',
      'section-bg': '#BBDEFB',
      'input-bg': '#ffffff',
      hover: '#EBF2FF',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'light',
    colors: {
      primary: '#37474F',
      'primary-dark': '#263238',
      'primary-light': '#CFD8DC',
      bg: '#ECEFF1',
      'card-bg': '#ffffff',
      text: '#263238',
      'text-secondary': '#78909c',
      profit: '#2E7D32',
      loss: '#D32F2F',
      border: '#cfd8dc',
      'section-bg': '#CFD8DC',
      'input-bg': '#ffffff',
      hover: '#E0E4E7',
    },
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    category: 'dark',
    colors: {
      primary: '#1a1a2e',
      'primary-dark': '#111122',
      'primary-light': '#2a2a4a',
      bg: '#121212',
      'card-bg': '#1e1e1e',
      text: '#e0e0e0',
      'text-secondary': '#9e9e9e',
      profit: '#4CAF50',
      loss: '#ef5350',
      border: '#333333',
      'section-bg': '#2a2a2a',
      'input-bg': '#2a2a2a',
      hover: '#252525',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'dark',
    colors: {
      primary: '#0d1117',
      'primary-dark': '#080c12',
      'primary-light': '#21262d',
      bg: '#0d1117',
      'card-bg': '#161b22',
      text: '#c9d1d9',
      'text-secondary': '#8b949e',
      profit: '#3fb950',
      loss: '#f85149',
      border: '#30363d',
      'section-bg': '#21262d',
      'input-bg': '#21262d',
      hover: '#1c2128',
    },
  },
  {
    id: 'amoled-black',
    name: 'AMOLED Black',
    category: 'dark',
    colors: {
      primary: '#000000',
      'primary-dark': '#000000',
      'primary-light': '#1a1a1a',
      bg: '#000000',
      'card-bg': '#121212',
      text: '#ffffff',
      'text-secondary': '#aaaaaa',
      profit: '#03DAC6',
      loss: '#CF6679',
      border: '#222222',
      'section-bg': '#1a1a1a',
      'input-bg': '#1a1a1a',
      hover: '#0a0a0a',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    category: 'cypherpunk',
    colors: {
      primary: '#0a0a0a',
      'primary-dark': '#050505',
      'primary-light': '#0d1a0d',
      bg: '#0a0a0a',
      'card-bg': '#111111',
      text: '#00ff41',
      'text-secondary': '#008f11',
      profit: '#00ff41',
      loss: '#ff0040',
      border: '#003300',
      'section-bg': '#0d1a0d',
      'input-bg': '#111111',
      hover: '#0f0f0f',
    },
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    category: 'cypherpunk',
    colors: {
      primary: '#1a0033',
      'primary-dark': '#0d001a',
      'primary-light': '#220044',
      bg: '#0d001a',
      'card-bg': '#1a0033',
      text: '#e0b0ff',
      'text-secondary': '#9966cc',
      profit: '#00ffcc',
      loss: '#ff3366',
      border: '#330066',
      'section-bg': '#220044',
      'input-bg': '#1a0033',
      hover: '#150028',
    },
  },
];

// Dark/cypherpunk themes need accent color for header text highlighting
// For dark themes, the accent is the standout color used where teal was used as a highlight
export function getAccentColor(theme: Theme): string {
  switch (theme.id) {
    case 'dark-mode': return '#00BFA5';
    case 'midnight': return '#58a6ff';
    case 'amoled-black': return '#BB86FC';
    case 'matrix': return '#00ff41';
    case 'neon-cyber': return '#ff00ff';
    default: return theme.colors.primary;
  }
}

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) || themes[0];
}
