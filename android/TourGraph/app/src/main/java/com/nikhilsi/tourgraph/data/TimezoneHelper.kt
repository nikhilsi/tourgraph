package com.nikhilsi.tourgraph.data

import java.util.Calendar
import java.util.TimeZone

object TimezoneHelper {

    data class TimezoneInfo(
        val timezone: String,
        val localHour: Int,
        val localMinute: Int,
        val timeOfDay: String,
        val localTimeFormatted: String
    )

    fun getGoldenHourTimezones(allTimezones: List<String>): List<TimezoneInfo> {
        return allTimezones.mapNotNull { tz ->
            val info = getTimezoneInfo(tz)
            if (isGoldenHour(info.localHour)) info else null
        }
    }

    fun getPleasantTimezones(allTimezones: List<String>): List<TimezoneInfo> {
        return allTimezones.mapNotNull { tz ->
            val info = getTimezoneInfo(tz)
            if (isPleasantTime(info.localHour)) info else null
        }
    }

    fun getTimezoneInfo(timezone: String): TimezoneInfo {
        val tz = TimeZone.getTimeZone(timezone)
        val cal = Calendar.getInstance(tz)
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        val minute = cal.get(Calendar.MINUTE)
        val timeOfDay = getTimeOfDay(hour)
        val formatted = formatLocalTime(hour, minute)
        return TimezoneInfo(timezone, hour, minute, timeOfDay, formatted)
    }

    private fun isGoldenHour(hour: Int): Boolean {
        return hour in 6..7 || hour in 16..17
    }

    private fun isPleasantTime(hour: Int): Boolean {
        return hour in 9..15
    }

    private fun getTimeOfDay(hour: Int): String {
        return when (hour) {
            in 5..7 -> "early morning"
            in 8..11 -> "morning"
            12 -> "noon"
            in 13..16 -> "afternoon"
            in 17..19 -> "evening"
            in 20..22 -> "night"
            else -> "late night"
        }
    }

    private fun formatLocalTime(hour: Int, minute: Int): String {
        val period = if (hour < 12) "am" else "pm"
        val displayHour = when {
            hour == 0 -> 12
            hour > 12 -> hour - 12
            else -> hour
        }
        return "$displayHour:${minute.toString().padStart(2, '0')}$period"
    }
}
