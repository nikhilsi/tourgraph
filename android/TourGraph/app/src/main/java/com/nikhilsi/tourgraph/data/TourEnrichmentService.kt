package com.nikhilsi.tourgraph.data

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

@Serializable
private data class EnrichmentResponse(
    val id: Int? = null,
    val description: String? = null,
    val imageUrls: List<String>? = null
)

@Serializable
private data class BatchRequest(val ids: List<Int>)

class TourEnrichmentService(private val db: DatabaseService) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true }
    private val inFlight = mutableSetOf<Int>()

    suspend fun enrichTour(tourId: Int) {
        if (tourId in inFlight) return
        inFlight.add(tourId)
        try {
            withContext(Dispatchers.IO) {
                val start = System.currentTimeMillis()
                val request = Request.Builder()
                    .url("https://tourgraph.ai/api/ios/tour/$tourId")
                    .get()
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: return@withContext
                    val enrichment = json.decodeFromString<EnrichmentResponse>(body)
                    val imageUrlsJson = enrichment.imageUrls?.let {
                        Json.encodeToString(kotlinx.serialization.builtins.ListSerializer(
                            kotlinx.serialization.serializer<String>()
                        ), it)
                    }
                    db.updateTourEnrichment(tourId, enrichment.description, imageUrlsJson)
                    val elapsed = System.currentTimeMillis() - start
                    Log.d("TourEnrichment", "Enriched tour $tourId in ${elapsed}ms")
                } else {
                    Log.w("TourEnrichment", "Failed to enrich tour $tourId: ${response.code}")
                }
            }
        } catch (e: Exception) {
            Log.e("TourEnrichment", "Error enriching tour $tourId", e)
        } finally {
            inFlight.remove(tourId)
        }
    }

    suspend fun batchEnrich(tourIds: List<Int>) {
        val toFetch = tourIds.filter { it !in inFlight }
        if (toFetch.isEmpty()) return
        toFetch.forEach { inFlight.add(it) }
        try {
            withContext(Dispatchers.IO) {
                val requestBody = json.encodeToString(BatchRequest.serializer(), BatchRequest(toFetch))
                val request = Request.Builder()
                    .url("https://tourgraph.ai/api/ios/tours/batch")
                    .post(requestBody.toRequestBody("application/json".toMediaType()))
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: return@withContext
                    val enrichments = json.decodeFromString<List<EnrichmentResponse>>(body)
                    for (enrichment in enrichments) {
                        val id = enrichment.id ?: continue
                        val imageUrlsJson = enrichment.imageUrls?.let {
                            Json.encodeToString(kotlinx.serialization.builtins.ListSerializer(
                                kotlinx.serialization.serializer<String>()
                            ), it)
                        }
                        db.updateTourEnrichment(id, enrichment.description, imageUrlsJson)
                    }
                    Log.d("TourEnrichment", "Batch enriched ${enrichments.size} tours")
                }
            }
        } catch (e: Exception) {
            Log.e("TourEnrichment", "Batch enrichment error", e)
        } finally {
            toFetch.forEach { inFlight.remove(it) }
        }
    }
}
