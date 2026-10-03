package com.naeryeo.liveupdate.model

object LiveUpdateTransitions {
  fun canUpdate(previous: LiveUpdatePhase, stops: StopProgress, next: LiveUpdateContent): Boolean {
    if (next.progress.totalStops != stops.totalStops || next.progress.completedStops < stops.completedStops) return false
    return when (previous) {
      LiveUpdatePhase.TRACKING -> next.phase == LiveUpdatePhase.TRACKING || next.phase == LiveUpdatePhase.APPROACHING
      LiveUpdatePhase.APPROACHING -> next.phase == LiveUpdatePhase.APPROACHING || next.phase == LiveUpdatePhase.ARRIVED
      LiveUpdatePhase.ARRIVED -> next.phase == LiveUpdatePhase.ARRIVED
    }
  }
}
