/**
 * Calculate expiry status and colors based on the expiry date string (YYYY-MM-DD)
 */
export const getExpiryStatus = (expiryStr: string) => {
  if (!expiryStr) return { label: '🟢', color: 'var(--success)', text: 'ปกติ', isExpired: false };
  
  // Parse manually to ensure local time representation (avoid UTC mismatch)
  const [y, m, d] = expiryStr.split('-').map(Number);
  const expiryDate = new Date(y, m - 1, d);
  
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Calculate diff in days (midnight to midnight)
  const diffDays = Math.round((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: '⚫', color: '#666', text: 'หมดอายุแล้ว', isExpired: true };
  if (diffDays < 90) return { label: '🔴', color: 'var(--danger)', text: 'วิกฤต', isExpired: false };
  if (diffDays <= 180) return { label: '🟡', color: 'var(--warning)', text: 'เตือน', isExpired: false };
  return { label: '🟢', color: 'var(--success)', text: 'ปกติ', isExpired: false };
};

/**
 * Compress an image file and return a Base64 Data URI
 */
export const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

/**
 * Common numeric-only filter for input keydown
 */
export const numericOnly = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
};

/**
 * Auto-select content on focus for numeric inputs
 */
export const handleNumFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  if (e.target.value === '0' || e.target.value === '1') e.target.select();
};
