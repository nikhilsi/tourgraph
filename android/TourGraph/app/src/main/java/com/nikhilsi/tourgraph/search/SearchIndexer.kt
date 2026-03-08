package com.nikhilsi.tourgraph.search

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.nikhilsi.tourgraph.MainActivity
import com.nikhilsi.tourgraph.R
import com.nikhilsi.tourgraph.data.DatabaseService
import com.nikhilsi.tourgraph.state.Favorites
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Indexes favorited tours as dynamic shortcuts so they appear in launcher search.
 * Android equivalent of iOS Spotlight indexing.
 */
object SearchIndexer {

    private const val MAX_SHORTCUTS = 15 // Android limit is ~15 dynamic shortcuts

    suspend fun indexFavorites(context: Context, db: DatabaseService, favorites: Favorites) {
        withContext(Dispatchers.IO) {
            val favoriteIds = favorites.currentIds()
            if (favoriteIds.isEmpty()) {
                ShortcutManagerCompat.removeAllDynamicShortcuts(context)
                return@withContext
            }

            val shortcuts = favoriteIds.take(MAX_SHORTCUTS).mapNotNull { tourId ->
                val tour = db.getTourById(tourId) ?: return@mapNotNull null
                val intent = Intent(context, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse("tourgraph://tour/$tourId")
                }

                val label = tour.title
                val longLabel = buildString {
                    append(tour.title)
                    tour.destinationName?.let { append(" - $it") }
                }

                ShortcutInfoCompat.Builder(context, "tour_$tourId")
                    .setShortLabel(label)
                    .setLongLabel(longLabel)
                    .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
                    .setIntent(intent)
                    .build()
            }

            ShortcutManagerCompat.removeAllDynamicShortcuts(context)
            ShortcutManagerCompat.addDynamicShortcuts(context, shortcuts)
        }
    }

    suspend fun removeAll(context: Context) {
        withContext(Dispatchers.IO) {
            ShortcutManagerCompat.removeAllDynamicShortcuts(context)
        }
    }
}
