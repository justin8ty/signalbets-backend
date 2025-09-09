CREATE TABLE polls (
    id SERIAL PRIMARY KEY,
    question VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);