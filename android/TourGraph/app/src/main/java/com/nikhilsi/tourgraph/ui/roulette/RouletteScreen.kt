package com.nikhilsi.tourgraph.ui.roulette

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nikhilsi.tourgraph.ui.common.HapticManager
import com.nikhilsi.tourgraph.ui.common.ShareUtils
import com.nikhilsi.tourgraph.ui.common.TourCard
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouletteScreen(
    viewModel: TourGraphViewModel,
    onSettingsClick: () -> Unit
) {
    val currentTour by viewModel.currentTour.collectAsState()
    val isLoading by viewModel.rouletteLoading.collectAsState()
    val favorites by viewModel.favorites.tourIds.collectAsState()
    val hapticsEnabled by viewModel.settings.hapticsEnabled.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var dragOffset by remember { mutableFloatStateOf(0f) }
    val animatedOffset by animateFloatAsState(
        targetValue = dragOffset,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "cardOffset"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "TourGraph",
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            } else {
                currentTour?.let { tour ->
                    // Swipeable tour card
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .offset { IntOffset(animatedOffset.roundToInt(), 0) }
                            .graphicsLayer {
                                rotationZ = animatedOffset / 20f
                            }
                            .pointerInput(Unit) {
                                detectHorizontalDragGestures(
                                    onDragEnd = {
                                        if (kotlin.math.abs(dragOffset) > 100) {
                                            if (hapticsEnabled) HapticManager.swipe(context)
                                            viewModel.spin()
                                        }
                                        dragOffset = 0f
                                    },
                                    onDragCancel = { dragOffset = 0f },
                                    onHorizontalDrag = { _, dragAmount ->
                                        dragOffset += dragAmount
                                    }
                                )
                            }
                    ) {
                        TourCard(
                            tour = tour,
                            isFavorite = favorites.contains(tour.id),
                            onFavoriteToggle = {
                                if (hapticsEnabled) {
                                    if (favorites.contains(tour.id)) HapticManager.unfavorite(context)
                                    else HapticManager.favorite(context)
                                }
                                viewModel.favorites.toggle(tour.id)
                            },
                            onClick = { viewModel.openTourDetail(tour.id) }
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Controls
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { scope.launch { ShareUtils.shareTour(context, tour) } }) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = "Share",
                                tint = Color.White.copy(alpha = 0.7f)
                            )
                        }

                        Button(
                            onClick = {
                                if (hapticsEnabled) HapticManager.swipe(context)
                                viewModel.spin()
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                "Show Me Another",
                                modifier = Modifier.padding(start = 8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
