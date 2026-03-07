package com.nikhilsi.tourgraph.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: TourGraphViewModel,
    onAboutClick: () -> Unit,
    onFavoritesClick: () -> Unit,
    onDismiss: () -> Unit
) {
    val hapticsEnabled by viewModel.settings.hapticsEnabled.collectAsState()
    val favoriteCount by viewModel.favorites.tourIds.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = Color.White
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
        ) {
            // Haptics toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Haptic Feedback", color = Color.White, fontSize = 16.sp)
                    Text(
                        "Vibration on interactions",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 13.sp
                    )
                }
                Switch(
                    checked = hapticsEnabled,
                    onCheckedChange = { viewModel.settings.setHapticsEnabled(it) },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = MaterialTheme.colorScheme.primary,
                        checkedTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                    )
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            // Favorites
            SettingsRow(
                icon = Icons.Default.Favorite,
                title = "Favorites",
                subtitle = "${favoriteCount.size} saved tours",
                onClick = onFavoritesClick
            )

            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            // About
            SettingsRow(
                icon = Icons.Default.Info,
                title = "About TourGraph",
                onClick = onAboutClick
            )

            HorizontalDivider(color = Color.White.copy(alpha = 0.1f))

            // Website
            SettingsRow(
                icon = Icons.Default.Language,
                title = "Visit tourgraph.ai",
                onClick = {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://tourgraph.ai"))
                    )
                }
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Stats
            val tourCount = viewModel.getTourCount()
            val destCount = viewModel.getDestinationCount()
            Text(
                text = "%,d tours \u2022 %,d destinations".format(tourCount, destCount),
                color = Color.White.copy(alpha = 0.3f),
                fontSize = 12.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}

@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = Color.White, fontSize = 16.sp)
            subtitle?.let {
                Text(it, color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
            }
        }
        Icon(
            Icons.AutoMirrored.Filled.ArrowForwardIos,
            contentDescription = null,
            tint = Color.White.copy(alpha = 0.3f),
            modifier = Modifier.padding(end = 4.dp)
        )
    }
}
