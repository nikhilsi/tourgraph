package com.nikhilsi.tourgraph.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val TourGraphColors = darkColorScheme(
    primary = Color(0xFFFFA726),       // Warm orange accent
    onPrimary = Color.Black,
    secondary = Color(0xFF80CBC4),     // Teal accent
    onSecondary = Color.Black,
    background = Color(0xFF0A0A0A),    // Near-black
    onBackground = Color.White,
    surface = Color(0xFF1A1A1A),       // Dark card surface
    onSurface = Color.White,
    surfaceVariant = Color(0xFF2A2A2A),
    onSurfaceVariant = Color(0xFFB0B0B0),
    error = Color(0xFFEF5350),
    onError = Color.White
)

private val TourGraphTypography = Typography(
    headlineLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        color = Color.White
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        color = Color.White
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        color = Color.White
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        color = Color.White
    ),
    bodyLarge = TextStyle(
        fontSize = 16.sp,
        color = Color.White
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        color = Color(0xFFB0B0B0)
    ),
    labelMedium = TextStyle(
        fontSize = 12.sp,
        color = Color(0xFF808080)
    )
)

@Composable
fun TourGraphTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TourGraphColors,
        typography = TourGraphTypography,
        content = content
    )
}
