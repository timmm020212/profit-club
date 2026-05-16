-- Migration: Add salonId to existing tables and create salons/partner_users
-- Run this in Supabase SQL editor (Dashboard > SQL Editor)

-- Add salon_id to serviceCategories
ALTER TABLE "serviceCategories" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to serviceSubgroups
ALTER TABLE "serviceSubgroups" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to serviceVariants
ALTER TABLE "serviceVariants" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to masters
ALTER TABLE masters ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Add salon_id to workSlots
ALTER TABLE "workSlots" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;

-- Create salons table
CREATE TABLE IF NOT EXISTS salons (
  id serial PRIMARY KEY,
  slug varchar(100) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  description text,
  city varchar(100),
  address text,
  phone varchar(30),
  logo_url text,
  owner_name varchar(200),
  inn varchar(20),
  tariff varchar(20) NOT NULL DEFAULT 'basic',
  is_active boolean NOT NULL DEFAULT false,
  invite_token varchar(100) UNIQUE,
  created_at timestamp DEFAULT now()
);

-- Create partner_users table
CREATE TABLE IF NOT EXISTS partner_users (
  id serial PRIMARY KEY,
  salon_id integer NOT NULL REFERENCES salons(id),
  email varchar(200) NOT NULL UNIQUE,
  password_hash varchar(200) NOT NULL,
  created_at timestamp DEFAULT now()
);
