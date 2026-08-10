import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { MealDetail, FoodType } from '../../types';

type MealDetailPayload = {
  food_type: FoodType;
  wet_amount_grams: number | null;
  brand_wet: string | null;
  dry_amount_grams: number | null;
  brand_dry: string | null;
  raw_amount_grams: number | null;
  brand_raw: string | null;
  notes: string | null;
};

export function useMealDetails(dogId: string) {
  const [mealDetails, setMealDetails] = useState<MealDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMealDetails();
  }, [dogId]);

  async function fetchMealDetails() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMealDetails([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('meal_details')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id);
    if (!error && data) setMealDetails(data);
    setLoading(false);
  }

  function getMealDetail(completionId: string): MealDetail | undefined {
    return mealDetails.find(m => m.completion_id === completionId);
  }

  async function addMealDetail(completionId: string, dogId: string, details: MealDetailPayload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('meal_details')
      .upsert(
        { completion_id: completionId, dog_id: dogId, owner_id: user.id, ...details },
        { onConflict: 'completion_id' }
      )
      .select()
      .single();
    if (!error && data) {
      setMealDetails(prev => [...prev.filter(m => m.completion_id !== completionId), data]);
    }
    return { data, error };
  }

  async function deleteMealDetail(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('meal_details')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setMealDetails(prev => prev.filter(m => m.id !== id));
    return { error };
  }

  return { mealDetails, loading, getMealDetail, addMealDetail, deleteMealDetail, refetch: fetchMealDetails };
}
