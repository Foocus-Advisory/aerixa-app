export type PhonePrefixOption = {
  label: string;
  value: string;
  keywords: string[];
};

export const phonePrefixes: PhonePrefixOption[] = [
  { label: "CM +237", value: "+237", keywords: ["cameroun", "cameroon", "cm", "+237"] },
  { label: "TD +235", value: "+235", keywords: ["tchad", "chad", "td", "+235"] },
  { label: "CF +236", value: "+236", keywords: ["centrafrique", "central african republic", "cf", "+236"] },
  { label: "CG +242", value: "+242", keywords: ["congo", "cg", "+242"] },
  { label: "CD +243", value: "+243", keywords: ["rdc", "dr congo", "cd", "+243"] },
  { label: "GQ +240", value: "+240", keywords: ["guinee equatoriale", "equatorial guinea", "gq", "+240"] },
  { label: "GA +241", value: "+241", keywords: ["gabon", "ga", "+241"] },
  { label: "ST +239", value: "+239", keywords: ["sao tome", "st", "+239"] },
  { label: "FR +33", value: "+33", keywords: ["france", "fr", "+33"] },
  { label: "BE +32", value: "+32", keywords: ["belgique", "belgium", "be", "+32"] },
  { label: "CA +1", value: "+1", keywords: ["canada", "ca", "+1"] },
  { label: "GB +44", value: "+44", keywords: ["royaume-uni", "uk", "gb", "+44"] },
] as const;
