export function ProductSkeleton({ isEn = false }: { isEn?: boolean }) {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="w-full h-[144px] bg-[#234745] relative overflow-hidden flex items-center justify-center">
         {/* Minimal header representation */}
      </div>
      <div className="w-full h-[56px] bg-white border-b border-[#9FB7AE] mb-8"></div>

      {/* Main Grid Skeleton */}
      <div dir={isEn ? 'ltr' : 'rtl'} className="max-w-[1400px] mx-auto px-4 md:px-8 pb-[64px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 animate-pulse">
        
        {/* RIGHT COLUMN: Image Gallery (Takes 4 cols, Right-most in RTL) */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative order-1">
          <div className="w-full aspect-[4/5] bg-gray-100 rounded-[20px]"></div>
          <div className="flex gap-4 overflow-hidden">
             <div className="w-20 h-20 bg-gray-100 rounded-[12px] shrink-0"></div>
             <div className="w-20 h-20 bg-gray-100 rounded-[12px] shrink-0"></div>
             <div className="w-20 h-20 bg-gray-100 rounded-[12px] shrink-0"></div>
             <div className="w-20 h-20 bg-gray-100 rounded-[12px] shrink-0"></div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Details (Takes 5 cols, Center) */}
        <div className="lg:col-span-5 flex flex-col gap-6 pt-2 order-2">
            <div className="w-24 h-4 bg-gray-100 rounded-[4px]"></div>
            <div className="w-3/4 h-10 bg-gray-100 rounded-[8px]"></div>
            
            {/* Rating row */}
            <div className="w-48 h-4 bg-gray-100 rounded-[4px]"></div>

            {/* Info Cards */}
            <div className="flex gap-3">
                <div className="flex-1 h-16 bg-gray-100 rounded-[12px]"></div>
                <div className="flex-1 h-16 bg-gray-100 rounded-[12px]"></div>
                <div className="flex-1 h-16 bg-gray-100 rounded-[12px]"></div>
            </div>

            {/* Price Box */}
            <div className="w-full h-24 bg-[#FEF8EB] rounded-[16px]"></div>

            {/* Description lines */}
            <div className="flex flex-col gap-3 mt-4">
                <div className="w-full h-4 bg-gray-100 rounded-[4px]"></div>
                <div className="w-full h-4 bg-gray-100 rounded-[4px]"></div>
                <div className="w-5/6 h-4 bg-gray-100 rounded-[4px]"></div>
            </div>

            {/* Tags */}
            <div className="flex gap-3 mt-6">
                <div className="w-24 h-10 bg-gray-100 rounded-[25px]"></div>
                <div className="w-24 h-10 bg-gray-100 rounded-[25px]"></div>
                <div className="w-24 h-10 bg-gray-100 rounded-[25px]"></div>
            </div>
        </div>

        {/* LEFT COLUMN: Sidebar (Takes 3 cols, Left-most in RTL) */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3">
            <div className="w-full bg-white rounded-[20px] p-4 border border-gray-100 flex flex-col gap-6 shadow-sm">
                <div className="w-full h-14 bg-gray-100 rounded-[16px]"></div>
                <div className="w-full h-10 bg-gray-100 rounded-[8px]"></div>
                <div className="w-full h-12 bg-gray-200 rounded-[25px] mt-4"></div>
            </div>
        </div>

      </div>
    </div>
  );
}
