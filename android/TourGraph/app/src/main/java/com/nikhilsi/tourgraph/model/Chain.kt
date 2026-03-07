package com.nikhilsi.tourgraph.model

import android.database.Cursor
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChainLink(
    val city: String,
    val country: String,
    @SerialName("tour_title") val tourTitle: String,
    @SerialName("tour_id") val tourId: Int,
    @SerialName("connection_to_next") val connectionToNext: String? = null,
    val theme: String? = null
)

@Serializable
data class ChainData(
    @SerialName("city_from") val cityFrom: String,
    @SerialName("city_to") val cityTo: String,
    val chain: List<ChainLink>,
    val summary: String
)

private val chainJson = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

data class Chain(
    val id: Int,
    val cityFrom: String,
    val cityTo: String,
    val chainData: ChainData,
    val slug: String?,
    val generatedAt: String?
) {
    val links: List<ChainLink> get() = chainData.chain
    val summary: String get() = chainData.summary

    companion object {
        fun fromCursor(cursor: Cursor): Chain? {
            val json = cursor.getString(cursor.getColumnIndexOrThrow("chain_json")) ?: return null
            val chainData = try {
                chainJson.decodeFromString<ChainData>(json)
            } catch (_: Exception) {
                return null
            }
            return Chain(
                id = cursor.getInt(cursor.getColumnIndexOrThrow("id")),
                cityFrom = cursor.getString(cursor.getColumnIndexOrThrow("city_from")) ?: "",
                cityTo = cursor.getString(cursor.getColumnIndexOrThrow("city_to")) ?: "",
                chainData = chainData,
                slug = cursor.getStringOrNull("slug"),
                generatedAt = cursor.getStringOrNull("generated_at")
            )
        }

        private fun Cursor.getStringOrNull(column: String): String? {
            val idx = getColumnIndex(column)
            return if (idx >= 0 && !isNull(idx)) getString(idx) else null
        }
    }
}
