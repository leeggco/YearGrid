import YearGrid from '@/components/YearGrid';

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center">
        <YearGrid />
      </div>
    </main>
  );
}

