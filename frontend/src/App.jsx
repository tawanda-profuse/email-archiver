import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const BackendUrl = 'http://localhost:5000';
  const [emails, setEmails] = useState([]);
  const [page, setPage] = useState(1);
  const [maxResults] = useState(10);
  const [totalEmails, setTotalEmails] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BackendUrl}/poll`, {
        params: { maxResults, page },
      });
      setEmails(res.data);
      setTotalEmails(res.data.length);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [page]);

  const totalPages = Math.ceil(totalEmails / maxResults);

  return (
    <main>
      <div className="flex-ribbon">
        <h2>📥 Gmail Inbox</h2>
        <button onClick={fetchEmails} title="Refresh Inbox">
          🔃
        </button>
      </div>
      {loading ? (
        <div className="column">
          {new Array(4).fill(null).map((_, index) => (
            <span
              key={index}
              style={{ backgroundColor: '#ccc', minHeight: '2rem' }}
            ></span>
          ))}
        </div>
      ) : (
        <>
          <div className="column">
            {emails.map((msg) => (
              <span key={msg.id}>
                <strong>{msg.subject}</strong> — {msg.from} (
                {new Date(msg.date).toLocaleDateString('en-US', {
                  dateStyle: 'full',
                })}
                )
                {msg.isFresh && (
                  <span style={{ color: 'green', fontWeight: 'bold' }}>
                    {' '}
                    [New]
                  </span>
                )}
              </span>
            ))}
          </div>

          <div>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              ⬅️ Prev
            </button>

            <span style={{ margin: '0 1rem' }}>
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next ➡️
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default App;
