export const themes = {
    light: {
      name: '浅色',
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#333333',
        textSecondary: '#666666',
        border: '#dee2e6',
        error: '#dc3545',
        success: '#28a745'
      }
    },
    dark: {
      name: '深色',
      colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        background: '#1a1a1a',
        surface: '#2d2d2d',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
        border: '#404040',
        error: '#dc3545',
        success: '#28a745'
      }
    },
    blue: {
      name: '蓝色',
      colors: {
        primary: '#0066cc',
        secondary: '#5c8db8',
        background: '#f0f8ff',
        surface: '#ffffff',
        text: '#333333',
        textSecondary: '#666666',
        border: '#cce5ff',
        error: '#dc3545',
        success: '#28a745'
      }
    }
  }
  
  export type Theme = keyof typeof themes
  export const defaultTheme: Theme = 'light'