package com.naeryeo.liveupdate.tracking

import com.naeryeo.liveupdate.model.LiveUpdatePhase
import com.naeryeo.liveupdate.model.StopProgress

data class TrackingStop(val id: String, val name: String, val sequence: Int)
data class TrackingObservation(val routeId: String, val vehicleId: String, val sequence: Int, val observedAt: Long)
data class TrackingProgress(val stops: StopProgress, val phase: LiveUpdatePhase, val nextStop: TrackingStop?, val stale: Boolean)

/** Pure progress calculation. Vehicle identity and route sequence are both checked. */
object TripProgress {
  fun calculate(stops: List<TrackingStop>, boarding: Int, destination: Int,
    routeId: String, vehicleId: String, observation: TrackingObservation, now: Long, previousSequence: Int? = null): TrackingProgress {
    require(stops.isNotEmpty() && stops.size <= 300)
    require(stops.all { it.id.isNotBlank() && it.name.isNotBlank() && it.sequence >= 0 })
    require(stops.zipWithNext().all { (a, b) -> a.sequence < b.sequence })
    require(stops.any { it.sequence == boarding } && stops.any { it.sequence == destination } && boarding < destination)
    require(observation.routeId == routeId && observation.vehicleId == vehicleId)
    require(observation.observedAt > 0 && observation.observedAt <= now)
    require(stops.any { it.sequence == observation.sequence })
    require(previousSequence == null || observation.sequence >= previousSequence)
    val journey = stops.filter { it.sequence > boarding && it.sequence <= destination }
    val progress = StopProgress(journey.size, journey.count { it.sequence <= observation.sequence })
    val phase = when (progress.remainingStops) {
      0 -> LiveUpdatePhase.ARRIVED
      1 -> LiveUpdatePhase.APPROACHING
      else -> LiveUpdatePhase.TRACKING
    }
    return TrackingProgress(progress, phase, journey.firstOrNull { it.sequence > observation.sequence }, now - observation.observedAt > 60000)
  }
}
