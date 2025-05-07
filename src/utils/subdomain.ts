export const getSubdomain = (): string | null => {
  if (typeof window === 'undefined') return null;

  // Only check for subdomain on customer pages
  if (!window.location.pathname.startsWith('/scan') && !window.location.pathname.startsWith('/order')) {
    return null;
  }

  const hostname = window.location.hostname; // e.g., "pizzahub.localhost"
  const parts = hostname.split('.');

  // Case: pizzahub.localhost or pizzahub.127.0.0.1
  if (
    (hostname.endsWith('.localhost') || hostname.endsWith('.127.0.0.1')) &&
    parts.length >= 2
  ) {
    return parts[0]; // pizzahub
  }

  // Case: localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  // Case: pizzahub.myapp.com or deeper (e.g. foo.bar.myapp.com)
  if (parts.length >= 3) {
    return parts[0]; // pizzahub
  }

  return null;
};

export const getDomain = (): string => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost:8080';
  }
  
  // Handle production domain
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts.slice(1).join('.');
  }
  
  return hostname;
};

export const getFullDomain = (subdomain: string): string => {
  // For localhost development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${subdomain}.localhost:8080`;
  }
  
  // For production
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const baseDomain = parts.slice(-2).join('.'); // Get the last two parts (e.g., netlify.app)
  return `${subdomain}.${baseDomain}`;
};

export const getCurrentProtocol = (): string => {
  if (typeof window === 'undefined') return 'http:';
  return window.location.protocol;
}; 

export function changeRestaurantTenant(selectedRestaurantName: string) {
  if (!selectedRestaurantName) return;

  // Only change subdomain for customer pages
  if (!window.location.pathname.startsWith('/scan') && !window.location.pathname.startsWith('/order')) {
    return;
  }

  const subdomain = selectedRestaurantName.toLowerCase().replace(/\s+/g, '');
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;

  const isLocal = window.location.hostname.includes('localhost');
  const port = window.location.port ? `:${window.location.port}` : '';
  const baseDomain = isLocal ? `localhost${port}` : 'yourdomain.com'; 

  const newUrl = `${protocol}//${subdomain}.${baseDomain}${isLocal ? pathname : ''}`;
  
  // Store both auth states before navigation
  const firebaseAuthState = window.localStorage.getItem('firebase:authUser:app1-65be0:web');
  const customToken = window.localStorage.getItem('token');
  const currentRestaurantId = window.localStorage.getItem('currentRestaurantId');
  
  // Create a temporary storage for the auth states
  const tempStorage = {
    firebaseAuth: firebaseAuthState,
    customToken,
    currentRestaurantId
  };
  
  // Store the temporary data
  window.localStorage.setItem('tempAuthState', JSON.stringify(tempStorage));
  
  // Navigate to new subdomain
  window.location.href = newUrl;
}