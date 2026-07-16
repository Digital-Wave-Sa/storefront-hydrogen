import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import patternBg from '~/assets/patteren-collection-header.svg';
// You should place the actual image in assets and update this path
import storyImage from '~/assets/patteren-collection-header.svg'; 

export const meta: MetaFunction = () => {
  return [
    { title: 'Our Story | Saadeddin | قصتنا | سعد الدين' },
    { name: 'description', content: 'Learn more about Saadeddin, our story, values, and history since 1919. | تعرف على المزيد حول حلويات سعد الدين، قصتنا، قيمنا، وتاريخنا منذ عام ١٩١٩.' },
    { property: 'og:title', content: 'Our Story | Saadeddin' },
    { property: 'og:description', content: 'Learn more about Saadeddin, our story, values, and history since 1919.' },
  ];
};

export default function AboutPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  
  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full min-h-[300px] bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-[80px] py-10">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center max-w-[800px]">
          <p className="text-[16px] font-medium opacity-80 mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Since 1919' : 'منذ عام ١٩١٩'}
          </p>
          <h1 className="font-bold" style={{ fontSize: '50px', fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '1.4', color: 'rgb(254, 248, 235)', marginTop: '10px', marginBottom: '1rem' }}>
            {isEn ? "More than a century of authentic taste" : 'أكثر من مئة عام من الطعم الأصيل'}
          </h1>
          <p className="text-[14px] md:text-[16px] font-medium opacity-80 mt-4" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
            {isEn ? 'A story that started with a stove and a secret recipe... and has become today part of the memory of every Saudi home.' : 'قصة بدأت بموقد ووصفة سرية، وأصبحت اليوم جزءاً من ذاكرة كل بيت سعودي'}
          </p>
        </div>
      </div>

      {/* Founder Section */}
      <div className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px] py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
          {/* Text Content */}
          <div className="space-y-4 text-right">
            <p className="text-[#B5945B] text-[16px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? "The Founder's Story" : 'قصة المؤسس'}
            </p>
            <h2 className="text-[32px] md:text-[44px] font-bold text-[#1F413F] !mt-1" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '1.2' }}>
              {isEn ? "It started with a man, a dream, and a small stove" : 'بدأت برجل وحلم وموقد صغير'}
            </h2>
            <div className="text-[#1F413F]/80 text-[16px] space-y-2 !mt-6" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.8' }}>
              <p>
                {isEn 
                  ? "In 1919, Saadeddin opened its doors for the first time in the heart of Riyadh. He had nothing in his hands but inherited family recipes and a sincere desire to make those around him happy with the finest sweets."
                  : "في عام ١٩١٩، فتح سعد الدين أبوابه لأول مرة في قلب الرياض. لم يكن في يده سوى وصفات عائلية موروثة ورغبة صادقة في إسعاد من حوله بأجود الحلويات."}
              </p>
              <p>
                {isEn 
                  ? "From a small shop in the old market, the dream grew to become today one of the largest dessert chains in the Kingdom of Saudi Arabia — with the same recipes and the same authentic taste."
                  : "من محل صغير في السوق القديم، نما الحلم ليصبح اليوم أحد أكبر سلاسل الحلويات في المملكة العربية السعودية — بنفس الوصفات وذات الطعم الأصيل."}
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="relative rounded-[24px] overflow-hidden shadow-xl">
            <img 
              src="/assets/images/about/our%20story.webp"
              alt="Our Story" 
              className="w-full h-[400px] object-cover"
            />
          </div>
        </div>
      </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-[#fef8eb] py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px]">
          <div className="text-center mb-16">
            <p className="text-[#B5945B] text-[16px] font-bold mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? "A Journey Through Time" : 'رحلة عبر الزمن'}
            </p>
            <h2 className="text-[38px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
              {isEn ? "Our Major Milestones" : 'محطاتنا الكبرى'}
            </h2>
          </div>

          {/* Timeline Grid */}
          <div className="relative" dir="ltr">
            {/* SVG Connections for Desktop */}
            {/* Watermark Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none text-[120px] md:text-[180px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", letterSpacing: '0.2em' }}>
              SAADEDDIN
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" viewBox="0 0 1300 600" fill="none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#1F413F" />
                </marker>
              </defs>
              
              {/* 1 -> 2 (Starts right of 1, ends top-left of 2, curves UP) */}
              <path d="M 320 150 Q 430 80 540 120" stroke="#1F413F" strokeWidth="2" strokeDasharray="6,6" markerEnd="url(#arrow)" />
              
              {/* 2 -> 3 (Starts bottom-right of 2, ends top-left of 3, curves DOWN) */}
              <path d="M 750 160 Q 860 200 950 130" stroke="#1F413F" strokeWidth="2" strokeDasharray="6,6" markerEnd="url(#arrow)" />
              
              {/* 3 -> 4 (Starts right of 3, ends right of 4, curves OUTWARD) */}
              <path d="M 1200 150 Q 1295 300 1200 450" stroke="#1F413F" strokeWidth="2" strokeDasharray="6,6" markerEnd="url(#arrow)" />
              
              {/* 4 -> 5 (Starts bottom-left of 4, ends bottom-right of 5, curves DOWN) */}
              <path d="M 960 480 Q 850 540 740 480" stroke="#1F413F" strokeWidth="2" strokeDasharray="6,6" markerEnd="url(#arrow)" />
              
              {/* 5 -> 6 (Starts top-left of 5, ends right of 6, curves UP) */}
              <path d="M 540 420 Q 430 360 320 450" stroke="#1F413F" strokeWidth="2" strokeDasharray="6,6" markerEnd="url(#arrow)" />
            </svg>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 md:gap-y-32 md:gap-x-16 relative z-10">
            {/* Timeline Item 1 */}
            <TimelineItem 
              number="1" 
              year="١٩١٩" 
              title={isEn ? "Foundation" : "التأسيس"} 
              desc={isEn ? "Opening the first shop in Riyadh with authentic family recipes." : "افتتاح أول محل في الرياض بوصفات عائلية أصيلة ورغبة في الإبداع"} 
              isEn={isEn}
            />
            {/* Timeline Item 2 */}
            <TimelineItem 
              number="2" 
              year="١٩٥٠" 
              title={isEn ? "First Expansion" : "التوسع الأول"} 
              desc={isEn ? "Opening 3 new branches in Riyadh and first expansion outside the city." : "افتتاح ٣ فروع جديدة في الرياض وأول انتشار خارج المدينة"} 
              isEn={isEn}
            />
            {/* Timeline Item 3 */}
            <TimelineItem 
              number="3" 
              year="١٩٧٠" 
              title={isEn ? "Kingdom Expansion" : "الانتشار في المملكة"} 
              desc={isEn ? "Opening branches in Jeddah and Dammam - the beginning of a national chain." : "افتتاح فروع في جدة والدمام — بداية التحول لسلسلة وطنية"} 
              isEn={isEn}
            />
            {/* Timeline Item 6 */}
            <TimelineItem 
              number="6" 
              year="٢٠٢٦" 
              title={isEn ? "Today" : "اليوم"} 
              desc={isEn ? "117 branches in 35 cities and millions of customers trust us daily." : "١١٧ فرع في ٣٥ مدينة وملايين العملاء يثقون بنا يومياً"} 
              isEn={isEn}
            />
            {/* Timeline Item 5 */}
            <TimelineItem 
              number="5" 
              year="٢٠١٥" 
              title={isEn ? "Digital & Delivery" : "الرقمي والتوصيل"} 
              desc={isEn ? "Launching the online delivery platform and exceeding 100 branches." : "إطلاق منصة التوصيل الإلكتروني وتجاوز ١٠٠ فرع"} 
              isEn={isEn}
            />
            {/* Timeline Item 4 */}
            <TimelineItem 
              number="4" 
              year="٢٠٠٠" 
              title={isEn ? "Major Leap" : "الطفرة الكبرى"} 
              desc={isEn ? "Exceeding 50 branches across the Kingdom and launching new assortments." : "تجاوز ٥٠ فرعاً في أنحاء المملكة وإطلاق تشكيلات جديدة"} 
              isEn={isEn}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-white py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px]">
          <div className="text-center mb-16">
            <p className="text-[#B5945B] text-[16px] font-bold mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? "Our Values" : 'قيمنا'}
            </p>
            <h2 className="text-[38px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
              {isEn ? "What Guides Us in Every Decision" : 'ما يحكمنا في كل قرار'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
            {/* Card 1 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Quality First" : 'الجودة أولاً'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "We choose the finest ingredients and refuse any compromise on quality whatever the cost." : 'نختار أجود المكونات ونرفض أي تنازل في الجودة مهما كانت التكلفة'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Authenticity & Heritage" : 'الأصالة والموروث'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "We preserve authentic recipes while embracing renewal that does not spoil the taste." : 'نحافظ على الوصفات الأصيلة مع احتضان التجديد الذي لا يُفسد الطعم'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Making People Happy" : 'إسعاد الناس'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "Every product we make aims to add a moment of joy and a beautiful memory." : 'كل منتج نصنعه هدفه أن يضيف لحظة فرح وذكرى جميلة'}
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Sustainability" : 'الاستدامة'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "We work to reduce environmental impact and develop sustainable packaging by 2030." : 'نعمل على تقليل الأثر البيئي وتطوير تغليف مستدام بحلول ٢٠٣٠'}
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Community" : 'المجتمع'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "We support local communities and believe our success is not complete without the success of those around us." : 'ندعم المجتمعات المحلية ونؤمن بأن نجاحنا لا يكتمل إلا بنجاح من حولنا'}
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-white border border-[#EAF2F1] rounded-[12px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
              <h3 className="text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? "Innovation" : 'الابتكار'}
              </h3>
              <p className="text-[#1F413F]/70 text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
                {isEn ? "We develop new products every season while maintaining the ancient spirit of heritage." : 'نطور منتجات جديدة كل موسم مع الحفاظ على روح التراث العريقة'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-[#1F413F] py-12">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white" dir="rtl">
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-[42px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>+١٠٠</p>
              <p className="text-[16px] text-white/80" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Years of Excellence" : "عام من التميز"}</p>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-[42px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>١١٧</p>
              <p className="text-[16px] text-white/80" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Branches in the Kingdom" : "فرع في المملكة"}</p>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-[42px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>5+ مليون</p>
              <p className="text-[16px] text-white/80" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Happy Customer" : "عميل سعيد"}</p>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-[42px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>٢٠٠+</p>
              <p className="text-[16px] text-white/80" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Premium Product" : "منتج فاخر"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ number, year, title, desc, isEn }: any) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* The Box */}
      <div className="w-[120px] h-[120px] bg-[#EAF2F1] flex items-center justify-center" style={{ borderRadius: '32px 32px 0 32px' }}>
        <div className="w-16 h-16 bg-[#234745] text-white rounded-full flex items-center justify-center text-2xl font-bold" style={{ fontFamily: 'sans-serif' }}>
          {number}
        </div>
      </div>
      
      {/* Content Outside */}
      <div className="space-y-2 max-w-[250px]">
        <p className="text-[#B5945B] text-[22px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{year}</p>
        <h3 className="text-[20px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>{title}</h3>
        <p className="text-[#1F413F]/70 text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
          {desc}
        </p>
      </div>
    </div>
  );
}
