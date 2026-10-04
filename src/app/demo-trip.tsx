import { useMemo } from 'react';

import { TripPlanner } from '@/features/trip-planner';
import { createLiveActivityAdapter } from '@/shared/platform/live-activity';

export default function HomeScreen() {
  const port = useMemo(() => createLiveActivityAdapter(), []);
  return <TripPlanner port={port} />;
}
