package com.nikhilsi.tourgraph.widget

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import com.nikhilsi.tourgraph.data.TimezoneHelper
import com.nikhilsi.tourgraph.model.Tour
import java.io.File

object WidgetDatabase {

    private fun openDb(context: Context): SQLiteDatabase? {
        val dbFile = File(context.filesDir, "tourgraph.db")
        if (!dbFile.exists()) return null
        return try {
            SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
        } catch (_: Exception) {
            null
        }
    }

    data class GoldenHourTour(
        val tour: Tour,
        val timezoneInfo: TimezoneHelper.TimezoneInfo
    )

    fun getRandomGoldenHourTour(context: Context): GoldenHourTour? {
        val db = openDb(context) ?: return null
        return try {
            val timezones = mutableListOf<String>()
            db.rawQuery(
                "SELECT DISTINCT timezone FROM tours WHERE status = 'active' AND timezone IS NOT NULL",
                null
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    cursor.getString(0)?.let { timezones.add(it) }
                }
            }

            var goldenTzs = TimezoneHelper.getGoldenHourTimezones(timezones)
            if (goldenTzs.isEmpty()) {
                goldenTzs = TimezoneHelper.getPleasantTimezones(timezones)
            }
            if (goldenTzs.isEmpty()) return null

            val tz = goldenTzs.random()
            db.rawQuery(
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours " +
                        "WHERE status = 'active' AND timezone = ? AND image_url IS NOT NULL AND rating >= 4.0 " +
                        "ORDER BY RANDOM() LIMIT 1",
                arrayOf(tz.timezone)
            ).use { cursor ->
                if (cursor.moveToFirst()) {
                    GoldenHourTour(Tour.fromCursor(cursor), tz)
                } else null
            }
        } finally {
            db.close()
        }
    }

    fun getRandomTour(context: Context): Tour? {
        val db = openDb(context) ?: return null
        return try {
            db.rawQuery(
                "SELECT ${Tour.cardColumns.joinToString(",")} FROM tours " +
                        "WHERE status = 'active' AND image_url IS NOT NULL " +
                        "ORDER BY RANDOM() LIMIT 1",
                null
            ).use { cursor ->
                if (cursor.moveToFirst()) Tour.fromCursor(cursor) else null
            }
        } finally {
            db.close()
        }
    }
}
