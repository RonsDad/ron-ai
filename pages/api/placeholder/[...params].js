// API endpoint to generate placeholder images
// Handles requests like /api/placeholder/40/40 or /api/placeholder/150/150

export default function handler(req, res) {
  const { params } = req.query;
  
  // Extract width and height from params array
  const width = parseInt(params[0]) || 150;
  const height = parseInt(params[1]) || width; // Use width as height if not provided
  
  // Validate dimensions
  if (width > 2000 || height > 2000 || width < 10 || height < 10) {
    return res.status(400).json({ 
      error: 'Invalid dimensions. Width and height must be between 10 and 2000 pixels.' 
    });
  }

  // Calculate appropriate font size based on image size
  const fontSize = Math.max(10, Math.min(width, height) / 8);
  
  // Generate a simple SVG placeholder with better styling
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" stroke-width="1" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" fill="#6b7280" text-anchor="middle" dy=".3em" font-weight="500">
    ${width}×${height}
  </text>
</svg>`;

  // Set appropriate headers
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for images
  
  // Send the SVG
  res.status(200).send(svg);
}
