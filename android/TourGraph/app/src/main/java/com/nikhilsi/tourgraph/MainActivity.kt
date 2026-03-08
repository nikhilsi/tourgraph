package com.nikhilsi.tourgraph

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import com.nikhilsi.tourgraph.theme.TourGraphTheme
import com.nikhilsi.tourgraph.ui.navigation.TourGraphNavGraph
import com.nikhilsi.tourgraph.viewmodel.TourGraphViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )
        setContent {
            TourGraphTheme {
                val viewModel: TourGraphViewModel = viewModel()
                val isLoading by viewModel.isLoading.collectAsState()
                val loadError by viewModel.loadError.collectAsState()

                when {
                    isLoading -> LoadingScreen()
                    loadError != null -> ErrorScreen(loadError!!)
                    else -> {
                        val navController = rememberNavController()

                        // Handle deep link from intent
                        LaunchedEffect(Unit) {
                            handleDeepLink(intent, viewModel, navigateTab = { route ->
                                navController.navigate(route) {
                                    popUpTo(navController.graph.startDestinationId) { saveState = false }
                                    launchSingleTop = true
                                }
                            })
                        }

                        TourGraphNavGraph(
                            navController = navController,
                            viewModel = viewModel
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun handleDeepLink(
        intent: Intent?,
        viewModel: TourGraphViewModel,
        navigateTab: (String) -> Unit
    ) {
        val uri = intent?.data ?: return
        if (uri.scheme != "tourgraph") return

        when (uri.host) {
            "tab" -> {
                val tab = uri.lastPathSegment
                when (tab) {
                    "roulette" -> navigateTab("roulette")
                    "rightnow" -> navigateTab("rightnow")
                    "worldsmost" -> navigateTab("worldsmost")
                    "sixdegrees" -> navigateTab("sixdegrees")
                }
            }
            "tour" -> {
                val tourId = uri.lastPathSegment?.toIntOrNull()
                if (tourId != null) {
                    viewModel.openTourDetail(tourId)
                }
            }
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Text(
                text = "Loading tours...",
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}

@Composable
private fun ErrorScreen(error: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Error: $error",
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(32.dp)
        )
    }
}
