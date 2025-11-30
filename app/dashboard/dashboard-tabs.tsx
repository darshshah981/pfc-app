'use client';

import { useState, ReactNode } from 'react';
import BudgetView from './budget-view';

type TabId = 'spend-analysis' | 'budgeting';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'spend-analysis', label: 'Spend Analysis' },
  { id: 'budgeting', label: 'Budgeting' },
];

interface DashboardTabsProps {
  spendAnalysisContent: ReactNode;
}

export default function DashboardTabs({ spendAnalysisContent }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('spend-analysis');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6 flex border-b border-warm-200 dark:border-warm-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-sage-600 dark:text-sage-400'
                : 'text-warm-500 hover:text-warm-700 dark:text-warm-400 dark:hover:text-warm-200'
            }`}
          >
            {tab.label}
            {/* Active indicator */}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-500 dark:bg-sage-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'spend-analysis' && spendAnalysisContent}
        {activeTab === 'budgeting' && <BudgetView />}
      </div>
    </div>
  );
}
