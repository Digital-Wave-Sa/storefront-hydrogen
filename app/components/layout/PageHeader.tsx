import patternBg from '/images/second-bg-pattern.svg';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    isEn: boolean;
    children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, isEn, children }: PageHeaderProps) {
    return (
        <header className="relative w-full bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-5 md:px-[80px] py-10 mt-[-1px]">
            <div
                className="absolute inset-0 pointer-events-none opacity-100 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
                style={{
                    backgroundImage: `url(${patternBg})`,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            <div className="relative z-10 w-full flex flex-col items-center justify-center text-center mt-4">
                {subtitle && (
                    <p className="text-[#BBCFCD] !text-[12px] md:!text-[18px] font-normal mb-4" style={{ fontFamily: isEn ? "'Inter', sans-serif" : "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                        {subtitle}
                    </p>
                )}
                <h1 className="!text-[26px] md:!text-[50px] font-bold text-center" style={{ fontFamily: isEn ? "'Inter', sans-serif" : "'EnglishDigits', 'Bahij Janna', sans-serif", fontWeight: 700, lineHeight: '100%', letterSpacing: '0%', color: '#FEF8EB', marginTop: '1rem', marginBottom: '1rem' }}>
                    {title}
                </h1>
                {children}
            </div>
        </header>
    );
}
