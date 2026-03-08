package com.nikhilsi.tourgraph.ui.common

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.nikhilsi.tourgraph.model.Chain
import com.nikhilsi.tourgraph.model.Tour
import java.net.URL

object ShareCardRenderer {

    private const val W = 1200
    private const val H = 630

    private val brandAmber = Color.rgb(245, 158, 11) // #f59e0b

    suspend fun renderTourCard(
        tour: Tour,
        badge: String = "TOUR ROULETTE",
        statHighlight: String? = null
    ): Bitmap = withContext(Dispatchers.Default) {
        val bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Background: tour image or dark fallback
        val heroImage = downloadImage(tour.imageURL?.toString())
        if (heroImage != null) {
            val scaled = cropCenter(heroImage, W, H)
            canvas.drawBitmap(scaled, 0f, 0f, null)
            if (scaled != heroImage) scaled.recycle()
            heroImage.recycle()
        } else {
            canvas.drawColor(Color.rgb(10, 10, 10))
        }

        // Dark gradient overlay
        val gradient = LinearGradient(
            0f, 0f, 0f, H.toFloat(),
            intArrayOf(Color.TRANSPARENT, Color.argb(77, 0, 0, 0), Color.argb(217, 0, 0, 0)),
            floatArrayOf(0f, 0.4f, 1f),
            Shader.TileMode.CLAMP
        )
        val gradPaint = Paint().apply { shader = gradient }
        canvas.drawRect(0f, 0f, W.toFloat(), H.toFloat(), gradPaint)

        val pad = 48f
        var y = H - pad // build from bottom up

        // Bottom row: location | rating | price | branding
        val smallPaint = textPaint(24f, Color.argb(180, 255, 255, 255), bold = true)
        val bottomParts = mutableListOf<Pair<String, Int>>() // text, color
        tour.destinationName?.let { dest ->
            val loc = listOfNotNull(dest, tour.country).filter { it.isNotEmpty() }.joinToString(", ")
            bottomParts.add("\uD83D\uDCCD $loc" to Color.argb(180, 255, 255, 255))
        }
        if (tour.rating != null && tour.rating > 0) {
            bottomParts.add("\u2B50 ${tour.displayRating}" to Color.argb(255, 255, 255, 255))
        }
        if (tour.fromPrice != null && tour.fromPrice > 0) {
            bottomParts.add(tour.displayPrice to Color.rgb(34, 197, 94))
        }

        // Draw bottom row
        val brandPaint = textPaint(24f, Color.argb(128, 255, 255, 255), bold = true)
        val brandText = "tourgraph.ai"
        val brandWidth = brandPaint.measureText(brandText)
        canvas.drawText(brandText, W - pad - brandWidth, y, brandPaint)

        var bx = pad
        for ((text, color) in bottomParts) {
            smallPaint.color = color
            canvas.drawText(text, bx, y, smallPaint)
            bx += smallPaint.measureText(text) + 24f
        }

        y -= 44f

        // One-liner
        tour.oneLiner?.let { oneLiner ->
            val olPaint = textPaint(24f, Color.argb(204, 255, 255, 255), italic = true)
            val olLayout = staticLayout(oneLiner, olPaint, (W - pad * 2).toInt(), maxLines = 2)
            y -= olLayout.height
            canvas.save()
            canvas.translate(pad, y)
            olLayout.draw(canvas)
            canvas.restore()
            y -= 10f
        }

        // Title
        val titlePaint = textPaint(48f, Color.WHITE, bold = true)
        val titleLayout = staticLayout(tour.title, titlePaint, (W - pad * 2).toInt(), maxLines = 2)
        y -= titleLayout.height
        canvas.save()
        canvas.translate(pad, y)
        titleLayout.draw(canvas)
        canvas.restore()
        y -= 12f

        // Stat highlight (for World's Most)
        if (statHighlight != null) {
            val statPaint = textPaint(44f, brandAmber, bold = true)
            y -= 44f
            canvas.drawText(statHighlight, pad, y + 36f, statPaint)
            y -= 12f
        }

        // Badge
        val badgePaint = textPaint(18f, brandAmber, bold = true)
        badgePaint.letterSpacing = 0.1f
        y -= 24f
        canvas.drawText(badge, pad, y + 18f, badgePaint)

        bitmap
    }

    fun renderChainCard(chain: Chain): Bitmap {
        val bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Dark background
        canvas.drawColor(Color.rgb(10, 10, 10))

        // Subtle amber radial gradient at top
        val radial = RadialGradient(
            W / 2f, 0f, 400f,
            Color.argb(20, 245, 158, 11), Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        val radPaint = Paint().apply { shader = radial }
        canvas.drawRect(0f, 0f, W.toFloat(), H.toFloat(), radPaint)

        val pad = 48f
        val centerX = W / 2f

        // Badge
        val badgePaint = textPaint(18f, brandAmber, bold = true).apply { textAlign = Paint.Align.CENTER; letterSpacing = 0.1f }
        canvas.drawText("SIX DEGREES OF ANYWHERE", centerX, pad + 60f, badgePaint)

        // City pair: "CityA -> CityB"
        val cityPaint = textPaint(48f, Color.WHITE, bold = true).apply { textAlign = Paint.Align.CENTER }
        val arrowPaint = textPaint(48f, brandAmber, bold = true).apply { textAlign = Paint.Align.CENTER }
        val cityText = "${chain.cityFrom}  \u2192  ${chain.cityTo}"
        // Measure to see if it fits, scale down if needed
        val cityWidth = cityPaint.measureText(cityText)
        val maxWidth = W - pad * 2
        if (cityWidth > maxWidth) {
            cityPaint.textSize = 48f * (maxWidth / cityWidth)
            arrowPaint.textSize = cityPaint.textSize
        }
        canvas.drawText(cityText, centerX, pad + 130f, cityPaint)

        // Summary (italic)
        val sumPaint = textPaint(26f, Color.argb(180, 255, 255, 255), italic = true).apply { textAlign = Paint.Align.CENTER }
        val sumLayout = staticLayout(chain.summary, sumPaint.apply { textAlign = Paint.Align.LEFT }, (W - pad * 4).toInt(), maxLines = 2, alignment = Layout.Alignment.ALIGN_CENTER)
        canvas.save()
        canvas.translate(pad * 2, pad + 160f)
        sumLayout.draw(canvas)
        canvas.restore()

        // Chain visualization: numbered circles with connecting line
        val chainY = pad + 160f + sumLayout.height + 50f
        val circleR = 20f
        val linePad = 80f
        val lineLeft = pad + linePad
        val lineRight = W - pad - linePad
        val linkCount = chain.links.size

        // Connecting line
        val linePaint = Paint().apply { color = Color.argb(102, 245, 158, 11); strokeWidth = 4f }
        canvas.drawLine(lineLeft, chainY, lineRight, chainY, linePaint)

        // Numbered circles
        val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = brandAmber }
        val numPaint = textPaint(20f, Color.BLACK, bold = true).apply { textAlign = Paint.Align.CENTER }
        for (i in 0 until linkCount) {
            val cx = if (linkCount == 1) centerX else lineLeft + (lineRight - lineLeft) * i / (linkCount - 1)
            canvas.drawCircle(cx, chainY, circleR, circlePaint)
            canvas.drawText("${i + 1}", cx, chainY + 7f, numPaint)
        }

        // Footer
        val footLeft = textPaint(22f, Color.argb(128, 255, 255, 255), bold = true)
        canvas.drawText("${linkCount} stops connected by theme", pad, H - pad, footLeft)
        val footRight = textPaint(22f, Color.argb(128, 255, 255, 255), bold = true).apply { textAlign = Paint.Align.RIGHT }
        canvas.drawText("tourgraph.ai", W - pad, H - pad, footRight)

        return bitmap
    }

    // --- Helpers ---

    private fun textPaint(size: Float, color: Int, bold: Boolean = false, italic: Boolean = false): TextPaint {
        return TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = size
            this.color = color
            typeface = when {
                bold && italic -> Typeface.create(Typeface.DEFAULT, Typeface.BOLD_ITALIC)
                bold -> Typeface.DEFAULT_BOLD
                italic -> Typeface.create(Typeface.DEFAULT, Typeface.ITALIC)
                else -> Typeface.DEFAULT
            }
        }
    }

    private fun staticLayout(
        text: String,
        paint: TextPaint,
        width: Int,
        maxLines: Int = Int.MAX_VALUE,
        alignment: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL
    ): StaticLayout {
        return StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
            .setAlignment(alignment)
            .setMaxLines(maxLines)
            .setEllipsize(android.text.TextUtils.TruncateAt.END)
            .setIncludePad(false)
            .build()
    }

    private fun cropCenter(src: Bitmap, targetW: Int, targetH: Int): Bitmap {
        val srcRatio = src.width.toFloat() / src.height
        val targetRatio = targetW.toFloat() / targetH
        val (cropW, cropH) = if (srcRatio > targetRatio) {
            (src.height * targetRatio).toInt() to src.height
        } else {
            src.width to (src.width / targetRatio).toInt()
        }
        val x = (src.width - cropW) / 2
        val y = (src.height - cropH) / 2
        val cropped = Bitmap.createBitmap(src, x, y, cropW, cropH)
        return Bitmap.createScaledBitmap(cropped, targetW, targetH, true)
    }

    private suspend fun downloadImage(url: String?): Bitmap? = withContext(Dispatchers.IO) {
        if (url == null) return@withContext null
        try {
            val stream = URL(url).openStream()
            BitmapFactory.decodeStream(stream)
        } catch (_: Exception) {
            null
        }
    }
}
