CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_option_id ON votes(option_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_session_token ON votes(session_token);
CREATE INDEX idx_options_poll_id ON options(poll_id);
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);