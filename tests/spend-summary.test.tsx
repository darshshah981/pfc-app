import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpendSummary from '@/app/dashboard/spend-summary';

// Mock data matching the new API response structure
const mockSummaryData = {
  startDate: '2024-11-01T00:00:00.000Z',
  endDate: '2024-12-01T00:00:00.000Z',
  period: 'current_month',
  sharedOnly: false,
  totalAmount: 1500.0,
  categories: ['Food & Dining', 'Shopping', 'Gas & Fuel'],
  accounts: [
    {
      accountId: 'acc-1',
      accountName: 'Personal Checking',
      type: 'depository',
      subtype: 'checking',
      isSharedSource: false,
      totalAmount: 1000.0,
      transactionCount: 3,
      transactions: [
        {
          id: 'tx-1',
          date: '2024-11-15',
          description: 'Amazon',
          amount: 150.0,
          normalizedCategory: 'Shopping',
          isShared: false,
        },
        {
          id: 'tx-2',
          date: '2024-11-14',
          description: 'Grocery Store',
          amount: 85.5,
          normalizedCategory: 'Food & Dining',
          isShared: true,
        },
        {
          id: 'tx-3',
          date: '2024-11-10',
          description: 'Gas Station',
          amount: 45.0,
          normalizedCategory: 'Gas & Fuel',
          isShared: false,
        },
      ],
    },
    {
      accountId: 'acc-2',
      accountName: 'Shared Credit Card',
      type: 'credit',
      subtype: 'credit card',
      isSharedSource: true,
      totalAmount: 500.0,
      transactionCount: 2,
      transactions: [
        {
          id: 'tx-4',
          date: '2024-11-16',
          description: 'Restaurant',
          amount: 300.0,
          normalizedCategory: 'Food & Dining',
          isShared: true,
        },
        {
          id: 'tx-5',
          date: '2024-11-12',
          description: 'Utilities',
          amount: 200.0,
          normalizedCategory: null,
          isShared: true,
        },
      ],
    },
  ],
};

const mockSharedOnlyData = {
  ...mockSummaryData,
  sharedOnly: true,
  totalAmount: 500.0,
  accounts: [mockSummaryData.accounts[1]],
};

// Setup fetch mock
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock;
});

describe('SpendSummary', () => {
  describe('Default Filter State', () => {
    it('loads with current_month period and sharedOnly=false by default', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('period=current_month')
        );
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('sharedOnly=false')
        );
      });

      // Verify the period dropdown shows "Current Month"
      const periodSelect = screen.getByRole('combobox');
      expect(periodSelect).toHaveValue('current_month');

      // Verify shared toggle is off
      const sharedToggle = screen.getByRole('switch', { name: /shared/i });
      expect(sharedToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Account Accordion', () => {
    it('renders account list with expand/collapse functionality', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Both accounts should be visible
      expect(screen.getByText('Shared Credit Card')).toBeInTheDocument();

      // Transactions should not be visible initially
      expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
      expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
    });

    it('expands account to show transactions when clicked', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Click on Personal Checking account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      expect(accountButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(accountButton);

      // Account should now be expanded
      expect(accountButton).toHaveAttribute('aria-expanded', 'true');

      // Transactions should be visible
      expect(screen.getByText('Amazon')).toBeInTheDocument();
      expect(screen.getByText('Grocery Store')).toBeInTheDocument();
      expect(screen.getByText('Gas Station')).toBeInTheDocument();
    });

    it('collapses expanded account when clicked again', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });

      // Expand
      fireEvent.click(accountButton);
      expect(screen.getByText('Amazon')).toBeInTheDocument();

      // Collapse
      fireEvent.click(accountButton);
      expect(accountButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
    });

    it('allows multiple accounts to be expanded simultaneously', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand first account
      const personalButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(personalButton);

      // Expand second account
      const sharedButton = screen.getByRole('button', {
        name: /Shared Credit Card/i,
      });
      fireEvent.click(sharedButton);

      // Both accounts should be expanded
      expect(personalButton).toHaveAttribute('aria-expanded', 'true');
      expect(sharedButton).toHaveAttribute('aria-expanded', 'true');

      // Transactions from both accounts should be visible
      expect(screen.getByText('Amazon')).toBeInTheDocument();
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    it('shows Shared Source badge for accounts marked as shared source', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Shared Credit Card')).toBeInTheDocument();
      });

      expect(screen.getByText('Shared Source')).toBeInTheDocument();
    });
  });

  describe('Category Dropdown', () => {
    it('shows category dropdown with options from API', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Find category dropdown for Amazon transaction
      const categoryDropdown = screen.getByLabelText(/Category for Amazon/i);
      expect(categoryDropdown).toBeInTheDocument();
      expect(categoryDropdown).toHaveValue('Shopping');

      // Verify all category options exist
      expect(
        screen.getAllByRole('option', { name: 'Food & Dining' }).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole('option', { name: 'Shopping' }).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole('option', { name: 'Gas & Fuel' }).length
      ).toBeGreaterThan(0);
    });

    it('triggers update when category is changed', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Change category for Amazon transaction
      const categoryDropdown = screen.getByLabelText(/Category for Amazon/i);
      fireEvent.change(categoryDropdown, { target: { value: 'Food & Dining' } });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/transactions/tx-1',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('normalized_category'),
          })
        );
      });
    });
  });

  describe('Shared Checkbox', () => {
    it('shows shared checkbox for each transaction', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Check shared checkbox for Grocery Store (isShared: true)
      const groceryCheckbox = screen.getByRole('checkbox', {
        name: /Mark Grocery Store as shared/i,
      });
      expect(groceryCheckbox).toBeChecked();

      // Check shared checkbox for Amazon (isShared: false)
      const amazonCheckbox = screen.getByRole('checkbox', {
        name: /Mark Amazon as shared/i,
      });
      expect(amazonCheckbox).not.toBeChecked();
    });

    it('triggers mutation when shared checkbox is clicked', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Click shared checkbox for Amazon
      const amazonCheckbox = screen.getByRole('checkbox', {
        name: /Mark Amazon as shared/i,
      });
      fireEvent.click(amazonCheckbox);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/transactions/tx-1',
          expect.objectContaining({
            method: 'PATCH',
            body: expect.stringContaining('"is_shared":true'),
          })
        );
      });
    });

    it('shows optimistic update immediately', async () => {
      let resolveUpdate: () => void;
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      });

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockReturnValueOnce({
          ok: true,
          json: () => updatePromise.then(() => ({ success: true })),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Click shared checkbox for Amazon
      const amazonCheckbox = screen.getByRole('checkbox', {
        name: /Mark Amazon as shared/i,
      });

      // Initial state: not shared
      expect(amazonCheckbox).not.toBeChecked();

      fireEvent.click(amazonCheckbox);

      // Optimistic update: immediately shows as checked
      expect(amazonCheckbox).toBeChecked();

      // Resolve the update
      resolveUpdate!();
    });
  });

  describe('Shared Only Filter', () => {
    it('refetches data with sharedOnly=true when toggle is enabled', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSharedOnlyData),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Enable shared only
      const sharedOnlyToggle = screen.getByRole('switch', {
        name: /Toggle shared only/i,
      });
      fireEvent.click(sharedOnlyToggle);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('sharedOnly=true')
        );
      });
    });
  });

  describe('Period Selector', () => {
    it('refetches data when period changes', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSummaryData,
              period: 'last_30_days',
            }),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Change period
      const periodSelect = screen.getByRole('combobox');
      fireEvent.change(periodSelect, { target: { value: 'last_30_days' } });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('period=last_30_days')
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state while fetching data', async () => {
      let resolveData: (value: unknown) => void;
      const dataPromise = new Promise((resolve) => {
        resolveData = resolve;
      });

      fetchMock.mockReturnValueOnce({
        ok: true,
        json: () => dataPromise,
      });

      render(<SpendSummary />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve the promise
      resolveData!(mockSummaryData);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Loading should be gone
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when fetch fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to fetch spend summary')
        ).toBeInTheDocument();
      });
    });

    it('rolls back optimistic update on mutation failure', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      // Click shared checkbox for Amazon
      const amazonCheckbox = screen.getByRole('checkbox', {
        name: /Mark Amazon as shared/i,
      });

      // Initial state: not shared
      expect(amazonCheckbox).not.toBeChecked();

      fireEvent.click(amazonCheckbox);

      // Optimistic update: shows as checked
      expect(amazonCheckbox).toBeChecked();

      // Wait for rollback after failure
      await waitFor(() => {
        expect(amazonCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Category Rollup', () => {
    it('shows collapsible category section with count', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Should show collapsed category toggle with count
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      expect(categoryToggle).toBeInTheDocument();
      expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('displays category totals and counts when expanded', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand category rollup
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoryToggle);

      // Should show category breakdown
      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
      expect(screen.getByText('Shopping')).toBeInTheDocument();
      expect(screen.getByText('Gas & Fuel')).toBeInTheDocument();
    });

    it('shows Uncategorized bucket for transactions without category', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand category rollup
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoryToggle);

      // tx-5 has normalizedCategory: null, so should show Uncategorized
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });

    it('shows transaction count per category', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand category rollup
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoryToggle);

      // Food & Dining has 2 transactions (tx-2 and tx-4)
      // Find all category rows and verify the first one (highest amount) has correct count
      const categoryRows = screen.getAllByTestId('category-name');
      // First category should be Food & Dining with 2 transactions
      const firstCategoryRow = categoryRows[0].closest('div')?.parentElement;
      expect(firstCategoryRow?.textContent).toContain('Food & Dining');
      expect(firstCategoryRow?.textContent).toContain('2 transactions');
    });

    it('sorts categories by total amount descending', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand category rollup
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoryToggle);

      // Get all category names in order
      const categoryElements = screen.getAllByTestId('category-name');
      const categoryNames = categoryElements.map((el) => el.textContent);

      // Food & Dining ($385.50) should come before Uncategorized ($200), Shopping ($150), Gas & Fuel ($45)
      expect(categoryNames[0]).toBe('Food & Dining');
    });

    it('collapses category list when toggle clicked again', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryData),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand category rollup
      const categoryToggle = screen.getByRole('button', { name: /categories/i });
      fireEvent.click(categoryToggle);
      expect(screen.getByText('Food & Dining')).toBeInTheDocument();

      // Collapse
      fireEvent.click(categoryToggle);
      expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Food & Dining')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no accounts/transactions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockSummaryData,
            totalAmount: 0,
            accounts: [],
            categories: [],
          }),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(
          screen.getByText('No transactions found for this period.')
        ).toBeInTheDocument();
      });
    });

    it('shows empty transaction message when account has no transactions', async () => {
      const dataWithEmptyAccount = {
        ...mockSummaryData,
        accounts: [
          {
            ...mockSummaryData.accounts[0],
            transactionCount: 0,
            transactions: [],
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(dataWithEmptyAccount),
      });

      render(<SpendSummary />);

      await waitFor(() => {
        expect(screen.getByText('Personal Checking')).toBeInTheDocument();
      });

      // Expand account
      const accountButton = screen.getByRole('button', {
        name: /Personal Checking/i,
      });
      fireEvent.click(accountButton);

      expect(
        screen.getByText('No transactions for this account')
      ).toBeInTheDocument();
    });
  });
});
