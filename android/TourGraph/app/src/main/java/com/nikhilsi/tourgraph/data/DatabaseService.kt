package com.nikhilsi.tourgraph.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.nikhilsi.tourgraph.model.Chain
import com.nikhilsi.tourgraph.model.SuperlativeType
import com.nikhilsi.tourgraph.model.Tour
import java.io.File
import java.io.FileOutputStream

class DatabaseService(context: Context) {

    private val db: SQLiteDatabase

    init {
        val dbFile = File(context.filesDir, "tourgraph.db")
        if (!dbFile.exists()) {
            context.assets.open("tourgraph.db").use { input ->
                FileOutputStream(dbFile).use { output ->
                    input.copyTo(output)
                }
            }
        }
        db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READWRITE)
    }

    fun close() {
        db.close()
    }

    // --- Roulette ---

    fun getRouletteHand(excludeIds: List<Int> = emptyList()): List<Tour> {
        val categories = mapOf(
            "highest_rated" to 4,
            "unique" to 3,
            "cheapest_5star" to 3,
            "most_expensive" to 2,
            "exotic_location" to 3,
            "most_reviewed" to 2,
            "wildcard" to 3
        )

        val tours = mutableListOf<Tour>()
        val excludePlaceholders = if (excludeIds.isNotEmpty()) {
            excludeIds.joinToString(",") { "?" }
        } else null

        for ((category, count) in categories) {
            val sql = buildString {
                append("SELECT ${Tour.cardColumns.joinToString(",")} FROM tours ")
                append("WHERE status = 'active' AND weight_category = ?")
                if (excludePlaceholders != null) {
                    append(" AND id NOT IN ($excludePlaceholders)")
                }
                append(" ORDER BY RANDOM() LIMIT ?")
            }
            val args = mutableListOf<String>(category)
            excludeIds.forEach { args.add(it.toString()) }
            args.add(count.toString())

            db.rawQuery(sql, args.toTypedArray()).use { cursor ->
                while (cursor.moveToNext()) {
                    tours.add(Tour.fromCursor(cursor))
                }
            }
        }

        // Fill remaining to reach ~20
        val remaining = 20 - tours.size
        if (remaining > 0) {
            val allExclude = (excludeIds + tours.map { it.id })
            val placeholders = allExclude.joinToString(",") { "?" }
            val sql = "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours " +
                    "WHERE status = 'active' AND id NOT IN ($placeholders) " +
                    "ORDER BY RANDOM() LIMIT ?"
            val args = allExclude.map { it.toString() } + remaining.toString()
            db.rawQuery(sql, args.toTypedArray()).use { cursor ->
                while (cursor.moveToNext()) {
                    tours.add(Tour.fromCursor(cursor))
                }
            }
        }

        return sequenceHand(tours)
    }

    private fun sequenceHand(tours: List<Tour>): List<Tour> {
        if (tours.size <= 1) return tours
        val remaining = tours.toMutableList()
        val result = mutableListOf<Tour>()
        result.add(remaining.removeAt((0 until remaining.size).random()))

        while (remaining.isNotEmpty()) {
            val last = result.last()
            var bestScore = -1
            var bestIdx = 0
            for (i in remaining.indices) {
                val candidate = remaining[i]
                var score = 0
                if (candidate.weightCategory != last.weightCategory) score += 2
                if (candidate.continent != last.continent) score += 2
                val priceRatio = if (last.fromPrice != null && candidate.fromPrice != null &&
                    last.fromPrice > 0 && candidate.fromPrice > 0
                ) candidate.fromPrice / last.fromPrice else 1.0
                if (priceRatio > 3 || priceRatio < 0.33) score += 1
                if (score > bestScore) {
                    bestScore = score
                    bestIdx = i
                }
            }
            result.add(remaining.removeAt(bestIdx))
        }
        return result
    }

    // --- Right Now Somewhere ---

    fun getDistinctTimezones(): List<String> {
        val timezones = mutableListOf<String>()
        db.rawQuery(
            "SELECT DISTINCT timezone FROM tours WHERE status = 'active' AND timezone IS NOT NULL",
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                cursor.getString(0)?.let { timezones.add(it) }
            }
        }
        return timezones
    }

    fun getTourByTimezone(timezone: String): Tour? {
        db.rawQuery(
            "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours " +
                    "WHERE status = 'active' AND timezone = ? AND image_url IS NOT NULL AND rating >= 4.0 " +
                    "ORDER BY RANDOM() LIMIT 1",
            arrayOf(timezone)
        ).use { cursor ->
            return if (cursor.moveToFirst()) Tour.fromCursor(cursor) else null
        }
    }

    // --- World's Most ---

    fun getSuperlative(type: SuperlativeType): Tour? {
        val sql = when (type) {
            SuperlativeType.MOST_EXPENSIVE ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND from_price <= 50000 AND from_price > 0 AND image_url IS NOT NULL ORDER BY from_price DESC LIMIT 10"
            SuperlativeType.CHEAPEST_5_STAR ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND rating >= 4.5 AND from_price > 0 AND review_count >= 10 AND image_url IS NOT NULL ORDER BY from_price ASC LIMIT 10"
            SuperlativeType.LONGEST ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND duration_minutes <= 20160 AND duration_minutes > 0 AND image_url IS NOT NULL ORDER BY duration_minutes DESC LIMIT 10"
            SuperlativeType.SHORTEST ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND duration_minutes >= 30 AND image_url IS NOT NULL ORDER BY duration_minutes ASC LIMIT 10"
            SuperlativeType.MOST_REVIEWED ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND image_url IS NOT NULL ORDER BY review_count DESC LIMIT 10"
            SuperlativeType.HIDDEN_GEM ->
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE status = 'active' AND rating >= 4.8 AND review_count >= 10 AND review_count <= 100 AND image_url IS NOT NULL ORDER BY rating DESC, review_count ASC LIMIT 10"
        }

        val tours = mutableListOf<Tour>()
        db.rawQuery(sql, null).use { cursor ->
            while (cursor.moveToNext()) {
                tours.add(Tour.fromCursor(cursor))
            }
        }
        return tours.randomOrNull()
    }

    // --- Six Degrees ---

    fun getRandomChain(): Chain? {
        db.rawQuery(
            "SELECT * FROM six_degrees_chains ORDER BY RANDOM() LIMIT 1",
            null
        ).use { cursor ->
            return if (cursor.moveToFirst()) Chain.fromCursor(cursor) else null
        }
    }

    fun getChainCount(): Int {
        db.rawQuery("SELECT COUNT(*) FROM six_degrees_chains", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }

    // --- Tour Detail ---

    fun getTourById(id: Int): Tour? {
        db.rawQuery(
            "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE id = ?",
            arrayOf(id.toString())
        ).use { cursor ->
            return if (cursor.moveToFirst()) Tour.fromCursor(cursor) else null
        }
    }

    fun getToursByIds(ids: List<Int>): Map<Int, Tour> {
        if (ids.isEmpty()) return emptyMap()
        val placeholders = ids.joinToString(",") { "?" }
        val result = mutableMapOf<Int, Tour>()
        db.rawQuery(
            "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours WHERE id IN ($placeholders)",
            ids.map { it.toString() }.toTypedArray()
        ).use { cursor ->
            while (cursor.moveToNext()) {
                val tour = Tour.fromCursor(cursor)
                result[tour.id] = tour
            }
        }
        return result
    }

    // --- Enrichment ---

    fun needsEnrichment(tour: Tour): Boolean {
        return tour.imageUrlsJson == null || (tour.description?.endsWith("...") == true)
    }

    fun updateTourEnrichment(tourId: Int, description: String?, imageUrlsJson: String?) {
        val values = ContentValues()
        if (description != null) values.put("description", description)
        if (imageUrlsJson != null) values.put("image_urls_json", imageUrlsJson)
        if (values.size() > 0) {
            db.update("tours", values, "id = ?", arrayOf(tourId.toString()))
        }
    }

    // --- Stats ---

    fun getTourCount(): Int {
        db.rawQuery("SELECT COUNT(*) FROM tours WHERE status = 'active'", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }

    fun getDestinationCount(): Int {
        db.rawQuery("SELECT COUNT(DISTINCT destination_id) FROM tours WHERE status = 'active'", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }
}
