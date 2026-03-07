package com.nikhilsi.tourgraph.ui.sixdegrees

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nikhilsi.tourgraph.ui.common.HapticManager
import com.nikhilsi.tourgraph.ui.common.ShareUtils
import com.nikhilsi.tourgraph.ui.common.TourCard
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SixDegreesScreen(
    viewModel: TourGraphViewModel,
    onSettingsClick: () -> Unit
) {
    val chain by viewModel.currentChain.collectAsState()
    val chainTours by viewModel.chainTours.collectAsState()
    val isLoading by viewModel.sixDegreesLoading.collectAsState()
    val favorites by viewModel.favorites.tourIds.collectAsState()
    val hapticsEnabled by viewModel.settings.hapticsEnabled.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        if (chain == null) viewModel.loadRandomChain()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Six Degrees",
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
            chain?.let { currentChain ->
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp)
                ) {
                    // Header
                    item {
                        Column(modifier = Modifier.padding(bottom = 16.dp)) {
                            Text(
                                "Cities connected through surprising tours",
                                color = Color.White.copy(alpha = 0.5f),
                                fontSize = 14.sp,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            Button(
                                onClick = {
                                    if (hapticsEnabled) HapticManager.showMeAnother(context)
                                    viewModel.loadRandomChain()
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary
                                )
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Text("Show Me Another", modifier = Modifier.padding(start = 8.dp))
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // City pair
                            Text(
                                text = "${currentChain.cityFrom} \u2192 ${currentChain.cityTo}",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp
                            )

                            // Summary
                            Text(
                                text = currentChain.summary,
                                color = Color.White.copy(alpha = 0.7f),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(top = 4.dp)
                            )

                            // Share
                            Row(
                                modifier = Modifier.padding(top = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(
                                    onClick = {
                                        ShareUtils.shareChain(
                                            context,
                                            currentChain.cityFrom,
                                            currentChain.cityTo,
                                            currentChain.summary
                                        )
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.Share,
                                        contentDescription = "Share chain",
                                        tint = Color.White.copy(alpha = 0.7f)
                                    )
                                }
                            }
                        }
                    }

                    // Timeline stops
                    itemsIndexed(currentChain.links) { index, link ->
                        val tour = chainTours[link.tourId]
                        val isLast = index == currentChain.links.lastIndex

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(IntrinsicSize.Min)
                        ) {
                            // Timeline indicator
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .width(40.dp)
                                    .fillMaxHeight()
                            ) {
                                // Numbered circle
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier
                                        .size(30.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary)
                                ) {
                                    Text(
                                        text = "${index + 1}",
                                        color = Color.Black,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                }

                                // Connecting line
                                if (!isLast) {
                                    Box(
                                        modifier = Modifier
                                            .width(3.dp)
                                            .weight(1f)
                                            .background(Color.White.copy(alpha = 0.3f))
                                    )
                                }
                            }

                            // Stop content
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(start = 12.dp, bottom = if (isLast) 0.dp else 16.dp)
                            ) {
                                // Card
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White.copy(alpha = 0.05f)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        // City + theme
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "${link.city}, ${link.country}",
                                                color = Color.White,
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 14.sp,
                                                modifier = Modifier.weight(1f)
                                            )
                                            link.theme?.let { theme ->
                                                Surface(
                                                    shape = RoundedCornerShape(8.dp),
                                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                                                ) {
                                                    Text(
                                                        text = theme,
                                                        color = MaterialTheme.colorScheme.primary,
                                                        fontSize = 11.sp,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }

                                        // Tour card (if available)
                                        tour?.let {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            TourCard(
                                                tour = it,
                                                isFavorite = favorites.contains(it.id),
                                                onFavoriteToggle = { viewModel.favorites.toggle(it.id) },
                                                onClick = { viewModel.openTourDetail(it.id) }
                                            )
                                        } ?: run {
                                            // Fallback: show tour title from chain data
                                            Text(
                                                text = link.tourTitle,
                                                color = Color.White.copy(alpha = 0.85f),
                                                fontSize = 14.sp,
                                                modifier = Modifier.padding(top = 4.dp),
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }

                                // Connection text
                                if (!isLast) {
                                    link.connectionToNext?.let { connection ->
                                        Text(
                                            text = connection,
                                            color = Color(0xFFFFD54F).copy(alpha = 0.8f),
                                            fontSize = 13.sp,
                                            fontStyle = FontStyle.Italic,
                                            modifier = Modifier.padding(
                                                top = 8.dp,
                                                bottom = 4.dp,
                                                start = 4.dp
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}
