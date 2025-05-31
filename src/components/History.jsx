import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function History({ refreshTrigger }) { // refreshTrigger to force re-fetch
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // If you implement auth, you would filter by user_id:
        // .eq('user_id', supabase.auth.user()?.id)
        const { data, error: fetchError } = await supabase
          .from('crop_images') // Ensure this is your table name
          .select('*')
          .order('created_at', { ascending: false }) // Show newest first
          .limit(20); // Optional: limit the number of results

        if (fetchError) throw fetchError;
        
        setHistory(data || []);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  if (loading) return <p>Loading history...</p>;
  if (error) return <p className="error-message">Error loading history: {error}</p>;

  return (
    <div className="history-container">
      <h2>Upload History & Analysis</h2>
      {history.length === 0 ? (
        <p>No images uploaded yet. Upload an image to see its analysis here.</p>
      ) : (
        <ul className="history-list">
          {history.map((item) => (
            <li key={item.id} className="history-item">
              <div className="history-item-image-container">
                <img 
                  src={item.image_url} 
                  alt={item.file_name || 'Uploaded crop'} 
                  onError={(e) => { e.target.style.display='none'; /* Hide if image fails to load */ }}
                />
              </div>
              <div className="history-item-details">
                <p><strong>Uploaded:</strong> {new Date(item.created_at).toLocaleString()}</p>
                <p><strong>File:</strong> {item.file_name || 'N/A'}</p>
                {item.ai_analysis_completed === null && !item.ai_error_message && (
                    <p className="status-pending"><strong>Status:</strong> Analysis pending or in progress...</p>
                )}
                {item.ai_analysis_completed === true && (
                  <div className="analysis-results">
                    <h4>AI Analysis:</h4>
                    <p><strong>Disease:</strong> {item.disease_name || 'Not identified'}</p>
                    <p><strong>Cure/Management:</strong> {item.cure_instructions || 'No specific instructions provided.'}</p>
                    <p><strong>Next Steps (if not curable):</strong> {item.next_steps_if_not_curable || 'No specific next steps provided.'}</p>
                  </div>
                )}
                {item.ai_analysis_completed === false && !item.ai_error_message && (
                    <p className="status-pending"><strong>Status:</strong> Analysis initiated...</p>
                )}
                {item.ai_error_message && (
                  <p className="error-message"><strong>Analysis Error:</strong> {item.ai_error_message}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default History;