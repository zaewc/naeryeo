import { useMemo } from 'react';

import { GwangjuPlanner } from '@/features/trip-planner';
import { createTransitApi } from '@/entities/trip';
import { createLiveActivityAdapter } from '@/shared/platform/live-activity';

export default function HomeScreen() {
  const port = useMemo(() => createLiveActivityAdapter(), []);
  const data = useMemo(() => createTransitApi(process.env.EXPO_PUBLIC_TRANSIT_API_URL ?? (__DEV__ ? 'http://127.0.0.1:8084' : '')), []);
  return <GwangjuPlanner port={port} data={data} />;
}
