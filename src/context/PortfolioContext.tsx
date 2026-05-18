import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { Account, HistoryEntry, PortfolioData, Settings, StockSymbol, ZakatPayment } from '../types';
import { loadPortfolio, savePortfolio } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

// Actions
type Action =
  | { type: 'LOAD_DATA'; payload: PortfolioData }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_ACCOUNT'; payload: Omit<Account, 'id'> }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_HISTORY_ENTRY'; payload: HistoryEntry }
  | { type: 'DELETE_HISTORY_ENTRY'; payload: string }
  | { type: 'ADD_PAYMENT'; payload: { entryId: string; payment: ZakatPayment } }
  | { type: 'DELETE_PAYMENT'; payload: { entryId: string; paymentId: string } }
  | { type: 'SET_STOCK_SYMBOLS'; payload: StockSymbol[] };

function portfolioReducer(state: PortfolioData, action: Action): PortfolioData {
  switch (action.type) {
    case 'LOAD_DATA':
      return action.payload;

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: [
          ...state.accounts,
          { ...action.payload, id: uuidv4() },
        ],
      };

    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };

    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
      };

    case 'ADD_HISTORY_ENTRY':
      return {
        ...state,
        history: [action.payload, ...state.history],
      };

    case 'DELETE_HISTORY_ENTRY':
      return {
        ...state,
        history: state.history.filter((h) => h.id !== action.payload),
      };

    case 'ADD_PAYMENT':
      return {
        ...state,
        history: state.history.map((h) =>
          h.id === action.payload.entryId
            ? { ...h, payments: [...h.payments, action.payload.payment] }
            : h
        ),
      };

    case 'DELETE_PAYMENT':
      return {
        ...state,
        history: state.history.map((h) =>
          h.id === action.payload.entryId
            ? { ...h, payments: h.payments.filter((p) => p.id !== action.payload.paymentId) }
            : h
        ),
      };

    case 'SET_STOCK_SYMBOLS':
      return {
        ...state,
        stockSymbols: action.payload,
      };

    default:
      return state;
  }
}

interface PortfolioContextType {
  portfolio: PortfolioData;
  dispatch: React.Dispatch<Action>;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, dispatch] = useReducer(portfolioReducer, undefined, () => {
    const data = loadPortfolio();
    return data;
  });

  // Auto-save on every state change
  useEffect(() => {
    savePortfolio(portfolio);
  }, [portfolio]);

  return (
    <PortfolioContext.Provider value={{ portfolio, dispatch }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
