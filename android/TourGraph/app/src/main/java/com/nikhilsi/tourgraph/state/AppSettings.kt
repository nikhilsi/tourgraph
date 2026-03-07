package com.nikhilsi.tourgraph.state

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AppSettings(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("tourgraph_settings", Context.MODE_PRIVATE)

    private val _hapticsEnabled = MutableStateFlow(
        prefs.getBoolean("hapticsEnabled", true)
    )
    val hapticsEnabled: StateFlow<Boolean> = _hapticsEnabled.asStateFlow()

    fun setHapticsEnabled(enabled: Boolean) {
        _hapticsEnabled.value = enabled
        prefs.edit().putBoolean("hapticsEnabled", enabled).apply()
    }
}
