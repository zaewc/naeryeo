package com.naeryeo.liveupdate.model

/**
 * Untrusted values exactly as they crossed the JS bridge.
 *
 * Kept separate from [LiveUpdateContent] so that nothing downstream of [LiveUpdateValidator]
 * can observe an unvalidated value.
 */
data class LiveUpdateInput(
  val id: String,
  val title: String,
  val body: String,
  val subtitle: String?,
  val chipText: String?,
  val phase: String,
  val totalStops: Int,
  val completedStops: Int,
  val etaEpochMillis: Double?,
  val alert: Boolean,
)
