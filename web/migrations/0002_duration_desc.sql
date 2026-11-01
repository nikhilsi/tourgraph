/* Review R7: the superlatives now break ties by id, as the droplet's SQLite
   did. Descending indexes on duration and review count keep "longest" and
   "most reviewed" index walks (ties come out in ascending id). Statistics
   are refreshed after the change. */
DROP INDEX idx_tours_duration;
CREATE INDEX idx_tours_duration ON tours(duration_minutes DESC);
DROP INDEX idx_tours_reviews;
CREATE INDEX idx_tours_reviews ON tours(review_count DESC);
PRAGMA optimize=0x10002;
