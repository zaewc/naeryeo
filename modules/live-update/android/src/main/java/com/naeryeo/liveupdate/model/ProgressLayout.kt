package com.naeryeo.liveupdate.model

/**
 * Geometry of the Live Update progress bar, independent of the Android notification API.
 *
 * `Notification.ProgressStyle` merges every segment into one when given more than
 * [MAX_SEGMENTS] and renders only the first [MAX_POINTS] points, dropping points at the very
 * start or end (AOSP android16-qpr2 `Notification.ProgressStyle`). This layout stays inside
 * those limits explicitly so what the user sees is decided here, not by silent truncation.
 */
data class ProgressLayout(
  val max: Int,
  val progress: Int,
  /** Segment lengths, in the same units as [max]. Gaps between segments read as stops. */
  val segments: List<Int>,
  val markers: List<StopMarker>,
) {
  companion object {
    const val UNITS_PER_STOP = 100
    const val MAX_SEGMENTS = 10
    const val MAX_POINTS = 4

    fun of(stops: StopProgress): ProgressLayout {
      val total = stops.totalStops
      val completed = stops.completedStops
      require(total >= 1) { "totalStops must be at least 1" }
      require(completed in 0..total) { "completedStops must be within 0..totalStops" }

      val max = total * UNITS_PER_STOP
      val segments = if (total <= MAX_SEGMENTS) List(total) { UNITS_PER_STOP } else listOf(max)

      // Interior stops still ahead of the vehicle. The destination itself is the bar's end.
      val upcoming = ((completed + 1) until total).toList()
      val alightAlertStop = total - 1
      val shown = if (upcoming.size <= MAX_POINTS) {
        upcoming
      } else {
        upcoming.take(MAX_POINTS - 1) + alightAlertStop
      }

      return ProgressLayout(
        max = max,
        progress = completed * UNITS_PER_STOP,
        segments = segments,
        markers = shown.map { stop ->
          StopMarker(position = stop * UNITS_PER_STOP, isAlightAlert = stop == alightAlertStop)
        },
      )
    }
  }
}

/**
 * A stop drawn on the progress bar. [isAlightAlert] marks the last stop before the
 * destination, where the rider is told to get off at the next stop.
 */
data class StopMarker(val position: Int, val isAlightAlert: Boolean)
