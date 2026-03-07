package com.nikhilsi.tourgraph.ui.rightnow

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nikhilsi.tourgraph.ui.common.TourCard
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RightNowScreen(
    viewModel: TourGraphViewModel,
    onSettingsClick: () -> Unit
) {
    val moments by viewModel.rightNowMoments.collectAsState()
    val isLoading by viewModel.rightNowLoading.collectAsState()
    val favorites by viewModel.favorites.tourIds.collectAsState()

    LaunchedEffect(Unit) {
        if (moments.isEmpty()) viewModel.loadRightNow()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Right Now Somewhere",
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
                        "Tours happening at the perfect time of day",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 14.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                items(moments) { moment ->
                    MomentCard(
                        moment = moment,
                        isFavorite = favorites.contains(moment.tour.id),
                        onFavoriteToggle = { viewModel.favorites.toggle(moment.tour.id) },
                        onClick = { viewModel.openTourDetail(moment.tour.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun MomentCard(
    moment: TourGraphViewModel.RightNowMoment,
    isFavorite: Boolean,
    onFavoriteToggle: () -> Unit,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White.copy(alpha = 0.05f)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Time + location header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.AccessTime,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "${moment.timezoneInfo.localTimeFormatted} ${moment.timezoneInfo.timeOfDay}",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
                moment.tour.destinationName?.let { dest ->
                    Text(
                        text = "in $dest",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            TourCard(
                tour = moment.tour,
                isFavorite = isFavorite,
                onFavoriteToggle = onFavoriteToggle,
                onClick = onClick
            )
        }
    }
}
