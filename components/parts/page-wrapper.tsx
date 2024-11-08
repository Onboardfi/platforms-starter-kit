// components/parts/page-wrapper.tsx

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 border border-white/[0.02] overflow-y-scroll no-scrollbar w-full sm:max-w-[calc(100vw-272px)] 
      rounded-xl bg-neutral-900/50 backdrop-blur-md h-full 
      transition-all duration-300 shine shadow-dream">
      <div className="relative">
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 
          group-hover:opacity-100 transition-opacity duration-500 rounded-xl"
          style={{ filter: "blur(40px)" }}
        />
        {children}
      </div>
    </div>
  );
}