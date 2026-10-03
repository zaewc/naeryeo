package com.naeryeo.liveupdate

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.Manifest
import android.os.Build
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
    AsyncFunction("endLiveActivity") { id: String ->
      when (val result = LiveUpdateValidator.validateId(id)) {
        is ValidationResult.Valid -> notifications().end(result.value)
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
