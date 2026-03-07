package com.nikhilsi.tourgraph.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.nikhilsi.tourgraph.MainActivity

class RandomTourWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val tour = WidgetDatabase.getRandomTour(context)

        provideContent {
            GlanceTheme {
                if (tour != null) {
                    RandomTourContent(
                        tourTitle = tour.title,
                        destination = tour.destinationName ?: "",
                        oneLiner = tour.oneLiner ?: "",
                        rating = tour.displayRating,
                        price = tour.displayPrice
                    )
                } else {
                    Box(
                        modifier = GlanceModifier
                            .fillMaxSize()
                            .background(Color(0xFF1A1A1A))
                            .clickable(actionStartActivity<MainActivity>())
                            .padding(12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Random Tour",
                            style = TextStyle(
                                color = ColorProvider(Color.White.copy(alpha = 0.5f)),
                                fontSize = 14.sp
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RandomTourContent(
    tourTitle: String,
    destination: String,
    oneLiner: String,
    rating: String,
    price: String
) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Color(0xFF1A1A1A))
            .clickable(actionStartActivity<MainActivity>())
            .padding(12.dp),
        contentAlignment = Alignment.BottomStart
    ) {
        Column {
            if (destination.isNotEmpty()) {
                Text(
                    text = "\uD83D\uDCCD $destination",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFFFFA726)),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
            }
            Text(
                text = tourTitle,
                style = TextStyle(
                    color = ColorProvider(Color.White),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                ),
                maxLines = 2
            )
            if (oneLiner.isNotEmpty()) {
                Text(
                    text = oneLiner,
                    style = TextStyle(
                        color = ColorProvider(Color.White.copy(alpha = 0.7f)),
                        fontSize = 11.sp
                    ),
                    maxLines = 1
                )
            }
            val statsLine = listOfNotNull(
                if (rating.isNotEmpty()) "\u2B50 $rating" else null,
                if (price.isNotEmpty()) price else null
            ).joinToString(" \u2022 ")
            if (statsLine.isNotEmpty()) {
                Text(
                    text = statsLine,
                    style = TextStyle(
                        color = ColorProvider(Color.White.copy(alpha = 0.6f)),
                        fontSize = 11.sp
                    )
                )
            }
        }
    }
}

class RandomTourWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = RandomTourWidget()
}
