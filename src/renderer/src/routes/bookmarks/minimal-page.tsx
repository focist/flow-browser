export default function MinimalBookmarksPage() {
  console.log('MinimalBookmarksPage: Component rendering');
  
  return (
    <div style={{ 
      padding: '40px', 
      color: 'white', 
      background: 'green', 
      fontSize: '24px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1>Minimal Bookmarks Page</h1>
        <p>Basic page component is working</p>
      </div>
    </div>
  );
}