
import { getAvailableConfigs, getAllMoves } from './actions';
import DamageCalculator from '@/components/DamageCalculator';

export default async function Home() {
  const configs = await getAvailableConfigs();
  const allMoves = await getAllMoves();

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-pink-500 selection:text-white">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 py-12">
        <DamageCalculator configs={configs} allMoves={allMoves} />
      </div>
    </main>
  );
}
