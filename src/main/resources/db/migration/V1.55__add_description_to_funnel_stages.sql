-- V1.55__add_description_to_funnel_stages.sql
-- Ajoute un champ description optionnel aux etapes funnel

ALTER TABLE auth.funnel_stages
    ADD COLUMN IF NOT EXISTS description TEXT NULL;
