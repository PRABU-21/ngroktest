import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const FinanceContext = createContext();

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Set up axios defaults
  useEffect(() => {
    const token = getAuthToken();
    console.log('Auth token:', token);
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Authorization header set');
    } else {
      console.log('No auth token found');
    }
  }, []);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping data load');
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const [transactionsRes, budgetsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/transactions', { headers }),
        axios.get('http://localhost:5000/api/budgets', { headers })
      ]);
      
      setTransactions(transactionsRes.data);
      setBudgets(budgetsRes.data);
    } catch (error) {
      console.error('Error loading user data:', error);
      // If user is not authenticated, don't show error
      if (error.response?.status !== 401) {
        console.error('Failed to load user data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Transaction functions
  const addTransaction = async (transactionData) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      const response = await axios.post('http://localhost:5000/api/transactions', {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
        date: new Date(transactionData.date)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setTransactions(prev => [response.data, ...prev]);
      return response.data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id, transactionData) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/transactions/${id}`, {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
        date: new Date(transactionData.date)
      });
      
      setTransactions(prev => 
        prev.map(transaction => 
          transaction._id === id ? response.data : transaction
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${id}`);
      setTransactions(prev => prev.filter(transaction => transaction._id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  // Budget functions
  const addBudget = async (budgetData) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('User not authenticated');
      }
      
      console.log('Sending budget data:', budgetData);
      console.log('Using token:', token);
      
      const response = await axios.post('http://localhost:5000/api/budgets', {
        ...budgetData,
        monthlyLimit: parseFloat(budgetData.monthlyLimit)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Budget created successfully:', response.data);
      setBudgets(prev => [response.data, ...prev]);
      return response.data;
    } catch (error) {
      console.error('Error adding budget:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  };

  const updateBudget = async (id, budgetData) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/budgets/${id}`, {
        ...budgetData,
        monthlyLimit: parseFloat(budgetData.monthlyLimit)
      });
      
      setBudgets(prev => 
        prev.map(budget => 
          budget._id === id ? response.data : budget
        )
      );
      return response.data;
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  };

  const deleteBudget = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/budgets/${id}`);
      setBudgets(prev => prev.filter(budget => budget._id !== id));
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  };

  // Get transactions by category for budget calculations
  const getTransactionsByCategory = (category) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return transactions.filter(transaction => 
      transaction.category === category && 
      transaction.type === "expense" &&
      new Date(transaction.date).getMonth() === currentMonth &&
      new Date(transaction.date).getFullYear() === currentYear
    );
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.currentSpent, 0);
  const totalRemaining = totalBudget - totalSpent;

  const value = {
    // State
    transactions,
    budgets,
    loading,
    
    // Transaction functions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    
    // Budget functions
    addBudget,
    updateBudget,
    deleteBudget,
    
    // Utility functions
    getTransactionsByCategory,
    loadUserData,
    
    // Calculated values
    totalIncome,
    totalExpenses,
    netBalance,
    totalBudget,
    totalSpent,
    totalRemaining
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};
