package com.nikhilsi.tourgraph.ui.common

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object HapticManager {

    private fun vibrator(context: Context): Vibrator {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            manager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    fun swipe(context: Context) {
        vibrate(context, 20, VibrationEffect.EFFECT_CLICK)
    }

    fun favorite(context: Context) {
        vibrate(context, 15, VibrationEffect.EFFECT_TICK)
    }

    fun unfavorite(context: Context) {
        vibrate(context, 10, VibrationEffect.EFFECT_TICK)
    }

    fun superlativeTap(context: Context) {
        vibrate(context, 25, VibrationEffect.EFFECT_HEAVY_CLICK)
    }

    fun showMeAnother(context: Context) {
        vibrate(context, 12, VibrationEffect.EFFECT_TICK)
    }

    private fun vibrate(context: Context, durationMs: Long, effectId: Int) {
        val v = vibrator(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            v.vibrate(VibrationEffect.createPredefined(effectId))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(durationMs)
        }
    }
}
