export default function TestBookmarksRoute() {
  console.log('TEST: BookmarksRoute is rendering!');
  return (
    <div style={{ 
      padding: '40px', 
      color: 'white', 
      background: 'red', 
      fontSize: '24px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1>TEST: Bookmarks Route Works!</h1>
        <p>If you see this, the route is properly connected.</p>
      </div>
    </div>
  );
}