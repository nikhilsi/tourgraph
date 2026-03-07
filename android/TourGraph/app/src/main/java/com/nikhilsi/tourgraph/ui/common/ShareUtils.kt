package com.nikhilsi.tourgraph.ui.common

import android.content.Context
import android.content.Intent
import com.nikhilsi.tourgraph.model.Tour

object ShareUtils {

    fun shareTour(context: Context, tour: Tour) {
        val url = tour.viatorUrl ?: "https://tourgraph.ai"
        val text = buildString {
            append(tour.title)
            tour.oneLiner?.let { append("\n$it") }
            tour.destinationName?.let { append("\n\uD83D\uDCCD $it") }
            append("\n\n$url")
            append("\n\nvia TourGraph")
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(intent, "Share tour"))
    }

    fun shareChain(context: Context, cityFrom: String, cityTo: String, summary: String) {
        val text = buildString {
            append("Six Degrees of Anywhere: $cityFrom \u2192 $cityTo")
            append("\n\n$summary")
            append("\n\nhttps://tourgraph.ai/six-degrees")
            append("\n\nvia TourGraph")
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(intent, "Share chain"))
    }
}
