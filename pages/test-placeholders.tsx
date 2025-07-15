import React from 'react';

export default function TestPlaceholders() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Placeholder Image Test</h1>
      <p>Testing the placeholder API endpoints:</p>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        <div>
          <h3>40x40 Avatar Placeholder</h3>
          <img 
            src="/api/placeholder/40/40" 
            alt="40x40 placeholder" 
            style={{ border: '1px solid #ccc' }}
          />
        </div>
        
        <div>
          <h3>150x150 Profile Placeholder</h3>
          <img 
            src="/api/placeholder/150/150" 
            alt="150x150 placeholder" 
            style={{ border: '1px solid #ccc' }}
          />
        </div>
        
        <div>
          <h3>200x100 Banner Placeholder</h3>
          <img 
            src="/api/placeholder/200/100" 
            alt="200x100 placeholder" 
            style={{ border: '1px solid #ccc' }}
          />
        </div>
        
        <div>
          <h3>300x200 Card Placeholder</h3>
          <img 
            src="/api/placeholder/300/200" 
            alt="300x200 placeholder" 
            style={{ border: '1px solid #ccc' }}
          />
        </div>
      </div>
      
      <div style={{ marginTop: '40px' }}>
        <h2>Error Handling Test</h2>
        <p>This should show an error (dimensions too large):</p>
        <img 
          src="/api/placeholder/3000/3000" 
          alt="Error test" 
          style={{ border: '1px solid #ccc' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling.style.display = 'block';
          }}
        />
        <div style={{ display: 'none', color: 'red', padding: '10px', border: '1px solid red' }}>
          Error: Image failed to load (expected for dimensions too large)
        </div>
      </div>
    </div>
  );
}
