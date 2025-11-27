import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpendSummary from '@/app/dashboard/spend-summary';

// Mock data
const mockSummaryData = {
  startDate: '2024-11-01T00:00:00.000Z',
  endDate: '2024-12-01T00:00:00.000Z',
  period: 'current_month',
  sharedOnly: false,
  accountId: null,
  totalAmount: 1500.00,
  accounts: [
    {
      accountId: 'acc-1',
      accountName: 'Personal Checking',
      type: 'depository',
      subtype: 'checking',
      totalAmount: 1000.00,
      transactionCount: 5,
    },
    {
      accountId: 'acc-2',
      accountName: 'Shared Credit Card',
      type: 'credit',
      subtype: 'credit card',
      totalAmount: 500.00,
      transactionCount: 3,
    },
  ],
};

const mockTransactionsData = {
  ...mockSummaryData,
  accountId: 'acc-1',
  totalAmount: 1000.00,
  accounts: [mockSummaryData.accounts[0]],
  transactions: [
    {
      id: 'tx-1',
      date: '2024-11-15',
      description: 'Amazon',
      amount: 150.00,
      isShared: false,
    },
    {
      id: 'tx-2',
      date: '2024-11-14',
      description: 'Grocery Store',
      amount: 85.50,
      isShared: true,
    },
    {
      id: 'tx-3',
      date: '2024-11-10',
      description: 'Gas Station',
      amount: 45.00,
      isShared: false,
    },
  ],
};

const mockSharedOnlyData = {
  ...mockSummaryData,
  sharedOnly: true,
  totalAmount: 500.00,
  accounts: [mockSummaryData.accounts[1]],
};

// Setup fetch mock
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

describe('SpendSummary', () => {
  describe('Account Selection', () => {
    it('renders account list and allows clicking to view transactions', async () => {
      // First render shows summary
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Both accounts should be visible
      expect(screen.getByText('Shared Credit Card')).toBeInTheDocument();

      // Mock the transaction fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactionsData),
      });

      // Click on Personal Checking account
      const accountButton = screen.getByRole('button', { name: /Personal Checking/i });
      fireEvent.click(accountButton);

      // Wait for transactions to load
      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeInTheDocument();
      });

      // Verify transactions are displayed
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
      expect(screen.getByText('Gas Station')).toBeInTheDocument();

      // Verify shared badge is shown for shared transaction
      expect(screen.getByText('Shared')).toBeInTheDocument();
    });

    it('shows active state for selected account', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactionsData),
      });

      // Click account
      const accountButton = screen.getByRole('button', { name: /Personal Checking/i });
      fireEvent.click(accountButton);

      // After clicking, the UI shows "Viewing transactions for:" header with account name
      await waitFor(() => {
        expect(screen.getByText('Viewing transactions for:')).toBeInTheDocument();
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });
    });

    it('allows clearing selection to go back to summary view', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Select account
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactionsData),
      });

      const accountButton = screen.getByRole('button', { name: /Personal Checking/i });
      fireEvent.click(accountButton);

      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeInTheDocument();
      });

      // Mock the summary fetch for clearing
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      // Click clear button
      const clearButton = screen.getByRole('button', { name: /close|clear|back/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        // Transactions should no longer be visible
        expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
      });

      // Both accounts should be visible again
      expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      expect(screen.getByText('Shared Credit Card')).toBeInTheDocument();
    });
  });

  describe('Shared Only Filter', () => {
    it('respects shared-only toggle when viewing transactions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Enable shared only
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSharedOnlyData),
      });

      const sharedToggle = screen.getByRole('switch', { name: /shared/i });
      fireEvent.click(sharedToggle);

      await waitFor(() => {
        // Check the fetch was called with sharedOnly=true
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('sharedOnly=true')
        );
      });
    });
  });

  describe('Period Selector', () => {
    it('refetches data when period changes while viewing transactions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Select account first
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactionsData),
      });

      const accountButton = screen.getByRole('button', { name: /Personal Checking/i });
      fireEvent.click(accountButton);

      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeInTheDocument();
      });

      // Change period
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockTransactionsData,
          period: 'last_30_days',
        }),
      });

      const periodSelect = screen.getByRole('combobox');
      fireEvent.change(periodSelect, { target: { value: 'last_30_days' } });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('period=last_30_days')
        );
        // Should still include accountId
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('accountId=acc-1')
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while fetching transactions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Create a delayed promise for transaction fetch
      let resolveTransactions: (value: unknown) => void;
      const transactionPromise = new Promise((resolve) => {
        resolveTransactions = resolve;
      });

      fetchMock.mockReturnValueOnce({
        ok: true,
        json: () => transactionPromise,
      });

      const accountButton = screen.getByRole('button', { name: /Personal Checking/i });
      fireEvent.click(accountButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Resolve the promise
      resolveTransactions!(mockTransactionsData);

      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeInTheDocument();
      });
    });
  });
});
