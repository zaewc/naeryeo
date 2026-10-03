package com.naeryeo.liveupdate.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveUpdateTransitionsTest {
  private val content = LiveUpdateContent("강남역", "다음 역", null, null,
    LiveUpdatePhase.TRACKING, StopProgress(3, 0), null)

  @Test fun `normal progress and approaching are allowed`() {
    assertTrue(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.TRACKING, StopProgress(3, 0),
      content.copy(progress = StopProgress(3, 1))))
    assertTrue(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.TRACKING, StopProgress(3, 1),
      content.copy(phase = LiveUpdatePhase.APPROACHING, progress = StopProgress(3, 2))))
    assertTrue(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.APPROACHING, StopProgress(3, 2),
      content.copy(phase = LiveUpdatePhase.ARRIVED, progress = StopProgress(3, 3))))
  }

  @Test fun `skipped and backwards phases are rejected`() {
    assertFalse(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.TRACKING, StopProgress(3, 0),
      content.copy(phase = LiveUpdatePhase.ARRIVED, progress = StopProgress(3, 3))))
    assertFalse(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.ARRIVED, StopProgress(3, 3), content))
    assertFalse(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.APPROACHING, StopProgress(3, 2),
      content.copy(progress = StopProgress(3, 2))))
  }

  @Test fun `regression and destination changes require a new activity`() {
    assertFalse(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.TRACKING, StopProgress(3, 1), content))
    assertFalse(LiveUpdateTransitions.canUpdate(LiveUpdatePhase.TRACKING, StopProgress(3, 0),
      content.copy(progress = StopProgress(4, 1))))
  }
}
