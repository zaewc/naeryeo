package com.naeryeo.liveupdate.model

import com.naeryeo.liveupdate.tracking.*
import org.junit.Assert.*
import org.junit.Test

class TripProgressTest {
  private val stops = listOf(TrackingStop("a", "탑승", 10), TrackingStop("b", "중간", 20),
    TrackingStop("a", "재방문", 30), TrackingStop("d", "목적지", 40))
  private fun progress(sequence: Int, at: Long = 1000, now: Long = 1000, previous: Int? = null) =
    TripProgress.calculate(stops, 10, 40, "route", "bus", TrackingObservation("route", "bus", sequence, at), now, previous)
  @Test fun countsActualStopsIncludingReturnVisit() {
    assertEquals(3, progress(10).stops.remainingStops)
    assertEquals(1, progress(30).stops.remainingStops)
    assertEquals(LiveUpdatePhase.APPROACHING, progress(30).phase)
    assertEquals(LiveUpdatePhase.ARRIVED, progress(40).phase)
  }
  @Test fun detectsStaleObservations() { assertTrue(progress(20, 1000, 62000).stale) }
  @Test(expected = IllegalArgumentException::class) fun rejectsRegressingVehicleSequence() { progress(20, previous = 30) }
  @Test(expected = IllegalArgumentException::class) fun rejectsUnknownSequence() { progress(25) }
  @Test(expected = IllegalArgumentException::class) fun rejectsDifferentVehicle() {
    TripProgress.calculate(stops, 10, 40, "route", "bus", TrackingObservation("route", "other", 20, 1000), 1000)
  }
  @Test(expected = IllegalArgumentException::class) fun rejectsReverseDestination() {
    TripProgress.calculate(stops, 30, 10, "route", "bus", TrackingObservation("route", "bus", 30, 1000), 1000)
  }
}
