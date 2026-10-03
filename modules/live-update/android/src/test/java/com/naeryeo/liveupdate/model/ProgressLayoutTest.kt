package com.naeryeo.liveupdate.model

import com.naeryeo.liveupdate.model.ProgressLayout.Companion.MAX_POINTS
import com.naeryeo.liveupdate.model.ProgressLayout.Companion.MAX_SEGMENTS
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressLayoutTest {
  @Test
  fun `draws one segment per stop for short trips`() {
    val layout = ProgressLayout.of(StopProgress(totalStops = 3, completedStops = 0))

    assertEquals(300, layout.max)
    assertEquals(0, layout.progress)
    assertEquals(listOf(100, 100, 100), layout.segments)
  }

  @Test
  fun `marks upcoming interior stops and flags the alight alert stop`() {
    val layout = ProgressLayout.of(StopProgress(totalStops = 3, completedStops = 0))

    assertEquals(
      listOf(StopMarker(100, isAlightAlert = false), StopMarker(200, isAlightAlert = true)),
      layout.markers,
    )
  }

  @Test
  fun `drops passed stops from the markers`() {
    val layout = ProgressLayout.of(StopProgress(totalStops = 3, completedStops = 1))

    assertEquals(100, layout.progress)
    assertEquals(listOf(StopMarker(200, isAlightAlert = true)), layout.markers)
  }

  @Test
  fun `shows no markers when only the destination is left or reached`() {
    assertTrue(ProgressLayout.of(StopProgress(totalStops = 3, completedStops = 2)).markers.isEmpty())
    assertTrue(ProgressLayout.of(StopProgress(totalStops = 3, completedStops = 3)).markers.isEmpty())
    assertTrue(ProgressLayout.of(StopProgress(totalStops = 1, completedStops = 0)).markers.isEmpty())
  }

  @Test
  fun `uses a single segment above the platform segment limit`() {
    val atLimit = ProgressLayout.of(StopProgress(totalStops = MAX_SEGMENTS, completedStops = 0))
    val aboveLimit = ProgressLayout.of(StopProgress(totalStops = MAX_SEGMENTS + 1, completedStops = 0))

    assertEquals(MAX_SEGMENTS, atLimit.segments.size)
    assertEquals(listOf(1_100), aboveLimit.segments)
  }

  @Test
  fun `keeps at most four markers and always includes the alight alert stop`() {
    val layout = ProgressLayout.of(StopProgress(totalStops = 12, completedStops = 2))

    assertEquals(MAX_POINTS, layout.markers.size)
    assertEquals(listOf(300, 400, 500, 1_100), layout.markers.map { it.position })
    assertEquals(listOf(false, false, false, true), layout.markers.map { it.isAlightAlert })
  }

  @Test
  fun `segment lengths always add up to max`() {
    for (total in 1..30) {
      val layout = ProgressLayout.of(StopProgress(totalStops = total, completedStops = 0))
      assertEquals(layout.max, layout.segments.sum())
      assertTrue(layout.markers.all { it.position in 1 until layout.max })
    }
  }

  @Test(expected = IllegalArgumentException::class)
  fun `rejects impossible progress`() {
    ProgressLayout.of(StopProgress(totalStops = 2, completedStops = 3))
  }
}
