package com.naeryeo.liveupdate.model

sealed interface ValidationResult<out T> {
  data class Valid<T>(val value: T) : ValidationResult<T>

  data class Invalid(val violations: List<String>) : ValidationResult<Nothing>
}

/**
 * Validates bridge input at the native trust boundary.
 *
 * The JS adapter validates too, but the native side must not trust its caller: an invalid
 * payload here would otherwise surface as a silently demoted or broken system notification.
 */
object LiveUpdateValidator {
  const val MAX_ID_LENGTH = 64
  const val MAX_TITLE_LENGTH = 120
  const val MAX_BODY_LENGTH = 240
  const val MAX_SUBTITLE_LENGTH = 60

  /** Hard cap. The status chip only shows text fully below 7 characters; longer text is clipped. */
  const val MAX_CHIP_TEXT_LENGTH = 16
  const val MAX_STOPS = 300

  private val ID_PATTERN = Regex("^[A-Za-z0-9._:-]+$")

  fun validateId(id: String): ValidationResult<String> {
    val violations = idViolations(id)
    return if (violations.isEmpty()) ValidationResult.Valid(id) else ValidationResult.Invalid(violations)
  }

  fun validate(input: LiveUpdateInput): ValidationResult<LiveUpdateRequest> {
    val violations = mutableListOf<String>()
    violations += idViolations(input.id)

    if (input.title.isBlank()) violations += "title must not be blank (Live Updates require a content title)"
    if (input.title.length > MAX_TITLE_LENGTH) violations += "title must be at most $MAX_TITLE_LENGTH characters"
    if (input.body.length > MAX_BODY_LENGTH) violations += "body must be at most $MAX_BODY_LENGTH characters"
    input.subtitle?.let {
      if (it.isBlank()) violations += "subtitle must be omitted instead of blank"
      if (it.length > MAX_SUBTITLE_LENGTH) violations += "subtitle must be at most $MAX_SUBTITLE_LENGTH characters"
    }
    input.chipText?.let {
      if (it.isBlank()) violations += "chipText must be omitted instead of blank"
      if (it.length > MAX_CHIP_TEXT_LENGTH) violations += "chipText must be at most $MAX_CHIP_TEXT_LENGTH characters"
    }

    val phase = LiveUpdatePhase.fromWireName(input.phase)
    if (phase == null) {
      violations += "phase must be one of ${LiveUpdatePhase.entries.joinToString { it.wireName }}"
    }

    if (input.totalStops !in 1..MAX_STOPS) violations += "totalStops must be within 1..$MAX_STOPS"
    if (input.completedStops < 0 || input.completedStops > input.totalStops) {
      violations += "completedStops must be within 0..totalStops"
    }
    if (phase == LiveUpdatePhase.ARRIVED && input.completedStops != input.totalStops) {
      violations += "phase 'arrived' requires completedStops == totalStops"
    }
    if (phase == LiveUpdatePhase.TRACKING && input.completedStops == input.totalStops) {
      violations += "tracking requires at least one remaining stop"
    }
    if (phase == LiveUpdatePhase.APPROACHING && input.totalStops - input.completedStops != 1) {
      violations += "approaching requires exactly one remaining stop"
    }

    val eta = input.etaEpochMillis
    if (eta != null && (!eta.isFinite() || eta <= 0.0 || eta > 8_640_000_000_000_000.0 || eta % 1.0 != 0.0)) {
      violations += "etaEpochMs must be a positive epoch timestamp in milliseconds"
    }

    if (violations.isNotEmpty() || phase == null) return ValidationResult.Invalid(violations)

    return ValidationResult.Valid(
      LiveUpdateRequest(
        id = input.id,
        content = LiveUpdateContent(
          title = input.title,
          body = input.body,
          subtitle = input.subtitle,
          chipText = input.chipText,
          phase = phase,
          progress = StopProgress(totalStops = input.totalStops, completedStops = input.completedStops),
          etaEpochMillis = eta?.toLong(),
        ),
        alert = input.alert,
      ),
    )
  }

  private fun idViolations(id: String): List<String> = buildList {
    if (id.isEmpty() || id.length > MAX_ID_LENGTH) add("id must be 1..$MAX_ID_LENGTH characters")
    if (id.isNotEmpty() && !ID_PATTERN.matches(id)) add("id may only contain letters, digits, '.', '_', ':' and '-'")
  }
}
