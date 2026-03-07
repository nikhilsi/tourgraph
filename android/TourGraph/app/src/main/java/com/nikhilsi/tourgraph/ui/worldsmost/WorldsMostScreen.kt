package com.nikhilsi.tourgraph.ui.worldsmost

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nikhilsi.tourgraph.model.SuperlativeResult
import com.nikhilsi.tourgraph.model.SuperlativeType
import com.nikhilsi.tourgraph.ui.common.HapticManager
import com.nikhilsi.tourgraph.ui.common.TourCard
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorldsMostScreen(
    viewModel: TourGraphViewModel,
    onSettingsClick: () -> Unit
) {
    val superlatives by viewModel.superlatives.collectAsState()
    val isLoading by viewModel.worldsMostLoading.collectAsState()
    val favorites by viewModel.favorites.tourIds.collectAsState()
    val hapticsEnabled by viewModel.settings.hapticsEnabled.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        if (superlatives.isEmpty()) viewModel.loadSuperlatives()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "The World's Most",
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp
                    )
                },
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color.White.copy(alpha = 0.7f)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = Color.White
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Text(
                        "Daily superlatives from 136,000+ tours worldwide",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 14.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                items(superlatives) { result ->
                    SuperlativeCard(
                        result = result,
                        isFavorite = favorites.contains(result.tour.id),
                        onFavoriteToggle = { viewModel.favorites.toggle(result.tour.id) },
                        onClick = {
                            if (hapticsEnabled) HapticManager.superlativeTap(context)
                            viewModel.openTourDetail(result.tour.id)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun SuperlativeCard(
    result: SuperlativeResult,
    isFavorite: Boolean,
    onFavoriteToggle: () -> Unit,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White.copy(alpha = 0.05f)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Superlative header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Text(
                    text = "${result.type.emoji} ${result.type.displayTitle}",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                // Stat highlight
                val statText = when (result.type) {
                    SuperlativeType.MOST_EXPENSIVE, SuperlativeType.CHEAPEST_5_STAR ->
                        result.tour.displayPrice
                    SuperlativeType.LONGEST, SuperlativeType.SHORTEST ->
                        result.tour.displayDuration
                    SuperlativeType.MOST_REVIEWED ->
                        "${result.tour.reviewCount?.let { "%,d".format(it) } ?: "?"} reviews"
                    SuperlativeType.HIDDEN_GEM ->
                        "${result.tour.displayRating} stars"
                }
                Text(
                    text = statText,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }

            TourCard(
                tour = result.tour,
                isFavorite = isFavorite,
                onFavoriteToggle = onFavoriteToggle,
                onClick = onClick
            )
        }
    }
}
