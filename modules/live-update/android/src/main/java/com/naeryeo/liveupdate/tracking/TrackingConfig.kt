package com.naeryeo.liveupdate.tracking

import java.net.URI
import org.json.JSONObject
import com.naeryeo.liveupdate.model.LiveUpdateValidator
import com.naeryeo.liveupdate.model.ValidationResult

data class TrackingConfig(val id: String, val routeId: String, val routeName: String, val vehicleId: String,
  val registration: String, val boarding: Int, val destination: Int, val stops: List<TrackingStop>,
  val endpoint: String, val initialSequence: Int, val initialObservedAt: Long, val startedAt: Long) {
  companion object {
    private fun integer(value: JSONObject, key: String): Int {
      val raw = value.get(key)
      require(raw is Number && raw.toDouble().isFinite() && raw.toDouble() % 1.0 == 0.0 && raw.toDouble() in 0.0..Int.MAX_VALUE.toDouble())
      return raw.toInt()
    }
    private fun timestamp(value: JSONObject, key: String): Long {
      val raw = value.get(key)
      require(raw is Number && raw.toDouble().isFinite() && raw.toDouble() % 1.0 == 0.0 && raw.toDouble() in 1.0..8640000000000000.0)
      return raw.toLong()
    }
    fun parse(json: String, now: Long): TrackingConfig {
      require(json.length <= 100000)
      val objectValue = JSONObject(json)
      val id = objectValue.getString("id")
      require(LiveUpdateValidator.validateId(id) is ValidationResult.Valid)
      val endpoint = objectValue.getString("endpoint")
      val uri = URI(endpoint)
      require(uri.userInfo == null && uri.query == null && uri.fragment == null)
      require(uri.scheme == "https" || (uri.scheme == "http" && uri.host in listOf("127.0.0.1", "localhost", "10.0.2.2")))
      require(!uri.host.isNullOrBlank())
      val routeId = objectValue.getString("routeId")
      require(routeId.matches(Regex("^[0-9]+$")))
      val vehicleId = objectValue.getString("vehicleId")
      require(vehicleId.isNotBlank() && vehicleId.length <= 64)
      val routeName = objectValue.getString("routeName")
      require(routeName.isNotBlank() && routeName.length <= 60)
      val registration = objectValue.getString("registration")
      require(registration.isNotBlank() && registration.length <= 30)
      val stopArray = objectValue.getJSONArray("stops")
      val stops = (0 until stopArray.length()).map { index ->
        val item = stopArray.getJSONObject(index)
        TrackingStop(item.getString("id"), item.getString("name"), integer(item, "sequence"))
      }
      require(stops.all { it.name.length <= 80 && it.id.length <= 64 })
      val config = TrackingConfig(id, routeId, routeName, vehicleId, registration,
        integer(objectValue, "boardingSequence"), integer(objectValue, "destinationSequence"), stops, endpoint,
        integer(objectValue, "initialSequence"), timestamp(objectValue, "initialObservedAt"), timestamp(objectValue, "startedAt"))
      require(config.startedAt > 0 && config.startedAt <= now && now - config.startedAt < 2 * 60 * 60 * 1000L)
      val progress = TripProgress.calculate(stops, config.boarding, config.destination, routeId, vehicleId,
        TrackingObservation(routeId, vehicleId, config.initialSequence, config.initialObservedAt), now)
      require(!progress.stale && progress.stops.remainingStops > 0 && config.initialSequence >= config.boarding)
      return config
    }
  }
}
