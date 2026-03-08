package com.nikhilsi.tourgraph.state

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Favorites(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("tourgraph_favorites", Context.MODE_PRIVATE)

    private val _tourIds = MutableStateFlow(loadFavorites())
    val tourIds: StateFlow<List<Int>> = _tourIds.asStateFlow()

    private fun loadFavorites(): List<Int> {
        val json = prefs.getString("favoriteTourIds", null) ?: return emptyList()
        return try {
            Json.decodeFromString<List<Int>>(json)
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun contains(tourId: Int): Boolean = _tourIds.value.contains(tourId)

    fun currentIds(): List<Int> = _tourIds.value

    fun toggle(tourId: Int) {
        val current = _tourIds.value.toMutableList()
        if (current.contains(tourId)) {
            current.remove(tourId)
        } else {
            current.add(0, tourId)
        }
        _tourIds.value = current
        prefs.edit().putString("favoriteTourIds", Json.encodeToString(current)).apply()
    }
}
