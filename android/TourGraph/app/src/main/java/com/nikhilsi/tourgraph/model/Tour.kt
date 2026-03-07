package com.nikhilsi.tourgraph.model

import android.database.Cursor
import java.util.Locale

data class Tour(
    val id: Int,
    val productCode: String,
    val title: String,
    val oneLiner: String?,
    val description: String?,
    val destinationId: Int,
    val destinationName: String?,
    val country: String?,
    val continent: String?,
    val timezone: String?,
    val rating: Double?,
    val reviewCount: Int?,
    val fromPrice: Double?,
    val currency: String?,
    val durationMinutes: Int?,
    val imageUrl: String?,
    val imageUrlsJson: String?,
    val highlightsJson: String?,
    val inclusionsJson: String?,
    val viatorUrl: String?,
    val supplierName: String?,
    val weightCategory: String?
) {
    val displayPrice: String
        get() {
            val price = fromPrice ?: return ""
            val symbol = when (currency) {
                "USD" -> "$"
                "EUR" -> "€"
                "GBP" -> "£"
                else -> currency ?: "$"
            }
            return if (price == price.toLong().toDouble()) {
                "$symbol${price.toLong()}"
            } else {
                "$symbol${String.format(Locale.US, "%.2f", price)}"
            }
        }

    val displayRating: String
        get() {
            val r = rating ?: return ""
            return String.format(Locale.US, "%.1f", r)
        }

    val displayDuration: String
        get() {
            val mins = durationMinutes ?: return ""
            return when {
                mins >= 1440 -> {
                    val days = mins / 1440
                    val remainHours = (mins % 1440) / 60
                    if (remainHours > 0) "${days}d ${remainHours}h" else "${days}d"
                }
                mins >= 60 -> {
                    val hours = mins / 60
                    val remainMins = mins % 60
                    if (remainMins > 0) "${hours}h ${remainMins}m" else "${hours}h"
                }
                else -> "${mins}m"
            }
        }

    val imageURL: String? get() = imageUrl

    val highlights: List<String>
        get() {
            val json = highlightsJson ?: return emptyList()
            return try {
                kotlinx.serialization.json.Json.decodeFromString<List<String>>(json)
            } catch (_: Exception) {
                emptyList()
            }
        }

    val imageURLs: List<String>
        get() {
            val json = imageUrlsJson ?: return emptyList()
            return try {
                kotlinx.serialization.json.Json.decodeFromString<List<String>>(json)
            } catch (_: Exception) {
                emptyList()
            }
        }

    companion object {
        val cardColumns = arrayOf(
            "id", "product_code", "title", "one_liner", "description",
            "destination_id", "destination_name", "country", "continent", "timezone",
            "rating", "review_count", "from_price", "currency", "duration_minutes",
            "image_url", "image_urls_json", "highlights_json", "inclusions_json",
            "viator_url", "supplier_name", "weight_category"
        )

        fun fromCursor(cursor: Cursor): Tour {
            return Tour(
                id = cursor.getInt(cursor.getColumnIndexOrThrow("id")),
                productCode = cursor.getString(cursor.getColumnIndexOrThrow("product_code")) ?: "",
                title = cursor.getString(cursor.getColumnIndexOrThrow("title")) ?: "",
                oneLiner = cursor.getStringOrNull("one_liner"),
                description = cursor.getStringOrNull("description"),
                destinationId = cursor.getInt(cursor.getColumnIndexOrThrow("destination_id")),
                destinationName = cursor.getStringOrNull("destination_name"),
                country = cursor.getStringOrNull("country"),
                continent = cursor.getStringOrNull("continent"),
                timezone = cursor.getStringOrNull("timezone"),
                rating = cursor.getDoubleOrNull("rating"),
                reviewCount = cursor.getIntOrNull("review_count"),
                fromPrice = cursor.getDoubleOrNull("from_price"),
                currency = cursor.getStringOrNull("currency"),
                durationMinutes = cursor.getIntOrNull("duration_minutes"),
                imageUrl = cursor.getStringOrNull("image_url"),
                imageUrlsJson = cursor.getStringOrNull("image_urls_json"),
                highlightsJson = cursor.getStringOrNull("highlights_json"),
                inclusionsJson = cursor.getStringOrNull("inclusions_json"),
                viatorUrl = cursor.getStringOrNull("viator_url"),
                supplierName = cursor.getStringOrNull("supplier_name"),
                weightCategory = cursor.getStringOrNull("weight_category")
            )
        }

        private fun Cursor.getStringOrNull(column: String): String? {
            val idx = getColumnIndex(column)
            return if (idx >= 0 && !isNull(idx)) getString(idx) else null
        }

        private fun Cursor.getDoubleOrNull(column: String): Double? {
            val idx = getColumnIndex(column)
            return if (idx >= 0 && !isNull(idx)) getDouble(idx) else null
        }

        private fun Cursor.getIntOrNull(column: String): Int? {
            val idx = getColumnIndex(column)
            return if (idx >= 0 && !isNull(idx)) getInt(idx) else null
        }
    }
}
