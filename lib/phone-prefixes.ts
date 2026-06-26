export type PhonePrefixOption = {
  label: string;
  value: string;
  countryCode: string;
  keywords: string[];
};

export const phonePrefixes: PhonePrefixOption[] = [
  { label: "CM +237", value: "+237", countryCode: "CM", keywords: ["cameroun", "cameroon", "cm", "+237"] },
  { label: "TD +235", value: "+235", countryCode: "TD", keywords: ["tchad", "chad", "td", "+235"] },
  { label: "CF +236", value: "+236", countryCode: "CF", keywords: ["centrafrique", "central african republic", "cf", "+236"] },
  { label: "CG +242", value: "+242", countryCode: "CG", keywords: ["congo", "cg", "+242"] },
  { label: "CD +243", value: "+243", countryCode: "CD", keywords: ["rdc", "dr congo", "cd", "+243"] },
  { label: "GQ +240", value: "+240", countryCode: "GQ", keywords: ["guinee equatoriale", "equatorial guinea", "gq", "+240"] },
  { label: "GA +241", value: "+241", countryCode: "GA", keywords: ["gabon", "ga", "+241"] },
  { label: "ST +239", value: "+239", countryCode: "ST", keywords: ["sao tome", "st", "+239"] },
  { label: "FR +33", value: "+33", countryCode: "FR", keywords: ["france", "fr", "+33"] },
  { label: "BE +32", value: "+32", countryCode: "BE", keywords: ["belgique", "belgium", "be", "+32"] },
  { label: "CA +1", value: "+1", countryCode: "CA", keywords: ["canada", "ca", "+1"] },
  { label: "GB +44", value: "+44", countryCode: "GB", keywords: ["royaume-uni", "uk", "gb", "+44"] },
  { label: "CI +225", value: "+225", countryCode: "CI", keywords: ["cote d'ivoire", "ivory coast", "ci", "+225"] },
  { label: "SN +221", value: "+221", countryCode: "SN", keywords: ["senegal", "sn", "+221"] },
  { label: "DZ +213", value: "+213", countryCode: "DZ", keywords: ["algerie", "algeria", "dz", "+213"] },
  { label: "MA +212", value: "+212", countryCode: "MA", keywords: ["maroc", "morocco", "ma", "+212"] },
] as const;
