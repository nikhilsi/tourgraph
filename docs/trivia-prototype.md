# Daily Trivia — Design & Question Prototypes

---
**Purpose**: Phase 1b design doc. Question formats, game mechanics, and gamification strategy.
**Data sources**: 136K tours, 910 city profiles, 491 chains, 205 countries, 7 continents
**Status**: Step 1 complete (prototypes). Ready for Step 2 (generation pipeline).
---

## The Game

**Daily Challenge**: 5 questions, same for everyone (the Wordle model). Everyone gets the same 5 questions each day. Shared experience creates conversation: "Did you get #3 right?"

**Practice Mode**: Unlimited play. Random questions from any format. No streaks, but still scored. For when you want more.

**Scoring**: Each question earns 0 or 1 point. Daily score is 0-5. Streak = consecutive days with at least 1 correct.

---

## The 7 Question Formats

### Format 1: Higher or Lower (Price)

*"Which costs more?"* — Two real tours, tap the one you think is pricier.

**Q1:** Which costs more?
- A) Private Romantic NYC Helicopter Charter with Champagne (New York City) — 30 minutes
- B) 3-Day Merzouga Desert Group Tour with Camel Trek (Marrakech) — 3 days

**Answer:** A) $4,465 vs B) ~$200. Thirty minutes of champagne helicoptering costs more than 3 days in the Sahara.

**Q2:** Which costs more?
- A) Porto's #1 Walking Tour (Porto, Portugal) — 4.9★, 1,041 reviews
- B) Cheap Half Giza Pyramids, Sphinx & 9 Pyramids with Camel (Giza, Egypt) — 4.9★

**Answer:** B) $1.00 vs A) $0.90. Both under a dollar. Porto wins the race to zero.

**Why it works**: Price intuition is fun to test. Our data has massive range ($0.90 to $3.2M). Surprising combos create "no way!" moments.

**Generation**: Pure SQL. Pick two tours with interesting price contrast (big gap, or surprisingly close). Filter for tours with images and decent ratings.

---

### Format 2: Where in the World?

*"Which city has this tour?"* — Show the one-liner (not the title — title might contain the city name). Pick from 4 cities. Photo revealed after answer as a reward moment.

**Q3:** "Swim with manatees so gentle, you'll wonder if you're the one being hugged."
- A) Cancun, Mexico
- B) Crystal River, USA
- C) Cairns, Australia
- D) Zanzibar, Tanzania

**Answer:** B) Crystal River, USA. [Photo of manatee swim tour revealed]

**Q4:** "Defy gravity and waterfalls simultaneously — basically, you'll be falling in love with nature."
- A) Bali, Indonesia
- B) Queenstown, New Zealand
- C) Seattle, USA
- D) Medellín, Colombia

**Answer:** C) Seattle, USA. Not where you'd expect extreme canyoneering. [Photo revealed]

**Why it works**: One-liners give personality without giving away location. Photo reveal is the payoff. "I had no idea that existed there."

**Generation**: Pure SQL. Pick a tour with a good one-liner and image. Wrong answers: 3 cities from the same continent or similar tourism profile (all beach destinations, all adventure hubs, etc.) so they're plausible but wrong. Filter out one-liners that mention the city/country name.

---

### Format 3: Real or Fake Tour?

*"Which of these is a real tour you can actually book?"* — One real title, one convincing fake.

**Q5:** Which is REAL?
- A) "Route 66, Oatman, Nelson Ghost Town Small Group Tour from Las Vegas"
- B) "Midnight Truffle Hunting with Trained Pigs in the Tuscan Hills"

**Answer:** A is real (4.9★, Las Vegas). B sounds plausible but is made up.

**Q6:** Which is REAL?
- A) "Step into a simpler time with the Amish, where horse-drawn carriages beat traffic jams" (Lancaster, PA)
- B) "Underground Cheese Aging Tour in Abandoned Swiss Military Bunkers" (Gruyères, Switzerland)

**Answer:** A is real (Premium Amish Country Tour, Lancaster).

**Why it works**: Our tour titles are already wild. Tests "truth is stranger than fiction" instinct. The crowd-pleaser format — highest share potential.

**Generation**: Haiku generates fake tour titles matching real tour naming patterns for a given destination. Batch pre-generate a pool of fakes (e.g., 500 fakes across diverse destinations). Refresh pool periodically.

---

### Format 4: The Numbers Game

*"Guess the number"* — Multiple choice with a surprising stat.

**Q7:** The most-reviewed tour on Viator has how many reviews?
- A) 8,200
- B) 16,400
- C) 27,300
- D) 41,600

**Answer:** D) 41,629 — "Best DMZ Tour Korea from Seoul" (4.9★).

**Q8:** What's the average tour price in Uganda?
- A) $150
- B) $550
- C) $1,200
- D) $3,100

**Answer:** D) $3,113 — gorilla trekking permits alone cost $700+.

**Q9:** How many countries have tours on TourGraph?
- A) 87
- B) 142
- C) 205
- D) 316

**Answer:** C) 205. More countries than the UN has members.

**Why it works**: Numbers are inherently surprising. "I had no idea Uganda was the most expensive" teaches something real.

**Generation**: Pure SQL aggregates. Template library of stat queries (most reviewed, avg price by country, tour count by city/country/continent, rating distributions). Wrong answers: plausible multiples/fractions of the real number.

---

### Format 5: Odd One Out

*"Three of these tours are in the same city. Which one isn't?"* — Uses one-liners instead of titles to avoid giving away the city name.

**Q10:** Three tours are in the same city. Which is the odd one out?
- A) "Pedal through riverside paradise where hills, history, and electric vibes collide."
- B) "Seven hours through Georgia's soul: ancient churches, wild history, pure wonder."
- C) "Brush strokes meet Moorish masterpieces as you paint your own memory."
- D) "Navigate a beautifully chaotic soul from the cool comfort of a private escape pod."

**Answer:** B) is in Tbilisi, Georgia. The other three... you'd have to guess. That's the fun.

**Q11:** Three tours, same country. Which doesn't belong?
- A) "Agafay Desert sunset dinner with camel ride and live show"
- B) "Ancient medina walking tour with a local guide"
- C) "Sahara Desert 2-day tour from the capital"
- D) "Imperial cities full-day tour"

**Answer:** C) is from Tunis, Tunisia. The others are Morocco.

**Why it works**: Using one-liners keeps it challenging. Tests geography through cultural feel rather than explicit names.

**Generation**: Pure SQL. Pick 3 tours from one city/country, 1 from a plausible neighbor (same continent, similar tourism vibe). Filter to one-liners that don't mention the destination.

---

### Format 6: The Connection (Chain-Inspired)

*"What theme connects these two cities?"* — Uses our Six Degrees chain data.

**Q12:** Tokyo and Varanasi are connected in our Six Degrees chain. What theme links them?
- A) Street food
- B) Craftsmanship
- C) Nightlife
- D) Wildlife

**Answer:** B) Craftsmanship. Tokyo calligraphy workshop connects to Varanasi's sacred writing traditions.

**Q13:** What's the theme connecting Barcelona and Buenos Aires?
- A) Dance
- B) Architecture
- C) Hiking
- D) Sacred spaces

**Answer:** A) Dance. Flamenco meets tango.

**Why it works**: Uses our unique chain IP (491 chains, nobody else has this). Tests cultural intuition. "I never thought of that connection" is genuine delight.

**Generation**: Pure SQL from chain_json. Pick a chain, extract a city pair and their connecting theme. Wrong answers: other themes from the city_profiles themes_json that aren't the connection.

---

### Format 7: City Personality Match

*"Which city has this personality?"* — Uses our 910 AI-generated city profiles.

**Q14:** "A walled colonial city where the first free Black town in the Americas sits an hour away, and you can float in a volcano before sunset."
- A) Havana, Cuba
- B) Cartagena, Colombia
- C) San Juan, Puerto Rico
- D) Santo Domingo, Dominican Republic

**Answer:** B) Cartagena, Colombia.

**Q15:** "A city where Moorish palace geometry, cave flamenco, and ski slopes coexist within the same afternoon."
- A) Marrakech, Morocco
- B) Seville, Spain
- C) Granada, Spain
- D) Tangier, Morocco

**Answer:** C) Granada, Spain.

**Why it works**: City personalities are evocative and specific. Uses our unique IP (910 profiles). Teaches real cultural facts. Wrong answers from same region make it genuinely challenging.

**Generation**: Pure SQL from city_profiles. Pick a city, use its personality text. Wrong answers: other cities from the same continent or country.

---

## Game Mechanics

### Daily Challenge (the core loop)
- **5 questions per day**, same for everyone globally
- Resets at midnight UTC
- Formats rotate across days to keep it fresh (all 7 formats cycle through)
- **Streak tracking**: consecutive days played with at least 1 correct
- After completing daily: see score, see correct answers with fun facts, share button

### Practice Mode (unlimited play)
- "Want more?" button after daily challenge completion
- Random questions from any format, infinite supply
- Scored per session but doesn't affect daily streak
- Different question pool from daily (prevents spoilers if someone plays practice first)

### Anonymous Leaderboard
- No login, no accounts, no personal data (stays true to Zero Friction pillar)
- Server stores anonymous daily scores: just the number (0-5), timestamp, and a random session hash
- After 10+ scores collected globally for a day, show comparison: **"You scored better than 73% of players today"**
- Optional: show distribution chart (like Wordle's guess distribution)
- Weekly stats: "This week's hardest question was #3 on Tuesday — only 23% got it right"

### Sharing (viral loop)
- **Share daily result**: "TourGraph Daily Trivia #47: 4/5 🌍" (Wordle-style grid showing correct/incorrect, no spoilers)
- **Share individual answers**: After seeing the answer reveal, share button generates a card: "Did you know a 30-min NYC helicopter costs more than 3 days in the Sahara? 🚁🐪" with tour photos
- **Share streaks**: "I'm on a 12-day streak on TourGraph Trivia! 🔥"
- These are iOS share sheets + shareable deep links (opens the trivia in the app or on web)

### Gamification (think big)

**Streaks & Milestones:**
- Streak badges at 3, 7, 14, 30, 60, 100 days
- Milestone celebrations with haptics (reuse the milestone toast system from World Map)
- "Perfect Day" badge for 5/5

**Travel IQ:**
- Running score that builds over time across all questions answered (daily + practice)
- Levels: "Tourist" → "Traveler" → "Explorer" → "Globetrotter" → "World Expert"
- Feeds into Pillar B's travel identity system ("Shrine Seeker with Expert-level Travel IQ")

**Category Mastery:**
- Track accuracy per format: "You're amazing at Price (89%) but struggle with Connections (42%)"
- Track accuracy per continent/region: "You know Europe cold but Asia stumps you"
- This data shapes future question selection — practice mode can focus on weak areas

**Feeds the World Map (Pillar B connection):**
- Every question you answer correctly about a city lights it up differently on your map
- "You've answered trivia about 47 cities" — separate from "explored" and "visited"
- Creates a third layer on the map: orange (unexplored), green (explored in-app), blue (physically visited via Pillar A)
- Completionist energy: "Can I answer a question about every destination?"

**Location Bonus (Pillar A connection, future):**
- When Pillar A detects you're in a city: "You're in Rome! Bonus question about Roman tours"
- Bonus questions don't break streak if wrong, but give extra points
- Creates a reason to open the app when traveling

---

## Evaluation Summary

| # | Format | Fun | Generatable | Uses Our IP | Generation |
|---|--------|-----|------------|------------|-----------|
| 1 | Higher or Lower (Price) | High | Easy | Moderate | SQL |
| 2 | Where in the World? | High | Easy | High (one-liners) | SQL |
| 3 | Real or Fake Tour? | Very High | Medium | High | Haiku (batch fakes) |
| 4 | The Numbers Game | Medium-High | Easy | Moderate | SQL aggregates |
| 5 | Odd One Out | Medium | Easy | Moderate | SQL |
| 6 | The Connection | High | Easy | Very High (chains) | SQL from chain_json |
| 7 | City Personality Match | High | Easy | Very High (profiles) | SQL from city_profiles |

### Daily mix (5 questions, rotating formats):
1. **Warm-up**: Higher or Lower OR Odd One Out
2. **Geography**: Where in the World? OR City Personality
3. **Crowd-pleaser**: Real or Fake? (always included — highest share potential)
4. **Culture**: The Connection
5. **Wild card**: The Numbers Game OR any format not yet used today

---

## Architecture Preview

```
Daily question generation:
  Haiku batch job (weekly) → pool of fake tour titles
  SQL queries (daily at midnight UTC) → 5 questions + practice pool
  ↓
Backend endpoint:
  GET /api/v1/trivia/daily     → today's 5 questions (no answers)
  POST /api/v1/trivia/answer   → submit answer, get result + fun fact
  GET /api/v1/trivia/results   → today's results (after completion)
  GET /api/v1/trivia/stats     → anonymous leaderboard data
  GET /api/v1/trivia/practice  → random question (unlimited)
  ↓
iOS app:
  Trivia tab (6th tab? or replace existing tab?)
  Daily challenge UI → practice mode → streak display → share
  ↓
Anonymous scoring:
  New DB table: trivia_scores (date, score, session_hash, answered_at)
  New DB table: trivia_questions (date, question_json, generated_at)
```

## Next Steps

- [ ] Step 2: Build question generation pipeline (SQL queries per format + Haiku prompt for fakes)
- [ ] Step 3: Backend endpoints (daily, answer, results, stats, practice)
- [ ] Step 4: iOS game UI + streaks + sharing
