import { useState } from 'react';
import { createRestaurant } from '../services/restaurantService';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: createError } = await createRestaurant(name, slug || name.toLowerCase().replace(/\s+/g, '-'));

    setLoading(false);

    if (createError) {
      setError(createError);
      return;
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6B35]">FoodWave</p>
        <h1 className="mt-3 text-2xl font-semibold">Create your restaurant</h1>
        <p className="mt-2 text-sm text-slate-400">Set up the first restaurant for your team and start using the operating system.</p>

        {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-slate-300" htmlFor="restaurant-name">Restaurant name</label>
            <input
              id="restaurant-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:border-[#FF6B35]"
              placeholder="The Green Table"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-300" htmlFor="restaurant-slug">Restaurant slug</label>
            <input
              id="restaurant-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm outline-none transition focus:border-[#FF6B35]"
              placeholder="the-green-table"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e55a24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating restaurant...' : 'Create restaurant'}
          </button>
        </form>
      </div>
    </div>
  );
}
