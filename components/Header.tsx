export function Header() {
  return (
    <>
      {/* Top bar: dark, right-aligned links */}
      <div className="bg-bmw-dark h-9 flex items-center justify-end px-6 gap-5">
        <a href="#" className="text-xs text-gray-400 hover:text-white">Verkäufer-Login</a>
      </div>
      {/* Main header: BMW logo + nav */}
      <header className="bg-white border-b border-bmw-gray-border">
        <div className="max-w-layout mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full border-2 border-bmw-dark flex items-center justify-center text-[9px] font-black"
              style={{
                background:
                  'conic-gradient(#1c69d4 0deg 90deg, #fff 90deg 180deg, #1c69d4 180deg 270deg, #fff 270deg 360deg)',
              }}
            >
              BMW
            </div>
            <h1 className="text-xl font-light tracking-tight">
              BMW <span className="font-bold">Gebrauchtwagen</span>
            </h1>
          </div>
          <nav className="ml-auto flex gap-6">
            <a href="#" className="text-[13px] text-bmw-gray-text font-medium hover:text-bmw-blue">Modelle</a>
            <a href="#" className="text-[13px] text-bmw-gray-text font-medium hover:text-bmw-blue">Service</a>
          </nav>
        </div>
      </header>
    </>
  );
}
