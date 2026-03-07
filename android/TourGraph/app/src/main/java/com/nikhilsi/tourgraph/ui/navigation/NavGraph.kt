package com.nikhilsi.tourgraph.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.nikhilsi.tourgraph.ui.detail.TourDetailScreen
import com.nikhilsi.tourgraph.ui.rightnow.RightNowScreen
import com.nikhilsi.tourgraph.ui.roulette.RouletteScreen
import com.nikhilsi.tourgraph.ui.settings.AboutScreen
import com.nikhilsi.tourgraph.ui.settings.FavoritesScreen
import com.nikhilsi.tourgraph.ui.settings.SettingsScreen
import com.nikhilsi.tourgraph.ui.sixdegrees.SixDegreesScreen
import com.nikhilsi.tourgraph.ui.worldsmost.WorldsMostScreen
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

data class TabItem(
    val label: String,
    val icon: ImageVector,
    val route: String
)

val tabs = listOf(
    TabItem("Roulette", Icons.Default.Casino, "roulette"),
    TabItem("Right Now", Icons.Default.Schedule, "rightnow"),
    TabItem("World's Most", Icons.Default.EmojiEvents, "worldsmost"),
    TabItem("Six Degrees", Icons.Default.Language, "sixdegrees")
)

@Composable
fun TourGraphNavGraph(
    navController: NavHostController,
    viewModel: TourGraphViewModel
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val showTourDetail by viewModel.showTourDetail.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                NavigationBar(
                    containerColor = Color(0xFF111111),
                    contentColor = Color.White
                ) {
                    tabs.forEachIndexed { index, tab ->
                        NavigationBarItem(
                            selected = selectedTab == index,
                            onClick = {
                                if (selectedTab != index) {
                                    selectedTab = index
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.startDestinationId) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    tab.icon,
                                    contentDescription = tab.label
                                )
                            },
                            label = { Text(tab.label, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = Color.White.copy(alpha = 0.4f),
                                unselectedTextColor = Color.White.copy(alpha = 0.4f),
                                indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                            )
                        )
                    }
                }
            },
            containerColor = MaterialTheme.colorScheme.background
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = "roulette",
                modifier = Modifier.padding(padding)
            ) {
                composable("roulette") {
                    RouletteScreen(
                        viewModel = viewModel,
                        onSettingsClick = { navController.navigate("settings") }
                    )
                }
                composable("rightnow") {
                    RightNowScreen(
                        viewModel = viewModel,
                        onSettingsClick = { navController.navigate("settings") }
                    )
                }
                composable("worldsmost") {
                    WorldsMostScreen(
                        viewModel = viewModel,
                        onSettingsClick = { navController.navigate("settings") }
                    )
                }
                composable("sixdegrees") {
                    SixDegreesScreen(
                        viewModel = viewModel,
                        onSettingsClick = { navController.navigate("settings") }
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        viewModel = viewModel,
                        onAboutClick = { navController.navigate("about") },
                        onFavoritesClick = { navController.navigate("favorites") },
                        onDismiss = { navController.popBackStack() }
                    )
                }
                composable("about") {
                    AboutScreen(onBack = { navController.popBackStack() })
                }
                composable("favorites") {
                    FavoritesScreen(
                        viewModel = viewModel,
                        onBack = { navController.popBackStack() }
                    )
                }
            }
        }

        // Tour detail overlay
        AnimatedVisibility(
            visible = showTourDetail,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
            ) {
                TourDetailScreen(
                    viewModel = viewModel,
                    onDismiss = { viewModel.closeTourDetail() }
                )
            }
        }
    }
}
