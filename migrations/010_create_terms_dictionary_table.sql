-- Migration: Create terms_dictionary table
-- Provides a reference dictionary for culinary terms and alternate names.

create extension if not exists "uuid-ossp";

create table if not exists terms_dictionary (
  id uuid primary key default uuid_generate_v4(),
  terms varchar not null,
  alternate_names varchar,
  definition varchar
);

