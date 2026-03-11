import { useState, useEffect } from 'react';
import { Send, Loader2, IndianRupee, Tag, Store, Calendar, TrendingUp, ShoppingBag } from 'lucide-react';
import './index.css';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/expenses`);
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      setError('Error loading expenses. Is the backend running?');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sentence.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence })
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to process expense');
      }
      
      setExpenses([responseData, ...expenses]);
      setSentence('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <TrendingUp size={36} className="text-primary" />
            <h1>Smart Expenses</h1>
          </div>
          <p className="subtitle">Just type naturally. Our AI extracts the JSON.</p>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard-grid">
          <section className="input-section">
            <div className="card new-expense-card glass-panel">
              <h2>Add New Expense</h2>
              <form onSubmit={handleSubmit} className="expense-form">
                <div className="input-wrapper">
                  <textarea
                    value={sentence}
                    onChange={(e) => setSentence(e.target.value)}
                    placeholder='e.g., "Bought a coffee and sandwich at Starbucks for 450 rupees..."'
                    rows={4}
                    disabled={loading}
                    autoFocus
                  />
                  <div className="input-glow"></div>
                </div>
                {error && <div className="error-message">{error}</div>}
                
                <button type="submit" className="submit-btn" disabled={loading || !sentence.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="spinner" size={20} />
                      <span>Extracting JSON via LLM...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Categorize Expense</span>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            <div className="card overview-card">
              <div className="overview-header">
                <h3>Total Spending</h3>
              </div>
              <div className="total-amount">
                <IndianRupee size={34} />
                <span>{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="overview-sub">Across {expenses.length} distinct transactions</p>
            </div>
          </section>

          <section className="table-section">
            <div className="card table-card glass-panel">
              <div className="table-header-row">
                <h2>Recent Transactions</h2>
                <span className="badge">{expenses.length} Records</span>
              </div>
              
              {expenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✨</div>
                  <p>Database is empty</p>
                  <span>Your native MongoDB collection has no records yet. Enter a sentence above to populate it.</span>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="expense-table">
                    <thead>
                      <tr>
                        <th><div className="th-content"><Calendar size={16}/> Date</div></th>
                        <th><div className="th-content"><Store size={16}/> Merchant</div></th>
                        <th><div className="th-content"><ShoppingBag size={16}/> Item</div></th>
                        <th><div className="th-content"><Tag size={16}/> Category</div></th>
                        <th className="amount-col"><div className="th-content"><IndianRupee size={16}/> Amount</div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense._id}>
                          <td className="date-cell">
                            {new Date(expense.date).toLocaleDateString('en-GB', { 
                              day: '2-digit', month: 'short', year: 'numeric' 
                            })}
                          </td>
                          <td className="merchant-cell">{expense.merchant}</td>
                          <td className="item-cell">{expense.item || "N/A"}</td>
                          <td className="category-cell">
                            <span className={`category-badge category-${expense.category?.toLowerCase()}`}>
                              {expense.category}
                            </span>
                          </td>
                          <td className="amount-cell">₹{expense.amount?.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
