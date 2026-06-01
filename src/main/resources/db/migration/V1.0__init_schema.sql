-- V1.0__init_schema.sql
-- Initialisation du schéma de base

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_status AS ENUM ('ACTIVE', 'DISABLED', 'PENDING_VERIFICATION');
CREATE TYPE device_type AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');
CREATE TYPE audit_action AS ENUM ('LOGIN', 'LOGOUT', 'REFRESH', 'REVOKED', 'EXPIRED', 'CONFLICT', 'CREATE', 'UPDATE', 'DELETE');

-- Schemas
CREATE SCHEMA IF NOT EXISTS auth;

-- Base tables seront créées dans les migrations suivantes
