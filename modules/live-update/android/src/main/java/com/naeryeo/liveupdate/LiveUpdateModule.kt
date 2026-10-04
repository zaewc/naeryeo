package com.naeryeo.liveupdate

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.Manifest
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import android.os.Bundle
import java.util.concurrent.atomic.AtomicBoolean
import android.content.Intent
import androidx.core.content.ContextCompat
import com.naeryeo.liveupdate.tracking.TrackingConfig
import com.naeryeo.liveupdate.tracking.TripTrackingService
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.interfaces.permissions.Permissions
import com.naeryeo.liveupdate.model.LiveUpdateValidator
import com.naeryeo.liveupdate.model.ValidationResult

class LiveUpdateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NaeryeoLiveUpdate")
    AsyncFunction("getStatus") { notifications().status() }
    AsyncFunction("requestPermission") { promise: Promise ->
      if (Build.VERSION.SDK_INT < 33) promise.resolve(mapOf("granted" to true))
      else Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.POST_NOTIFICATIONS)
    }
    AsyncFunction("openSettings") { promotion: Boolean -> notifications().openSettings(promotion) }
    AsyncFunction("startLiveActivity") { input: LiveUpdateRecord -> notifications().start(validate(input)) }
    AsyncFunction("updateLiveActivity") { input: LiveUpdateRecord -> notifications().update(validate(input)) }
    AsyncFunction("startTripTracking") { json: String, promise: Promise ->
      val context = appContext.reactContext ?: throw CodedException("ERR_UNAVAILABLE", "React context is unavailable", null)
      val config = try { TrackingConfig.parse(json, System.currentTimeMillis()) }
        catch (error: Exception) { throw CodedException("ERR_INVALID_PAYLOAD", "Invalid tracking configuration", error) }
      val status = notifications().status()
      if (status["activeId"] != null || TripTrackingService.running) throw CodedException("ERR_ALREADY_ACTIVE", "A trip is already active", null)
      if (status["notificationsEnabled"] != true || status["channelEnabled"] != true) throw CodedException("ERR_PERMISSION_DENIED", "Notifications must be enabled", null)
      if (appContext.currentActivity == null) throw CodedException("ERR_UNAVAILABLE", "Start from the visible application", null)
      val settled = AtomicBoolean(false)
      val handler = Handler(Looper.getMainLooper())
      val receiver = object : ResultReceiver(handler) {
        override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
          if (!settled.compareAndSet(false, true)) return
          if (resultCode == 0) promise.resolve(null)
          else promise.reject("ERR_NATIVE_FAILURE", "The tracking service could not start", null)
        }
      }
      ContextCompat.startForegroundService(context, Intent(context, TripTrackingService::class.java)
        .putExtra("config", json).putExtra("result", receiver))
      handler.postDelayed({
        if (settled.compareAndSet(false, true)) {
          TripTrackingService.end(context, config.id)
          promise.reject("ERR_NATIVE_FAILURE", "Tracking service startup timed out", null)
        }
      }, 5000)
    }
    AsyncFunction("getTripTracking") {
      val context = appContext.reactContext ?: throw CodedException("ERR_UNAVAILABLE", "React context is unavailable", null)
      TripTrackingService.snapshot(context)
    }
    AsyncFunction("endTripTracking") { id: String ->
      val context = appContext.reactContext ?: throw CodedException("ERR_UNAVAILABLE", "React context is unavailable", null)
      when (LiveUpdateValidator.validateId(id)) {
        is ValidationResult.Valid -> TripTrackingService.end(context, id)
        is ValidationResult.Invalid -> throw CodedException("ERR_INVALID_PAYLOAD", "Invalid trip ID", null)
      }
    }
    AsyncFunction("endLiveActivity") { id: String ->
      when (val result = LiveUpdateValidator.validateId(id)) {
        is ValidationResult.Valid -> {
          val context = appContext.reactContext ?: throw CodedException("ERR_UNAVAILABLE", "React context is unavailable", null)
          TripTrackingService.end(context, result.value)
        }
        is ValidationResult.Invalid -> throw CodedException("ERR_INVALID_PAYLOAD", result.violations.joinToString("; "), null)
      }
    }
  }

  private fun notifications() = LiveUpdateNotifications(appContext.reactContext
    ?: throw CodedException("ERR_UNAVAILABLE", "React context is unavailable", null))

  private fun validate(input: LiveUpdateRecord) = when (val result = LiveUpdateValidator.validate(input.toInput())) {
    is ValidationResult.Valid -> result.value
    is ValidationResult.Invalid -> throw CodedException("ERR_INVALID_PAYLOAD", result.violations.joinToString("; "), null)
  }
}
