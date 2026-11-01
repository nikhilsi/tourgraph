/* TourGraph schema on D1: the five tables the API reads, copied from data/tourgraph.db (Nov 1, 2026). The other tables (destinations, city_profiles, city_readings, indexer_state, superlatives) feed the data pipeline and the iOS seed database and stay local. Three tours indexes the API never uses are left out (destination_id, indexed_at, and a duplicate of the product_code unique index). scripts/d1-load.mjs runs PRAGMA optimize after loading so the planner has statistics. */
CREATE TABLE tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      one_liner TEXT,
      destination_id TEXT,
      destination_name TEXT,
      country TEXT,
      continent TEXT,
      timezone TEXT,
      latitude REAL,
      longitude REAL,
      rating REAL,
      review_count INTEGER,
      from_price REAL,
      currency TEXT DEFAULT 'USD',
      duration_minutes INTEGER,
      image_url TEXT,
      image_urls_json TEXT,
      highlights_json TEXT,
      inclusions_json TEXT,
      viator_url TEXT,
      supplier_name TEXT,
      tags_json TEXT,
      weight_category TEXT,
      status TEXT DEFAULT 'active',
      indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      summary_hash TEXT,
      CHECK (rating >= 0 AND rating <= 5)
    );
/* (weight_category, status) instead of the source's weight_category alone, so the roulette random pick reads only this index. */
CREATE INDEX idx_tours_weight ON tours(weight_category, status);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_rating ON tours(rating DESC);
CREATE INDEX idx_tours_price ON tours(from_price);
CREATE INDEX idx_tours_timezone ON tours(timezone);
/* Added on D1 for the duration and review superlatives (inventory 2.4). */
CREATE INDEX idx_tours_duration ON tours(duration_minutes);
CREATE INDEX idx_tours_reviews ON tours(review_count);
CREATE TABLE six_degrees_chains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_from TEXT NOT NULL,
      city_to TEXT NOT NULL,
      chain_json TEXT NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP, slug TEXT,
      UNIQUE(city_from, city_to)
    );
CREATE INDEX idx_chains_slug ON six_degrees_chains(slug);
CREATE TABLE trivia_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      format TEXT NOT NULL,
      question_json TEXT NOT NULL,
      used_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE INDEX idx_trivia_pool_format ON trivia_pool(format);
CREATE INDEX idx_trivia_pool_used ON trivia_pool(used_date);
CREATE TABLE trivia_daily (
      date TEXT PRIMARY KEY,
      question_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE trivia_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      score INTEGER NOT NULL,
      session_hash TEXT NOT NULL,
      country_code TEXT,
      answers_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
CREATE INDEX idx_trivia_scores_date ON trivia_scores(date);
CREATE INDEX idx_trivia_scores_country ON trivia_scores(country_code);
/* Added on D1: one score per session per day, enforced by the database (inventory 3.3). */
CREATE UNIQUE INDEX idx_trivia_scores_session ON trivia_scores(date, session_hash);
