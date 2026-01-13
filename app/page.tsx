import YearGrid from '@/components/YearGrid';

export default function HomePage() {
  return (
    <main className="h-screen w-screen px-4 py-4 md:px-8 md:py-8">
      <div className="flex h-full w-full">
        <YearGrid />
      </div>
    </main>
  );
}
