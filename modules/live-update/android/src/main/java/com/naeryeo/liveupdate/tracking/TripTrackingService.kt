package com.naeryeo.liveupdate.tracking

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.ResultReceiver
import androidx.core.app.ServiceCompat
import com.naeryeo.liveupdate.LiveUpdateNotifications
import com.naeryeo.liveupdate.model.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** User-started network sync for one selected vehicle. No JS runtime is needed to update it. */
class TripTrackingService : Service() {
  private val executor = Executors.newSingleThreadScheduledExecutor()
  private val notifications by lazy { LiveUpdateNotifications(this) }
  private var config: TrackingConfig? = null
  private var configJson: String? = null
  private var lastObservation: TrackingObservation? = null
  private var lastPhase: LiveUpdatePhase? = null
  @Volatile private var stopped = false
  @Volatile private var preserveArrival = false

  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "naeryeo.STOP_TRIP") {
      val id = intent.getStringExtra("tripId")
      if (id != null) end(this, id)
      if (config == null) stopSelf()
      return START_NOT_STICKY
    }
    @Suppress("DEPRECATION")
    val receiver = intent?.getParcelableExtra<ResultReceiver>("result")
    if (config != null) { receiver?.send(1, null); return START_NOT_STICKY }
    try {
      val json = intent?.getStringExtra("config") ?: throw IllegalArgumentException()
      val value = TrackingConfig.parse(json, System.currentTimeMillis())
      config = value; configJson = json; running = true; instance = this
      lastObservation = TrackingObservation(value.routeId, value.vehicleId, value.initialSequence, value.initialObservedAt)
      val progress = calculate(value, lastObservation!!)
      publish(value, progress, lastObservation!!, null)
      receiver?.send(0, null)
      executor.scheduleWithFixedDelay({ poll() }, 0, 15, TimeUnit.SECONDS)
    } catch (_: Exception) { receiver?.send(1, null); finish(false) }
    return START_NOT_STICKY
  }

  private fun calculate(value: TrackingConfig, observation: TrackingObservation) = TripProgress.calculate(value.stops,
    value.boarding, value.destination, value.routeId, value.vehicleId, observation, System.currentTimeMillis(), lastObservation?.sequence)

  private fun poll() {
    if (stopped) return
    val value = config ?: return
    if (System.currentTimeMillis() - value.startedAt >= 2 * 60 * 60 * 1000L) { finish(false); return }
    try {
      val requestedAt = System.currentTimeMillis()
      val connection = URL(value.endpoint).openConnection() as HttpURLConnection
      connection.connectTimeout = 10000; connection.readTimeout = 10000
      connection.instanceFollowRedirects = false
      val observations = try {
        require(connection.responseCode == 200)
        val body = connection.inputStream.bufferedReader().use { reader ->
          val buffer = CharArray(4096)
          val text = StringBuilder()
          while (true) {
            val count = reader.read(buffer)
            if (count < 0) break
            require(text.length + count <= 100000)
            text.append(buffer, 0, count)
          }
          text.toString()
        }
        JSONArray(body)
      } finally { connection.disconnect() }
      val item = (0 until observations.length()).map { observations.getJSONObject(it) }
        .firstOrNull { it.getString("vehicleId") == value.vehicleId && it.getString("routeId") == value.routeId }
        ?: throw IllegalArgumentException()
      val sequence = item.get("reachedSequence")
      val age = item.get("ageMs")
      require(sequence is Number && sequence.toDouble() % 1.0 == 0.0 && sequence.toDouble() in 0.0..Int.MAX_VALUE.toDouble())
      require(age is Number && age.toDouble().isFinite() && age.toDouble() % 1.0 == 0.0 && age.toDouble() in 0.0..86400000.0)
      val observation = TrackingObservation(item.getString("routeId"), item.getString("vehicleId"), sequence.toInt(), requestedAt - age.toLong())
      val progress = calculate(value, observation)
      require(!progress.stale)
      if (stopped) return
      publish(value, progress, observation, null)
      lastObservation = observation
      if (progress.phase == LiveUpdatePhase.ARRIVED) finish(true)
    } catch (_: Exception) {
      val previous = lastObservation ?: return
      try { if (!stopped) publish(value, calculate(value, previous), previous, "버스 위치를 다시 확인하고 있어요. 안내 방송도 함께 확인해 주세요.") }
      catch (_: Exception) { finish(false) }
    }
  }

  @Synchronized private fun publish(value: TrackingConfig, progress: TrackingProgress, observation: TrackingObservation, error: String?) {
    if (stopped) return
    val destination = value.stops.first { it.sequence == value.destination }
    val phase = progress.phase
    val label = when (phase) {
      LiveUpdatePhase.TRACKING -> "${progress.stops.remainingStops}정거장"
      LiveUpdatePhase.APPROACHING -> "하차 준비"
      LiveUpdatePhase.ARRIVED -> "도착"
    }
    val request = LiveUpdateRequest(value.id, LiveUpdateContent(
      "${destination.name} · $label", error ?: if (progress.stale) "위치 정보가 오래되었어요. 안내 방송을 확인해 주세요."
        else when (phase) {
          LiveUpdatePhase.APPROACHING -> "다음 정류장에서 내려 주세요."
          LiveUpdatePhase.ARRIVED -> "목적지에 도착했어요. 주변을 확인하고 내려 주세요."
          else -> "다음 정류장: ${progress.nextStop?.name ?: destination.name}"
        }, value.routeName, if (error != null || progress.stale) "확인 중" else label,
      phase, progress.stops, null), error == null && !progress.stale && phase != LiveUpdatePhase.TRACKING && phase != lastPhase)
    ServiceCompat.startForeground(this, LiveUpdateNotifications.TRACKING_NOTIFICATION_ID, notifications.build(request),
      if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0)
    if (error == null) lastPhase = phase
    val snapshot = JSONObject().put("config", JSONObject(configJson!!)).put("reachedSequence", observation.sequence)
      .put("observedAt", observation.observedAt).put("phase", phase.wireName).put("error", error ?: JSONObject.NULL)
    preferences(this).edit().putString("snapshot", snapshot.toString()).apply()
  }

  @Synchronized private fun finish(arrived: Boolean) {
    stopped = true; running = false; preserveArrival = arrived; instance = null
    executor.shutdownNow()
    stopForeground(if (arrived) STOP_FOREGROUND_DETACH else STOP_FOREGROUND_REMOVE)
    if (!arrived) preferences(this).edit().remove("snapshot").apply()
    stopSelf()
  }
  override fun onTimeout(startId: Int, fgsType: Int) { finish(false) }
  override fun onDestroy() {
    stopped = true; running = false; instance = null; executor.shutdownNow()
    if (!preserveArrival) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      // Retain the snapshot as interrupted so the UI can explain a stopped service.
    }
    super.onDestroy()
  }
  companion object {
    @Volatile private var instance: TripTrackingService? = null
    @Volatile var running = false
    fun preferences(context: Context) = context.getSharedPreferences("naeryeo-tracking", Context.MODE_PRIVATE)
    fun snapshot(context: Context): String? {
      val saved = preferences(context).getString("snapshot", null) ?: return null
      return JSONObject(saved).put("running", running).toString()
    }
    fun end(context: Context, id: String) {
      val saved = preferences(context).getString("snapshot", null)
      if (saved == null || JSONObject(saved).getJSONObject("config").getString("id") == id) {
        instance?.takeIf { it.config?.id == id }?.finish(false)
        context.stopService(Intent(context, TripTrackingService::class.java))
        preferences(context).edit().remove("snapshot").apply()
      }
      LiveUpdateNotifications(context).end(id)
    }
  }
}
