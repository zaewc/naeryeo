package com.naeryeo.liveupdate

import com.naeryeo.liveupdate.model.LiveUpdateInput
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.records.Required

class LiveUpdateRecord : Record {
  @Field @Required var id: String = ""
  @Field @Required var title: String = ""
  @Field @Required var body: String = ""
  @Field var subtitle: String? = null
  @Field var chipText: String? = null
  @Field @Required var phase: String = ""
  // Double preserves fractional/NaN bridge values so they can be rejected before conversion.
  @Field @Required var totalStops: Double = 0.0
  @Field @Required var completedStops: Double = 0.0
  @Field var etaEpochMillis: Double? = null
  @Field var alert: Boolean = false

  fun toInput(): LiveUpdateInput {
    if (!totalStops.isFinite() || totalStops % 1.0 != 0.0 || totalStops !in 1.0..300.0 ||
      !completedStops.isFinite() || completedStops % 1.0 != 0.0 || completedStops !in 0.0..totalStops) {
      throw CodedException("ERR_INVALID_PAYLOAD", "Stop counts must be bounded integers", null)
    }
    return LiveUpdateInput(id, title, body, subtitle, chipText, phase,
      totalStops.toInt(), completedStops.toInt(), etaEpochMillis, alert)
  }
}
