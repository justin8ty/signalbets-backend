CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(poll_id, user_id),
    UNIQUE(poll_id, session_token)
);