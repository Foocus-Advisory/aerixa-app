/**
 * List of countries by code with major cities.
 * Used for establishment configuration forms.
 */

export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES_BY_CODE: Country[] = [
  { code: "CM", name: "Cameroon" },
  { code: "TD", name: "Chad" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Democratic Republic of Congo" },
  { code: "CF", name: "Central African Republic" },
  { code: "GA", name: "Gabon" },
  { code: "CI", name: "Ivory Coast" },
  { code: "SN", name: "Senegal" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgium" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "PL", name: "Poland" },
];

export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  CM: ["Douala", "Yaoundé", "Bafoussam", "Kumba", "Buea", "Garoua", "Bamenda", "Maroua"],
  TD: ["N'Djamena", "Sarh", "Moundou", "Abéché", "Bongor", "Am-Timan", "Guelendeng", "Koumra"],
  CG: ["Brazzaville", "Pointe-Noire", "Dolisie", "Loubomo", "Impfondo", "Owando", "Kelle", "Mossendjo"],
  CD: ["Kinshasa", "Lubumbashi", "Kasumba", "Kolwezi", "Kisangani", "Matadi", "Likasi", "Bukavu"],
  CF: ["Bangui", "Berberati", "Bouar", "Bambari", "Birao", "Kaga-Bandoro", "Nola", "Batangafo"],
  GA: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Makokou", "Lambaréné", "Koulamoutou", "Tchibanga"],
  CI: ["Abidjan", "Yamoussoukro", "Bouaké", "Daloa", "Korhogo", "San-Pédraud", "Gagnoa", "Dimbokro"],
  SN: ["Dakar", "Thiès", "Kaolack", "Saint-Louis", "Tambacounda", "Ziguinchor", "Kolda", "Louga"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"],
  BE: ["Brussels", "Antwerp", "Ghent", "Charleroi", "Liege", "Brugge", "Namur", "Louvain"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Winnipeg", "Quebec City", "Edmonton"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Edinburgh", "Bristol"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego"],
  DE: ["Berlin", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Bilbao", "Alicante"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Tilburg", "Almere"],
  CH: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "St. Gallen", "Winterthur"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Wels"],
  SE: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg"],
  NO: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Kristiansand", "Fredrikstad", "Tromsø", "Sandefjord"],
  DK: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens"],
  PT: ["Lisbon", "Porto", "Amadora", "Braga", "Funchal", "Covilhã", "Covilhã", "Guarda"],
  GR: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos", "Ioannina", "Rethymno"],
  PL: ["Warsaw", "Krakow", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz"],
};
