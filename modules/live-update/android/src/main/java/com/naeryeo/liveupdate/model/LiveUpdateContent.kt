package com.naeryeo.liveupdate.model

/**
 * Everything a live update renders, already validated.
 *
 * This is a presentation model: it carries display-ready text and stop counts, never transit
 * entities. It has no Android dependencies so it can be built by the JS bridge today and by a
 * native background tracker later, and rendered by the same notification factory.
 */
data class LiveUpdateContent(
  val title: String,
  val body: String,
  val subtitle: String?,
  val chipText: String?,
  val phase: LiveUpdatePhase,
  val progress: StopProgress,
  val etaEpochMillis: Long?,
)

enum class LiveUpdatePhase(val wireName: String) {
  TRACKING("tracking"),
  APPROACHING("approaching"),
  ARRIVED("arrived");

  companion object {
    fun fromWireName(name: String): LiveUpdatePhase? = entries.firstOrNull { it.wireName == name }
  }
}

/** Progress along a trip measured in stop-to-stop legs. */
data class StopProgress(val totalStops: Int, val completedStops: Int) {
  val remainingStops: Int
    get() = totalStops - completedStops
}

/** A validated request to show or refresh one live update. */
data class LiveUpdateRequest(
  val id: String,
  val content: LiveUpdateContent,
  /** Whether this post may make sound/vibration. Updates are silent unless the caller asks. */
  val alert: Boolean,
)
