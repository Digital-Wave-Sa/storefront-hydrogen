import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import { useState, useRef } from 'react';
import patternBg from '/images/second-bg-pattern.svg';
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

  const [activeStep, setActiveStep] = useState(0);

  const milestones = [
    {
      number: "1",
      year: isEn ? "1919" : "١٩١٩",
      title: isEn ? "Foundation" : "التأسيس",
      desc: isEn ? "Opening the first shop in Riyadh with authentic family recipes." : "افتتاح أول محل في الرياض بوصفات عائلية أصيلة ورغبة في الإبداع"
    },
    {
      number: "2",
      year: isEn ? "1950" : "١٩٥٠",
      title: isEn ? "First Expansion" : "التوسع الأول",
      desc: isEn ? "Opening 3 new branches in Riyadh and first expansion outside the city." : "افتتاح ٣ فروع جديدة في الرياض وأول انتشار خارج المدينة"
    },
    {
      number: "3",
      year: isEn ? "1970" : "١٩٧٠",
      title: isEn ? "Kingdom Expansion" : "الانتشار في المملكة",
      desc: isEn ? "Opening branches in Jeddah and Dammam - the beginning of a national chain." : "افتتاح فروع في جدة والدمام — بداية التحول لسلسلة وطنية"
    },
    {
      number: "4",
      year: isEn ? "2000" : "٢٠٠٠",
      title: isEn ? "Major Leap" : "الطفرة الكبرى",
      desc: isEn ? "Exceeding 50 branches across the Kingdom and launching new assortments." : "تجاوز ٥٠ فرعاً في أنحاء المملكة وإطلاق تشكيلات جديدة"
    },
    {
      number: "5",
      year: isEn ? "2015" : "٢٠١٥",
      title: isEn ? "Digital & Delivery" : "الرقمي والتوصيل",
      desc: isEn ? "Launching the online delivery platform and exceeding 100 branches." : "إطلاق منصة التوصيل الإلكتروني وتجاوز ١٠٠ فرع"
    },
    {
      number: "6",
      year: isEn ? "2026" : "٢٠٢٦",
      title: isEn ? "Today" : "اليوم",
      desc: isEn ? "117 branches in 35 cities and millions of customers trust us daily." : "١١٧ فرع في ٣٥ مدينة وملايين العملاء يثقون بنا يومياً"
    }
  ];
  const values = [
    {
      id: 1,
      title: isEn ? "Quality First" : 'الجودة أولاً',
      desc: isEn ? "We choose the finest ingredients and refuse any compromise on quality whatever the cost." : 'نختار أجود المكونات ونرفض أي تنازل في الجودة مهما كانت التكلفة'
    },
    {
      id: 2,
      title: isEn ? "Authenticity & Heritage" : 'الأصالة والموروث',
      desc: isEn ? "We preserve authentic recipes while embracing renewal that does not spoil the taste." : 'نحافظ على الوصفات الأصيلة مع احتضان التجديد الذي لا يُفسد الطعم'
    },
    {
      id: 3,
      title: isEn ? "Making People Happy" : 'إسعاد الناس',
      desc: isEn ? "Every product we make aims to add a moment of joy and a beautiful memory." : 'كل منتج نصنعه هدفه أن يضيف لحظة فرح وذكرى جميلة'
    },
    {
      id: 4,
      title: isEn ? "Sustainability" : 'الاستدامة',
      desc: isEn ? "We work to reduce environmental impact and develop sustainable packaging by 2030." : 'نعمل على تقليل الأثر البيئي وتطوير تغليف مستدام بحلول ٢٠٣٠'
    },
    {
      id: 5,
      title: isEn ? "Community" : 'المجتمع',
      desc: isEn ? "We support local communities and believe our success is not complete without the success of those around us." : 'ندعم المجتمعات المحلية ونؤمن بأن نجاحنا لا يكتمل إلا بنجاح من حولنا'
    },
    {
      id: 6,
      title: isEn ? "Innovation" : 'الابتكار',
      desc: isEn ? "We develop new products every season while maintaining the ancient spirit of heritage." : 'نطور منتجات جديدة كل موسم مع الحفاظ على روح Tراث العريقة'
    }
  ];
  const progressPercent = (activeStep / (milestones.length - 1)) * 100;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'next' | 'prev') => {
    if (scrollRef.current) {
      const cardWidth = window.innerWidth < 768 ? 304 : 344;
      const isRtl = !isEn;
      const multiplier = direction === 'next' ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1);
      const scrollAmount = cardWidth * multiplier;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-[20px] py-10">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center max-w-[800px]">
          <p className="!text-[14px] md:!text-[16px] font-normal text-[#9FB7AE] mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Since 1919' : 'منذ عام ١٩١٩'}
          </p>
          <h1 className="font-bold text-[26px] md:text-[50px]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '1.4', color: 'rgb(254, 248, 235)', marginTop: '10px', marginBottom: '1rem' }}>
            {isEn ? "More than a century of authentic taste" : 'أكثر من مئة عام من الطعم الأصيل'}
          </h1>
          <p className="!text-[14px] md:!text-[16px] font-normal text-[#9FB7AE] mt-4" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
            {isEn ? 'A story that started with a stove and a secret recipe... and has become today part of the memory of every Saudi home.' : 'قصة بدأت بموقد ووصفة سرية، وأصبحت اليوم جزءاً من ذاكرة كل بيت سعودي'}
          </p>
        </div>
      </div>

      {/* Founder Section */}
      <div className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px] py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-20 items-center">
            {/* Text Content */}
            <div className="space-y-4 text-right order-2 md:order-1">
              <p className="text-[#906B51] text-[14px] font-normal !mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? "The Founder's Story" : 'قصة المؤسس'}
              </p>
              <h2 className="text-[26px] md:text-[44px] font-bold text-[#1F413F] !mt-1" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '1.2' }}>
                {isEn ? "It started with a man, a dream, and a small stove" : 'بدأت برجل وحلم وموقد صغير'}
              </h2>
              <div className="text-[#7D7D7D] !font-normal !text-[16px] space-y-2 !mt-6" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.8' }}>
                <p className='!mb-2 !font-normal'>
                  {isEn
                    ? "In 1919, Saadeddin opened its doors for the first time in the heart of Riyadh. He had nothing in his hands but inherited family recipes and a sincere desire to make those around him happy with the finest sweets."
                    : "في عام ١٩١٩، فتح سعد الدين أبوابه لأول مرة في قلب الرياض. لم يكن في يده سوى وصفات عائلية موروثة ورغبة صادقة في إسعاد من حوله بأجود الحلويات."}
                </p>
                <p className='!mb-2 !text-[16px] !font-normal'>
                  {isEn
                    ? "From a small shop in the old market, the dream grew to become today one of the largest dessert chains in the Kingdom of Saudi Arabia — with the same recipes and the same authentic taste."
                    : "من محل صغير في السوق القديم، نما الحلم ليصبح اليوم أحد أكبر سلاسل الحلويات في المملكة العربية السعودية — بنفس الوصفات وذات الطعم الأصيل."}
                </p>
              </div>
            </div>

            {/* Image */}
            <div className="relative overflow-hidden order-1 md:order-2 shadow-xl">
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
      <div className="bg-[#fef8eb] pt-8 pb-2 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px]">
          <div className="text-center mb-8">
            <p className="text-[#B5945B] text-[16px] font-bold mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? "A Journey Through Time" : 'رحلة عبر الزمن'}
            </p>
            <h2 className="text-[38px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
              {isEn ? "Our Major Milestones" : 'محطاتنا الكبرى'}
            </h2>
          </div>

          {/* Desktop view: Grid with SVG path connectors */}
          <div className="relative w-full max-w-[1300px] mx-auto py-16 hidden md:block" dir={isEn ? 'ltr' : 'rtl'}>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none text-[120px] md:text-[180px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", letterSpacing: '0.2em' }}>
              SAADEDDIN
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1300 600" fill="none">
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

            <div className="grid grid-cols-3 gap-y-16 md:gap-y-32 md:gap-x-16 relative z-10">
              {/* Timeline Item 1 */}
              <TimelineItem
                number="1"
                year={isEn ? "1919" : "١٩١٩"}
                title={isEn ? "Foundation" : "التأسيس"}
                desc={isEn ? "Opening the first shop in Riyadh with authentic family recipes." : "افتتاح أول محل في الرياض بوصفات عائلية أصيلة ورغبة في الإبداع"}
                isEn={isEn}
              />
              {/* Timeline Item 2 */}
              <TimelineItem
                number="2"
                year={isEn ? "1950" : "١٩٥٠"}
                title={isEn ? "First Expansion" : "التوسع الأول"}
                desc={isEn ? "Opening 3 new branches in Riyadh and first expansion outside the city." : "افتتاح ٣ فروع جديدة في الرياض وأول انتشار خارج المدينة"}
                isEn={isEn}
              />
              {/* Timeline Item 3 */}
              <TimelineItem
                number="3"
                year={isEn ? "1970" : "١٩٧٠"}
                title={isEn ? "Kingdom Expansion" : "الانتشار في المملكة"}
                desc={isEn ? "Opening branches in Jeddah and Dammam - the beginning of a national chain." : "افتتاح فروع في جدة والدمام — بداية التحول لسلسلة وطنية"}
                isEn={isEn}
              />
              {/* Timeline Item 6 */}
              <TimelineItem
                number="6"
                year={isEn ? "2026" : "٢٠٢٦"}
                title={isEn ? "Today" : "اليوم"}
                desc={isEn ? "117 branches in 35 cities and millions of customers trust us daily." : "١١٧ فرع في ٣٥ مدينة وملايين العملاء يثقون بنا يومياً"}
                isEn={isEn}
              />
              {/* Timeline Item 5 */}
              <TimelineItem
                number="5"
                year={isEn ? "2015" : "٢٠١٥"}
                title={isEn ? "Digital & Delivery" : "الرقمي والتوصيل"}
                desc={isEn ? "Launching the online delivery platform and exceeding 100 branches." : "إطلاق منصة التوصيل الإلكتروني وتجاوز ١٠٠ فرع"}
                isEn={isEn}
              />
              {/* Timeline Item 4 */}
              <TimelineItem
                number="4"
                year={isEn ? "2000" : "٢٠٠٠"}
                title={isEn ? "Major Leap" : "الطفرة الكبرى"}
                desc={isEn ? "Exceeding 50 branches across the Kingdom and launching new assortments." : "تجاوز ٥٠ فرعاً في أنحاء المملكة وإطلاق تشكيلات جديدة"}
                isEn={isEn}
              />
            </div>
          </div>

          {/* Mobile view: Horizontal slider */}
          <div className="relative w-full mx-auto block md:hidden" dir={isEn ? 'ltr' : 'rtl'}>
            {/* Scroll Container */}
            <div
              ref={scrollRef}
              className="flex flex-row gap-3 lg:gap-8 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-8 px-4 w-full"
              style={{ scrollBehavior: 'smooth' }}
            >
              {milestones.map((milestone) => (
                <div
                  key={milestone.number}
                  className="w-[240px] shrink-0 snap-center flex flex-col items-center text-center space-y-6 p-2"
                >
                  {/* The Custom Shape Box */}
                  <div
                    className="w-[100px] h-[100px] bg-[#EAF2F1] flex items-center justify-center shadow-inner"
                    style={{
                      borderRadius: isEn ? '32px 32px 0px 32px' : '32px 32px 32px 0px'
                    }}
                  >
                    <div className="w-12 h-12 bg-[#234745] text-white rounded-full flex items-center justify-center text-xl font-bold" style={{ fontFamily: 'sans-serif' }}>
                      {milestone.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <p className="text-[#B5945B] text-[24px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {milestone.year}
                    </p>
                    <h3 className="text-[20px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                      {milestone.title}
                    </h3>
                    <p className="text-[#1F413F]/70 text-[14px] leading-relaxed min-h-[60px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {milestone.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <style dangerouslySetInnerHTML={{
              __html: `
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}} />
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
            <h2 className="text-[38px] font-bold !mb-0 text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
              {isEn ? "What Guides Us in Every Decision" : 'ما يحكمنا في كل قرار'}
            </h2>
          </div>

          <div
            className="flex flex-row md:grid md:grid-cols-3 overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x snap-mandatory gap-6 md:gap-8 py-6 px-4 md:px-0"
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {values.map((val) => (
              <div
                key={val.id}
                className="w-[240px] md:w-auto shrink-0 md:shrink snap-center bg-white border-[1.5px] border-[#234745]/60 hover:border-[#234745] rounded-[12px] p-6 text-center flex flex-col items-center justify-center space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                <h3 className="text-[20px] md:text-[24px] font-bold text-[#1F413F]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                  {val.title}
                </h3>
                <p className="text-[#9FB7AE] !text-[12px] md:!text-[16px] leading-relaxed" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-[#234745] py-12">
        <div className="max-w-[1400px] mx-auto px-4 md:px-[80px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white" dir="rtl">
            {/* Stat 1 */}
            <div className="flex flex-col gap-3 items-center justify-center space-y-2">
              <p className="!text-[26px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>+100</p>
              <p className="!text-[12px] text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Years of Excellence" : "عام من التميز"}</p>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col gap-3 items-center justify-center space-y-2">
              <p className="!text-[26px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>117</p>
              <p className="!text-[12px] text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Branches in the Kingdom" : "فرع في المملكة"}</p>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col gap-3 items-center justify-center space-y-2">
              <p className="!text-[26px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>5+ مليون</p>
              <p className="!text-[12px] text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Happy Customer" : "عميل سعيد"}</p>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col gap-3 items-center justify-center space-y-2">
              <p className="!text-[26px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>200+</p>
              <p className="!text-[12px] text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? "Premium Product" : "منتج فاخر"}</p>
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
      <div className="w-[120px] h-[120px] bg-[#EAF2F1] flex items-center justify-center" style={{ borderRadius: isEn ? '32px 32px 0 32px' : '32px 32px 32px 0' }}>
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
