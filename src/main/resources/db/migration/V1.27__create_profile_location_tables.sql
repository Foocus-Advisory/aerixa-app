-- V1.25__create_profile_location_tables.sql
-- Country/city catalog for profile forms (Central Africa)

CREATE TABLE IF NOT EXISTS auth.profile_countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(8) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth.profile_cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID NOT NULL REFERENCES auth.profile_countries(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_profile_cities_country_id ON auth.profile_cities(country_id);

INSERT INTO auth.profile_countries (code, name)
VALUES
  ('CM', 'Cameroun'),
  ('TD', 'Tchad'),
  ('CF', 'Republique centrafricaine'),
  ('CG', 'Republique du Congo'),
  ('CD', 'Republique democratique du Congo'),
  ('GQ', 'Guinee equatoriale'),
  ('GA', 'Gabon'),
  ('ST', 'Sao Tome-et-Principe')
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.profile_cities (country_id, name)
SELECT c.id, v.city_name
FROM auth.profile_countries c
JOIN (
  VALUES
    ('CM', 'Douala'),
    ('CM', 'Yaounde'),
    ('CM', 'Bafoussam'),
    ('CM', 'Garoua'),
    ('CM', 'Bamenda'),
    ('CM', 'Kribi'),

    ('TD', 'N''Djamena'),
    ('TD', 'Moundou'),
    ('TD', 'Sarh'),
    ('TD', 'Abeche'),

    ('CF', 'Bangui'),
    ('CF', 'Bimbo'),
    ('CF', 'Berberati'),
    ('CF', 'Bambari'),

    ('CG', 'Brazzaville'),
    ('CG', 'Pointe-Noire'),
    ('CG', 'Dolisie'),
    ('CG', 'Owando'),

    ('CD', 'Kinshasa'),
    ('CD', 'Lubumbashi'),
    ('CD', 'Goma'),
    ('CD', 'Bukavu'),
    ('CD', 'Mbuji-Mayi'),

    ('GQ', 'Malabo'),
    ('GQ', 'Bata'),
    ('GQ', 'Ebebiyin'),

    ('GA', 'Libreville'),
    ('GA', 'Port-Gentil'),
    ('GA', 'Franceville'),
    ('GA', 'Oyem'),

    ('ST', 'Sao Tome'),
    ('ST', 'Santo Antonio')
) AS v(country_code, city_name)
  ON v.country_code = c.code
ON CONFLICT (country_id, name) DO NOTHING;
