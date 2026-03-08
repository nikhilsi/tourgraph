package com.nikhilsi.tourgraph.ui.common

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.core.content.FileProvider
import com.nikhilsi.tourgraph.model.Chain
import com.nikhilsi.tourgraph.model.Tour
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object ShareUtils {

    suspend fun shareTour(context: Context, tour: Tour, badge: String = "TOUR ROULETTE", statHighlight: String? = null) {
        val image = ShareCardRenderer.renderTourCard(tour, badge, statHighlight)
        val url = tour.viatorUrl ?: "https://tourgraph.ai"
        val text = buildString {
            append(tour.title)
            tour.oneLiner?.let { append("\n$it") }
            append("\n\n$url")
            append("\n\nvia TourGraph")
        }
        shareImageWithText(context, image, text, "share_tour.png")
    }

    fun shareChain(context: Context, chain: Chain) {
        val image = ShareCardRenderer.renderChainCard(chain)
        val text = buildString {
            append("Six Degrees of Anywhere: ${chain.cityFrom} \u2192 ${chain.cityTo}")
            append("\n\n${chain.summary}")
            append("\n\nhttps://tourgraph.ai/six-degrees")
            append("\n\nvia TourGraph")
        }
        shareImageWithText(context, image, text, "share_chain.png")
    }

    private fun shareImageWithText(context: Context, bitmap: Bitmap, text: String, filename: String) {
        val file = File(context.cacheDir, filename)
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()

        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share"))
    }
}
