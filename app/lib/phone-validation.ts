export interface PhoneValidationResult {
  isValid: boolean;
  cleanLocalPhone: string;
  fullPhone: string;
  errorEn?: string;
  errorAr?: string;
}

export function sanitizePhoneInput(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return digits.slice(0, 10);
  }
  return digits.slice(0, 9);
}

export function validatePhoneNumber(
  rawPhone: string,
  countryCode: string = '+966',
): PhoneValidationResult {
  const digits = rawPhone.replace(/\D/g, '');
  const cleanCountryCode = countryCode.startsWith('+')
    ? countryCode
    : `+${countryCode.replace(/\D/g, '')}`;
  const countryDigits = cleanCountryCode.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      cleanLocalPhone: '',
      fullPhone: '',
      errorEn: 'Mobile number is required.',
      errorAr: 'رقم الجوال مطلوب.',
    };
  }

  // Reject typing full country code into input field when country code is selected in dropdown
  if (digits.startsWith(countryDigits + '5') && countryDigits === '966') {
    return {
      isValid: false,
      cleanLocalPhone: '',
      fullPhone: '',
      errorEn:
        'Please enter your mobile number without the country code (966). Start with 05 or 5.',
      errorAr: 'يرجى إدخال رقم الجوال بدون رمز الدولة (966). ابدأ بـ 05 أو 5.',
    };
  }

  if (digits.startsWith(countryDigits + '7') && countryDigits === '962') {
    return {
      isValid: false,
      cleanLocalPhone: '',
      fullPhone: '',
      errorEn:
        'Please enter your mobile number without the country code (962). Start with 07 or 7.',
      errorAr: 'يرجى إدخال رقم الجوال بدون رمز الدولة (962). ابدأ بـ 07 أو 7.',
    };
  }

  // SAUDI ARABIA (+966)
  if (cleanCountryCode === '+966') {
    // Explicitly reject 35, 035, or 966
    if (
      digits.startsWith('35') ||
      digits.startsWith('035') ||
      digits.startsWith('966')
    ) {
      return {
        isValid: false,
        cleanLocalPhone: '',
        fullPhone: '',
        errorEn:
          'Invalid Saudi mobile number. Numbers starting with 35 or 966 are not allowed. Must start with 05 or 5.',
        errorAr:
          'رقم جوال سعودي غير صحيح. الأرقام التي تبدأ بـ 35 أو 966 غير مقبولة. يجب أن يبدأ بـ 05 أو 5.',
      };
    }

    let localDigits = digits;
    if (localDigits.startsWith('00966')) localDigits = localDigits.substring(5);
    else if (localDigits.startsWith('966')) localDigits = localDigits.substring(3);

    if (localDigits.startsWith('05') && localDigits.length === 10) {
      const clean = localDigits.substring(1);
      return {
        isValid: true,
        cleanLocalPhone: clean,
        fullPhone: `+966${clean}`,
      };
    } else if (localDigits.startsWith('5') && localDigits.length === 9) {
      return {
        isValid: true,
        cleanLocalPhone: localDigits,
        fullPhone: `+966${localDigits}`,
      };
    } else {
      return {
        isValid: false,
        cleanLocalPhone: '',
        fullPhone: '',
        errorEn:
          'Saudi mobile number must start with 05 or 5 and consist of 9-10 digits.',
        errorAr:
          'يجب أن يبدأ رقم الجوال السعودي بـ 05 أو 5 ويتكون من 9 إلى 10 أرقام.',
      };
    }
  }

  // JORDAN (+962)
  if (cleanCountryCode === '+962') {
    // Explicitly reject 9627 or 35 or anything not starting with 07/7
    if (
      digits.startsWith('35') ||
      digits.startsWith('035') ||
      digits.startsWith('962')
    ) {
      return {
        isValid: false,
        cleanLocalPhone: '',
        fullPhone: '',
        errorEn:
          'Invalid Jordanian mobile number. Numbers starting with 35 or 962 are not allowed. Must start with 07 or 7.',
        errorAr:
          'رقم جوال أردني غير صحيح. الأرقام التي تبدأ بـ 35 أو 962 غير مقبولة. يجب أن يبدأ بـ 07 أو 7.',
      };
    }

    let localDigits = digits;
    if (localDigits.startsWith('00962')) localDigits = localDigits.substring(5);
    else if (localDigits.startsWith('962')) localDigits = localDigits.substring(3);

    if (localDigits.startsWith('07') && localDigits.length === 10) {
      const clean = localDigits.substring(1);
      return {
        isValid: true,
        cleanLocalPhone: clean,
        fullPhone: `+962${clean}`,
      };
    } else if (localDigits.startsWith('7') && localDigits.length === 9) {
      return {
        isValid: true,
        cleanLocalPhone: localDigits,
        fullPhone: `+962${localDigits}`,
      };
    } else {
      return {
        isValid: false,
        cleanLocalPhone: '',
        fullPhone: '',
        errorEn:
          'Jordanian mobile number must start with 07 or 7 and consist of 9-10 digits.',
        errorAr:
          'يجب أن يبدأ رقم الجوال الأردني بـ 07 أو 7 ويتكون من 9 إلى 10 أرقام.',
      };
    }
  }

  // UAE (+971)
  if (cleanCountryCode === '+971') {
    let localDigits = digits;
    if (localDigits.startsWith('00971')) localDigits = localDigits.substring(5);
    else if (localDigits.startsWith('971')) localDigits = localDigits.substring(3);

    if (localDigits.startsWith('05') && localDigits.length === 10) {
      const clean = localDigits.substring(1);
      return {
        isValid: true,
        cleanLocalPhone: clean,
        fullPhone: `+971${clean}`,
      };
    } else if (localDigits.startsWith('5') && localDigits.length === 9) {
      return {
        isValid: true,
        cleanLocalPhone: localDigits,
        fullPhone: `+971${localDigits}`,
      };
    } else {
      return {
        isValid: false,
        cleanLocalPhone: '',
        fullPhone: '',
        errorEn:
          'UAE mobile number must start with 05 or 5 and consist of 9-10 digits.',
        errorAr:
          'يجب أن يبدأ رقم الجوال الإماراتي بـ 05 أو 5 ويتكون من 9 إلى 10 أرقام.',
      };
    }
  }

  // General GCC / International fallback (+965, +974, +973, +968)
  let clean = digits;
  if (clean.startsWith('00' + countryDigits))
    clean = clean.substring(2 + countryDigits.length);
  else if (clean.startsWith(countryDigits))
    clean = clean.substring(countryDigits.length);
  if (clean.startsWith('0')) clean = clean.substring(1);

  if (clean.length < 7 || clean.length > 11) {
    return {
      isValid: false,
      cleanLocalPhone: '',
      fullPhone: '',
      errorEn: 'Invalid mobile number length for selected country.',
      errorAr: 'طول رقم الجوال غير صحيح للدولة المحددة.',
    };
  }

  return {
    isValid: true,
    cleanLocalPhone: clean,
    fullPhone: `${cleanCountryCode}${clean}`,
  };
}
