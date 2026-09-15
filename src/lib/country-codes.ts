import { getCountries, getCountryCallingCode } from "libphonenumber-js";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRY_CODES = Array.from(
  getCountries()
    .map((country) => ({
      country,
      name: countryNames.of(country) ?? country,
      code: getCountryCallingCode(country),
    }))
    .reduce((countriesByCode, country) => {
      if (!countriesByCode.has(country.code)) countriesByCode.set(country.code, country);
      return countriesByCode;
    }, new Map<string, { country: string; name: string; code: string }>()),
).map(([, country]) => country)
  .sort((first, second) => Number(first.code) - Number(second.code));
