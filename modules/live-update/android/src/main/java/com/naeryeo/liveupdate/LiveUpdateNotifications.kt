package com.naeryeo.liveupdate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.net.Uri
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.IconCompat
import com.naeryeo.liveupdate.model.*
import com.naeryeo.liveupdate.tracking.TripTrackingService
import expo.modules.kotlin.exception.CodedException

/** Shared public-API notification factory for diagnostic and native tracking flows. */
class LiveUpdateNotifications(private val context: Context) {
  private val manager = context.getSystemService(NotificationManager::class.java)

  private fun channel(): NotificationChannel? {
    if (Build.VERSION.SDK_INT < 26) return null
    val channel = NotificationChannel(CHANNEL, context.getString(R.string.naeryeo_live_update_channel_name),
      NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = context.getString(R.string.naeryeo_live_update_channel_description)
      enableVibration(true)
    }
    manager.createNotificationChannel(channel)
    return manager.getNotificationChannel(CHANNEL)
  }

  fun status(): Map<String, Any?> {
    val currentChannel = channel()
    val active = manager.activeNotifications.filter { it.tag?.startsWith(TAG_PREFIX) == true || it.notification.extras.getString(TRIP_ID) != null }
    return mapOf(
      "sdkVersion" to Build.VERSION.SDK_INT,
      "notificationsEnabled" to NotificationManagerCompat.from(context).areNotificationsEnabled(),
      "channelEnabled" to ((currentChannel?.importance ?: NotificationManager.IMPORTANCE_DEFAULT) > NotificationManager.IMPORTANCE_NONE),
      "liveUpdatesSupported" to (Build.VERSION.SDK_INT >= 36),
      "promotionAllowed" to if (Build.VERSION.SDK_INT >= 36) manager.canPostPromotedNotifications() else false,
      "activeId" to active.firstOrNull()?.let { it.notification.extras.getString(TRIP_ID) ?: it.tag?.removePrefix(TAG_PREFIX) },
      // OS-reported promotion is evidence, but does not prove a Samsung Now Bar is visible.
      "promoted" to (Build.VERSION.SDK_INT >= 36 && active.any {
        it.notification.flags and Notification.FLAG_PROMOTED_ONGOING != 0
      }),
    )
  }

  fun start(request: LiveUpdateRequest) {
    if (request.content.phase != LiveUpdatePhase.TRACKING) fail("ERR_INVALID_TRANSITION", "Start in tracking phase")
    if (manager.activeNotifications.any { it.tag?.startsWith(TAG_PREFIX) == true || it.notification.extras.getString(TRIP_ID) != null }) {
      fail("ERR_ALREADY_ACTIVE", "End the current live update before starting another")
    }
    post(request)
  }

  fun update(request: LiveUpdateRequest) {
    val previous = manager.activeNotifications.firstOrNull { it.tag == TAG_PREFIX + request.id }
      ?: fail("ERR_NOT_ACTIVE", "Live update is no longer active")
    val extras = previous.notification.extras
    val oldPhase = LiveUpdatePhase.fromWireName(extras.getString(PHASE) ?: "")
      ?: fail("ERR_INVALID_TRANSITION", "Previous phase is unavailable")
    val oldStops = StopProgress(extras.getInt(TOTAL), extras.getInt(COMPLETED))
    if (!LiveUpdateTransitions.canUpdate(oldPhase, oldStops, request.content)) {
      fail("ERR_INVALID_TRANSITION", "Phase or stop progress cannot move backwards or skip approaching")
    }
    post(request)
  }

  fun end(id: String) {
    manager.cancel(TAG_PREFIX + id, NOTIFICATION_ID)
    if (manager.activeNotifications.any { it.id == TRACKING_NOTIFICATION_ID && it.notification.extras.getString(TRIP_ID) == id }) {
      manager.cancel(TRACKING_NOTIFICATION_ID)
    }
  }

  fun openSettings(promotion: Boolean) {
    if (Build.VERSION.SDK_INT < 26) {
      context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      return
    }
    val action = if (promotion && Build.VERSION.SDK_INT >= 36) {
      Settings.ACTION_APP_NOTIFICATION_PROMOTION_SETTINGS
    } else Settings.ACTION_APP_NOTIFICATION_SETTINGS
    fun settingsIntent(action: String) = Intent(action)
      .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try { context.startActivity(settingsIntent(action)) }
    catch (_: ActivityNotFoundException) {
      context.startActivity(settingsIntent(Settings.ACTION_APP_NOTIFICATION_SETTINGS))
    }
  }

  private fun post(request: LiveUpdateRequest) {
    try { manager.notify(TAG_PREFIX + request.id, NOTIFICATION_ID, build(request)) }
    catch (error: SecurityException) { throw CodedException("ERR_PERMISSION_DENIED", "Notification permission was revoked", error) }
  }

  fun build(request: LiveUpdateRequest): Notification {
    val currentChannel = channel()
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled() ||
      currentChannel?.importance == NotificationManager.IMPORTANCE_NONE) {
      fail("ERR_PERMISSION_DENIED", "Enable app notifications and the trip progress channel")
    }
    val content = request.content
    val layout = ProgressLayout.of(content.progress)
    val colorRes = when (content.phase) {
      LiveUpdatePhase.TRACKING -> R.color.naeryeo_live_update_transit
      LiveUpdatePhase.APPROACHING -> R.color.naeryeo_live_update_alert
      LiveUpdatePhase.ARRIVED -> R.color.naeryeo_live_update_arrived
    }
    val trackerRes = when (content.phase) {
      LiveUpdatePhase.TRACKING -> R.drawable.naeryeo_live_update_tracker_transit
      LiveUpdatePhase.APPROACHING -> R.drawable.naeryeo_live_update_tracker_alert
      LiveUpdatePhase.ARRIVED -> R.drawable.naeryeo_live_update_tracker_arrived
    }
    val color = ContextCompat.getColor(context, colorRes)
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: fail("ERR_UNAVAILABLE", "Launch activity is unavailable")
    val intent = PendingIntent.getActivity(context, 0, launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(R.drawable.naeryeo_live_update_small_icon)
      .setContentTitle(content.title).setContentText(content.body).setSubText(content.subtitle)
      .setContentIntent(intent).setOngoing(true).setAutoCancel(false)
      .setCategory(NotificationCompat.CATEGORY_NAVIGATION)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(!request.alert).setSilent(!request.alert)
      .setColor(color).setRequestPromotedOngoing(true)
      .setShortCriticalText(content.chipText)
      .addExtras(Bundle().apply {
        putString(TRIP_ID, request.id)
        putString(PHASE, content.phase.wireName)
        putInt(TOTAL, content.progress.totalStops)
        putInt(COMPLETED, content.progress.completedStops)
      })
    if (TripTrackingService.running) {
      val stopIntent = Intent(context, TripTrackingService::class.java).setAction("naeryeo.STOP_TRIP").putExtra("tripId", request.id)
      val stop = PendingIntent.getService(context, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      builder.addAction(0, "이동 종료", stop)
    }
    if (Build.VERSION.SDK_INT >= 36) {
      builder.setStyle(NotificationCompat.ProgressStyle()
        .setProgress(layout.progress)
        .setProgressTrackerIcon(IconCompat.createWithResource(context, trackerRes))
        .setProgressEndIcon(IconCompat.createWithResource(context, R.drawable.naeryeo_live_update_tracker_arrived))
        .setProgressSegments(layout.segments.map { NotificationCompat.ProgressStyle.Segment(it).setColor(color) })
        .setProgressPoints(layout.markers.map {
          NotificationCompat.ProgressStyle.Point(it.position).setColor(
            ContextCompat.getColor(context, if (it.isAlightAlert) R.color.naeryeo_live_update_alert else colorRes))
        }))
    } else {
      builder.setStyle(NotificationCompat.BigTextStyle().bigText(content.body))
        .setProgress(layout.max, layout.progress, false)
    }
    content.etaEpochMillis?.let {
      builder.setWhen(it).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
    }
    // Prevent a stale PoC notification lingering if the user forgets to end it.
    builder.setTimeoutAfter(30 * 60 * 1000L)
    return builder.build()
  }

  private fun fail(code: String, message: String): Nothing = throw CodedException(code, message, null)

  companion object {
    const val TRACKING_NOTIFICATION_ID = 2
    const val TRIP_ID = "naeryeo.tripId"
    private const val CHANNEL = "trip-progress-v1"
    private const val TAG_PREFIX = "naeryeo.live-update:"
    private const val NOTIFICATION_ID = 1
    private const val PHASE = "naeryeo.phase"
    private const val TOTAL = "naeryeo.totalStops"
    private const val COMPLETED = "naeryeo.completedStops"
  }
}
