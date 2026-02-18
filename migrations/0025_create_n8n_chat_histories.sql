-- Migration: create n8n_chat_histories table
-- Adds a simple chat history table used by n8n integration

CREATE TABLE IF NOT EXISTS n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id varchar(255) NOT NULL,
    message jsonb NOT NULL
);
