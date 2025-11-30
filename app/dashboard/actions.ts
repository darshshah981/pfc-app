'use server';

import { createClient } from '@/lib/supabase/server';

export async function upsertBudget(category: string, amount: number) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  if (!category || typeof category !== 'string') {
    throw new Error('Invalid category');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount');
  }

  // Check if budget already exists for this category and user
  const { data: existingBudget } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('normalized_category', category)
    .single();

  if (existingBudget) {
    // Update existing budget
    const { error: updateError } = await supabase
      .from('budgets')
      .update({ amount })
      .eq('id', existingBudget.id);

    if (updateError) {
      throw new Error(`Failed to update budget: ${updateError.message}`);
    }
  } else {
    // Insert new budget
    const { error: insertError } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        name: category,
        normalized_category: category,
        amount,
        period_type: 'monthly',
      });

    if (insertError) {
      throw new Error(`Failed to create budget: ${insertError.message}`);
    }
  }

  return { success: true };
}

export async function deleteBudget(category: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  if (!category || typeof category !== 'string') {
    throw new Error('Invalid category');
  }

  const { error: deleteError } = await supabase
    .from('budgets')
    .delete()
    .eq('user_id', user.id)
    .eq('normalized_category', category);

  if (deleteError) {
    throw new Error(`Failed to delete budget: ${deleteError.message}`);
  }

  return { success: true };
}

export async function updateTransactionCategory(
  transactionId: string,
  newCategory: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  if (!transactionId || typeof transactionId !== 'string') {
    throw new Error('Invalid transaction ID');
  }

  if (!newCategory || typeof newCategory !== 'string') {
    throw new Error('Invalid category');
  }

  const { data: transaction, error: updateError } = await supabase
    .from('transactions')
    .update({ normalized_category: newCategory })
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update transaction: ${updateError.message}`);
  }

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return { success: true, transaction };
}

export async function getAvailableCategories(): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Fetch distinct categories from user's transactions
  const { data, error } = await supabase
    .from('transactions')
    .select('normalized_category')
    .eq('user_id', user.id)
    .not('normalized_category', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  // Get unique categories and sort them
  const categories = [...new Set(data?.map((t) => t.normalized_category) || [])];
  return categories.sort();
}
