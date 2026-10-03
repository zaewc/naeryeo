package com.naeryeo.liveupdate.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveUpdateValidatorTest {
  private val valid = LiveUpdateInput(
    id = "trip-1",
    title = "강남역까지 3정거장",
    body = "다음 역 · 선릉",
    subtitle = "2호선",
    chipText = "3정거장",
    phase = "tracking",
    totalStops = 3,
    completedStops = 0,
    etaEpochMillis = 1_790_000_000_000.0,
    alert = false,
  )

  private fun violationsOf(input: LiveUpdateInput): List<String> =
    when (val result = LiveUpdateValidator.validate(input)) {
      is ValidationResult.Invalid -> result.violations
      is ValidationResult.Valid -> emptyList()
    }

  @Test
  fun `maps a valid input to a request`() {
    val result = LiveUpdateValidator.validate(valid)

    assertTrue(result is ValidationResult.Valid)
    val request = (result as ValidationResult.Valid).value
    assertEquals("trip-1", request.id)
    assertEquals(LiveUpdatePhase.TRACKING, request.content.phase)
    assertEquals(StopProgress(totalStops = 3, completedStops = 0), request.content.progress)
    assertEquals(3, request.content.progress.remainingStops)
    assertEquals(1_790_000_000_000L, request.content.etaEpochMillis)
  }

  @Test
  fun `accepts optional fields when omitted`() {
    val result = LiveUpdateValidator.validate(
      valid.copy(subtitle = null, chipText = null, etaEpochMillis = null, body = ""),
    )

    assertTrue(result is ValidationResult.Valid)
  }

  @Test
  fun `rejects a blank title because Live Updates require one`() {
    assertTrue(violationsOf(valid.copy(title = "  ")).any { it.startsWith("title") })
  }

  @Test
  fun `rejects ids that are empty, too long or contain unsafe characters`() {
    assertTrue(violationsOf(valid.copy(id = "")).isNotEmpty())
    assertTrue(violationsOf(valid.copy(id = "a".repeat(65))).isNotEmpty())
    assertTrue(violationsOf(valid.copy(id = "trip 1/../x")).isNotEmpty())
    assertTrue(LiveUpdateValidator.validateId("trip:2026-10-03_1").let { it is ValidationResult.Valid })
  }

  @Test
  fun `rejects unknown phases`() {
    assertTrue(violationsOf(valid.copy(phase = "flying")).any { it.startsWith("phase") })
  }

  @Test
  fun `rejects inconsistent stop counts`() {
    assertTrue(violationsOf(valid.copy(totalStops = 0)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(completedStops = -1)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(completedStops = 4)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(totalStops = LiveUpdateValidator.MAX_STOPS + 1)).isNotEmpty())
  }

  @Test
  fun `requires all stops completed when arrived`() {
    assertTrue(violationsOf(valid.copy(phase = "arrived", completedStops = 2)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(phase = "arrived", completedStops = 3)).isEmpty())
  }

  @Test
  fun `rejects blank or oversized optional text`() {
    assertTrue(violationsOf(valid.copy(chipText = "")).isNotEmpty())
    assertTrue(violationsOf(valid.copy(chipText = "x".repeat(17))).isNotEmpty())
    assertTrue(violationsOf(valid.copy(subtitle = " ")).isNotEmpty())
  }

  @Test
  fun `rejects non-finite or non-positive eta`() {
    assertTrue(violationsOf(valid.copy(etaEpochMillis = Double.NaN)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(etaEpochMillis = Double.POSITIVE_INFINITY)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(etaEpochMillis = 0.0)).isNotEmpty())
  }

  @Test
  fun `reports every violation at once`() {
    val violations = violationsOf(valid.copy(id = "", title = "", phase = "x", totalStops = 0))

    assertTrue(violations.size >= 4)
  }

  @Test fun `rejects phases inconsistent with remaining stops`() {
    assertTrue(violationsOf(valid.copy(phase = "approaching", completedStops = 0)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(phase = "approaching", completedStops = 2)).isEmpty())
    assertTrue(violationsOf(valid.copy(completedStops = 3)).isNotEmpty())
  }

  @Test fun `rejects fractional and out of JS date range eta`() {
    assertTrue(violationsOf(valid.copy(etaEpochMillis = 1.5)).isNotEmpty())
    assertTrue(violationsOf(valid.copy(etaEpochMillis = Long.MAX_VALUE.toDouble())).isNotEmpty())
  }
}
